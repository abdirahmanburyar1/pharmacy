import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { WorkflowStatus } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { StockMovementType } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

@Injectable()
export class DisposalsService {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
  ) {}

  private async nextReferenceNo(): Promise<string> {
    const last = await this.prisma.disposal.findFirst({
      orderBy: { createdAt: 'desc' },
    });
    const num = last ? parseInt(last.referenceNo.replace('DSP-', ''), 10) + 1 : 1;
    return `DSP-${String(num).padStart(6, '0')}`;
  }

  async create(
    userId: string,
    data: {
      reason: string;
      items: { batchId: string; quantity: number; reason?: string }[];
      notes?: string;
    },
  ) {
    if (!data.items?.length) throw new BadRequestException('At least one item required');

    const refNo = await this.nextReferenceNo();
    let totalValue = 0;

    const items = await Promise.all(
      data.items.map(async (item) => {
        const batch = await this.prisma.batch.findUnique({
          where: { id: item.batchId },
          include: { product: true },
        });
        if (!batch) throw new BadRequestException(`Batch ${item.batchId} not found`);
        if (batch.quantity < item.quantity) throw new BadRequestException(`Insufficient quantity in batch ${batch.batchNumber}`);

        const unitValue = Number(batch.purchasePrice);
        const itemTotal = item.quantity * unitValue;
        totalValue += itemTotal;
        return {
          batchId: item.batchId,
          productId: batch.productId,
          quantity: item.quantity,
          unitValue: new Decimal(unitValue),
          totalValue: new Decimal(itemTotal),
          reason: item.reason || data.reason,
        };
      }),
    );

    const disposal = await this.prisma.disposal.create({
      data: {
        referenceNo: refNo,
        reason: data.reason,
        totalValue: new Decimal(totalValue),
        notes: data.notes,
        createdById: userId,
        status: WorkflowStatus.DRAFT,
        items: { create: items },
        statusHistory: { create: { status: WorkflowStatus.DRAFT } },
      },
      include: { items: { include: { product: true, batch: true } } },
    });

    await this.audit.log(userId, 'disposal.create', 'Disposal', disposal.id, { newValue: disposal });
    return disposal;
  }

  async submitForApproval(id: string, userId: string) {
    const d = await this.prisma.disposal.findUnique({ where: { id } });
    if (!d) throw new NotFoundException('Disposal not found');
    if (d.status !== WorkflowStatus.DRAFT) throw new BadRequestException('Can only submit draft disposals');

    await this.prisma.disposal.update({
      where: { id },
      data: {
        status: WorkflowStatus.PENDING_APPROVAL,
        statusHistory: { create: { status: WorkflowStatus.PENDING_APPROVAL, changedById: userId } },
      },
    });

    await this.audit.log(userId, 'disposal.submit', 'Disposal', id, {});
    return this.findById(id);
  }

  async approve(id: string, userId: string) {
    const disposal = await this.prisma.disposal.findUnique({
      where: { id },
      include: { items: true },
    });
    if (!disposal) throw new NotFoundException('Disposal not found');
    if (disposal.status !== WorkflowStatus.PENDING_APPROVAL) throw new BadRequestException('Disposal is not pending approval');

    await this.prisma.$transaction(async (tx) => {
      for (const item of disposal.items) {
        await tx.batch.update({
          where: { id: item.batchId },
          data: { quantity: { decrement: item.quantity } },
        });
        await tx.stockMovement.create({
          data: {
            batchId: item.batchId,
            type: StockMovementType.DISPOSAL,
            quantity: -item.quantity,
            referenceId: disposal.id,
            referenceType: 'Disposal',
            performedById: userId,
          },
        });
      }
      await tx.disposal.update({
        where: { id },
        data: {
          status: WorkflowStatus.APPROVED,
          approvedById: userId,
          approvedAt: new Date(),
          statusHistory: { create: { status: WorkflowStatus.APPROVED, changedById: userId } },
        },
      });
    });

    await this.audit.log(userId, 'disposal.approve', 'Disposal', id, {});
    return this.findById(id);
  }

  async reject(id: string, userId: string, reason?: string) {
    const d = await this.prisma.disposal.findUnique({ where: { id } });
    if (!d) throw new NotFoundException('Disposal not found');
    if (d.status !== WorkflowStatus.PENDING_APPROVAL) throw new BadRequestException('Disposal is not pending approval');

    await this.prisma.disposal.update({
      where: { id },
      data: {
        status: WorkflowStatus.REJECTED,
        rejectedAt: new Date(),
        rejectionReason: reason,
        statusHistory: { create: { status: WorkflowStatus.REJECTED, changedById: userId, reason } },
      },
    });

    await this.audit.log(userId, 'disposal.reject', 'Disposal', id, { reason });
    return this.findById(id);
  }

  async findAll(params?: { status?: WorkflowStatus }) {
    const where: any = {};
    if (params?.status) where.status = params.status;

    return this.prisma.disposal.findMany({
      where,
      include: {
        items: { include: { product: true } },
        createdBy: { select: { id: true, name: true } },
        approvedBy: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findById(id: string) {
    const d = await this.prisma.disposal.findUnique({
      where: { id },
      include: {
        items: { include: { product: true, batch: true } },
        createdBy: { select: { id: true, name: true, email: true } },
        approvedBy: { select: { id: true, name: true } },
        statusHistory: true,
      },
    });
    if (!d) throw new NotFoundException('Disposal not found');
    return d;
  }
}
