import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { WorkflowStatus } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { StockMovementType } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

@Injectable()
export class PurchasesService {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
  ) {}

  private async nextOrderNumber(): Promise<string> {
    const last = await this.prisma.purchase.findFirst({
      orderBy: { createdAt: 'desc' },
    });
    const num = last ? parseInt(last.orderNumber.replace('PO-', ''), 10) + 1 : 1;
    return `PO-${String(num).padStart(6, '0')}`;
  }

  async create(
    userId: string,
    data: {
      supplierId: string;
      items: { productId: string; batchNumber: string; expiryDate: string; quantity: number; unitPrice: number }[];
      notes?: string;
    },
  ) {
    if (!data.items?.length) throw new BadRequestException('At least one item required');

    const orderNumber = await this.nextOrderNumber();
    let totalAmount = 0;

    const items = data.items.map((item) => {
      const total = item.quantity * item.unitPrice;
      totalAmount += total;
      return {
        productId: item.productId,
        batchNumber: item.batchNumber,
        expiryDate: new Date(item.expiryDate),
        quantity: item.quantity,
        unitPrice: new Decimal(item.unitPrice),
        totalPrice: new Decimal(total),
      };
    });

    const purchase = await this.prisma.purchase.create({
      data: {
        orderNumber,
        supplierId: data.supplierId,
        totalAmount: new Decimal(totalAmount),
        notes: data.notes,
        createdById: userId,
        status: WorkflowStatus.DRAFT,
        items: { create: items },
        statusHistory: {
          create: { status: WorkflowStatus.DRAFT },
        },
      },
      include: { items: { include: { product: true } }, supplier: true },
    });

    await this.audit.log(userId, 'purchase.create', 'Purchase', purchase.id, { newValue: purchase });
    return purchase;
  }

  async submitForApproval(id: string, userId: string) {
    const purchase = await this.prisma.purchase.findUnique({
      where: { id },
      include: { items: true },
    });
    if (!purchase) throw new NotFoundException('Purchase not found');
    if (purchase.status !== WorkflowStatus.DRAFT) throw new BadRequestException('Can only submit draft purchases');

    await this.prisma.purchase.update({
      where: { id },
      data: {
        status: WorkflowStatus.PENDING_APPROVAL,
        statusHistory: {
          create: { status: WorkflowStatus.PENDING_APPROVAL, changedById: userId },
        },
      },
    });

    await this.audit.log(userId, 'purchase.submit', 'Purchase', id, {});
    return this.findById(id);
  }

  async approve(id: string, userId: string) {
    const purchase = await this.prisma.purchase.findUnique({
      where: { id },
      include: { items: true },
    });
    if (!purchase) throw new NotFoundException('Purchase not found');
    if (purchase.status !== WorkflowStatus.PENDING_APPROVAL) throw new BadRequestException('Purchase is not pending approval');

    await this.prisma.$transaction(async (tx) => {
      for (const item of purchase.items) {
        const existing = await tx.batch.findUnique({
          where: {
            productId_batchNumber: { productId: item.productId, batchNumber: item.batchNumber },
          },
        });

        if (existing) {
          await tx.batch.update({
            where: { id: existing.id },
            data: { quantity: { increment: item.quantity } },
          });
          await tx.stockMovement.create({
            data: {
              batchId: existing.id,
              type: StockMovementType.PURCHASE,
              quantity: item.quantity,
              referenceId: purchase.id,
              referenceType: 'Purchase',
              performedById: userId,
            },
          });
        } else {
          const batch = await tx.batch.create({
            data: {
              productId: item.productId,
              batchNumber: item.batchNumber,
              expiryDate: item.expiryDate,
              purchasePrice: item.unitPrice,
              quantity: item.quantity,
            },
          });
          await tx.stockMovement.create({
            data: {
              batchId: batch.id,
              type: StockMovementType.PURCHASE,
              quantity: item.quantity,
              referenceId: purchase.id,
              referenceType: 'Purchase',
              performedById: userId,
            },
          });
        }
      }

      await tx.purchase.update({
        where: { id },
        data: {
          status: WorkflowStatus.APPROVED,
          approvedById: userId,
          approvedAt: new Date(),
          statusHistory: {
            create: { status: WorkflowStatus.APPROVED, changedById: userId },
          },
        },
      });
    });

    await this.audit.log(userId, 'purchase.approve', 'Purchase', id, {});
    return this.findById(id);
  }

  async reject(id: string, userId: string, reason?: string) {
    const purchase = await this.prisma.purchase.findUnique({ where: { id } });
    if (!purchase) throw new NotFoundException('Purchase not found');
    if (purchase.status !== WorkflowStatus.PENDING_APPROVAL) throw new BadRequestException('Purchase is not pending approval');

    await this.prisma.purchase.update({
      where: { id },
      data: {
        status: WorkflowStatus.REJECTED,
        rejectedAt: new Date(),
        rejectionReason: reason,
        statusHistory: {
          create: { status: WorkflowStatus.REJECTED, changedById: userId, reason },
        },
      },
    });

    await this.audit.log(userId, 'purchase.reject', 'Purchase', id, { reason });
    return this.findById(id);
  }

  async findAll(params?: { status?: WorkflowStatus }) {
    const where: any = {};
    if (params?.status) where.status = params.status;

    return this.prisma.purchase.findMany({
      where,
      include: {
        supplier: true,
        items: { include: { product: true } },
        createdBy: { select: { id: true, name: true, email: true } },
        approvedBy: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findById(id: string) {
    const p = await this.prisma.purchase.findUnique({
      where: { id },
      include: {
        supplier: true,
        items: { include: { product: true } },
        createdBy: { select: { id: true, name: true, email: true } },
        approvedBy: { select: { id: true, name: true } },
        statusHistory: true,
      },
    });
    if (!p) throw new NotFoundException('Purchase not found');
    return p;
  }
}
