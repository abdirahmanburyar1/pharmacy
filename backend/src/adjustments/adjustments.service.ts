import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { WorkflowStatus } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { StockMovementType } from '@prisma/client';

@Injectable()
export class AdjustmentsService {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
  ) {}

  private async nextReferenceNo(): Promise<string> {
    const last = await this.prisma.stockAdjustment.findFirst({
      orderBy: { createdAt: 'desc' },
    });
    const num = last ? parseInt(last.referenceNo.replace('ADJ-', ''), 10) + 1 : 1;
    return `ADJ-${String(num).padStart(6, '0')}`;
  }

  async create(
    userId: string,
    data: {
      reason: string;
      items: { batchId: string; quantityChange: number; reason?: string }[];
      notes?: string;
    },
  ) {
    if (!data.items?.length) throw new BadRequestException('At least one item required');

    const itemsWithProduct = await Promise.all(
      data.items.map(async (item) => {
        const batch = await this.prisma.batch.findUnique({
          where: { id: item.batchId },
        });
        if (!batch) throw new BadRequestException(`Batch ${item.batchId} not found`);
        if (item.quantityChange < 0 && batch.quantity + item.quantityChange < 0) {
          throw new BadRequestException(`Insufficient stock in batch ${batch.batchNumber}`);
        }
        return { ...item, productId: batch.productId };
      }),
    );

    const refNo = await this.nextReferenceNo();
    const adjustment = await this.prisma.stockAdjustment.create({
      data: {
        referenceNo: refNo,
        reason: data.reason,
        notes: data.notes,
        createdById: userId,
        status: WorkflowStatus.DRAFT,
        items: {
          create: itemsWithProduct.map((i) => ({
            batchId: i.batchId,
            productId: i.productId,
            quantityChange: i.quantityChange,
            reason: i.reason,
          })),
        },
        statusHistory: { create: { status: WorkflowStatus.DRAFT } },
      },
      include: { items: { include: { product: true, batch: true } } },
    });

    await this.audit.log(userId, 'adjustment.create', 'StockAdjustment', adjustment.id, {});
    return adjustment;
  }

  async submitForApproval(id: string, userId: string) {
    const a = await this.prisma.stockAdjustment.findUnique({ where: { id } });
    if (!a) throw new NotFoundException('Adjustment not found');
    if (a.status !== WorkflowStatus.DRAFT) throw new BadRequestException('Can only submit draft adjustments');

    await this.prisma.stockAdjustment.update({
      where: { id },
      data: {
        status: WorkflowStatus.PENDING_APPROVAL,
        statusHistory: { create: { status: WorkflowStatus.PENDING_APPROVAL, changedById: userId } },
      },
    });

    await this.audit.log(userId, 'adjustment.submit', 'StockAdjustment', id, {});
    return this.findById(id);
  }

  async approve(id: string, userId: string) {
    const adjustment = await this.prisma.stockAdjustment.findUnique({
      where: { id },
      include: { items: true },
    });
    if (!adjustment) throw new NotFoundException('Adjustment not found');
    if (adjustment.status !== WorkflowStatus.PENDING_APPROVAL) throw new BadRequestException('Adjustment is not pending approval');

    await this.prisma.$transaction(async (tx) => {
      for (const item of adjustment.items) {
        const batch = await tx.batch.findUnique({ where: { id: item.batchId } });
        if (!batch) throw new BadRequestException(`Batch ${item.batchId} not found`);
        if (item.quantityChange < 0 && batch.quantity + item.quantityChange < 0) {
          throw new BadRequestException(`Insufficient stock in batch ${batch.batchNumber}`);
        }

        await tx.batch.update({
          where: { id: item.batchId },
          data: { quantity: { increment: item.quantityChange } },
        });
        await tx.stockMovement.create({
          data: {
            batchId: item.batchId,
            type: StockMovementType.ADJUSTMENT,
            quantity: item.quantityChange,
            referenceId: adjustment.id,
            referenceType: 'StockAdjustment',
            performedById: userId,
          },
        });
      }
      await tx.stockAdjustment.update({
        where: { id },
        data: {
          status: WorkflowStatus.APPROVED,
          approvedById: userId,
          approvedAt: new Date(),
          statusHistory: { create: { status: WorkflowStatus.APPROVED, changedById: userId } },
        },
      });
    });

    await this.audit.log(userId, 'adjustment.approve', 'StockAdjustment', id, {});
    return this.findById(id);
  }

  async reject(id: string, userId: string, reason?: string) {
    const a = await this.prisma.stockAdjustment.findUnique({ where: { id } });
    if (!a) throw new NotFoundException('Adjustment not found');
    if (a.status !== WorkflowStatus.PENDING_APPROVAL) throw new BadRequestException('Adjustment is not pending approval');

    await this.prisma.stockAdjustment.update({
      where: { id },
      data: {
        status: WorkflowStatus.REJECTED,
        rejectedAt: new Date(),
        rejectionReason: reason,
        statusHistory: { create: { status: WorkflowStatus.REJECTED, changedById: userId, reason } },
      },
    });

    await this.audit.log(userId, 'adjustment.reject', 'StockAdjustment', id, { reason });
    return this.findById(id);
  }

  async findAll(params?: { status?: WorkflowStatus }) {
    const where: any = {};
    if (params?.status) where.status = params.status;

    return this.prisma.stockAdjustment.findMany({
      where,
      include: {
        items: { include: { product: true, batch: true } },
        createdBy: { select: { id: true, name: true } },
        approvedBy: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findById(id: string) {
    const a = await this.prisma.stockAdjustment.findUnique({
      where: { id },
      include: {
        items: { include: { product: true, batch: true } },
        createdBy: { select: { id: true, name: true, email: true } },
        approvedBy: { select: { id: true, name: true } },
        statusHistory: true,
      },
    });
    if (!a) throw new NotFoundException('Adjustment not found');
    return a;
  }
}
