import { prisma } from '@/lib/db';
import { AuditService } from './audit';
import { WorkflowStatus, StockMovementType } from '@prisma/client';

const audit = new AuditService();

async function nextRefNo() {
  const last = await prisma.stockAdjustment.findFirst({ orderBy: { createdAt: 'desc' } });
  const num = last ? parseInt(last.referenceNo.replace('ADJ-', ''), 10) + 1 : 1;
  return `ADJ-${String(num).padStart(6, '0')}`;
}

export async function createAdjustment(
  userId: string,
  data: { reason: string; items: { batchId: string; quantityChange: number; reason?: string }[]; notes?: string }
) {
  if (!data.items?.length) throw new Error('At least one item required');
  const itemsWithProduct = await Promise.all(
    data.items.map(async (item) => {
      const batch = await prisma.batch.findUnique({ where: { id: item.batchId } });
      if (!batch) throw new Error(`Batch ${item.batchId} not found`);
      if (item.quantityChange < 0 && batch.quantity + item.quantityChange < 0) {
        throw new Error(`Insufficient stock in batch ${batch.batchNumber}`);
      }
      return { ...item, productId: batch.productId };
    })
  );

  const refNo = await nextRefNo();
  const adjustment = await prisma.stockAdjustment.create({
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
  await audit.log(userId, 'adjustment.create', 'StockAdjustment', adjustment.id, {});
  return adjustment;
}

export async function approveAdjustment(id: string, userId: string) {
  const a = await prisma.stockAdjustment.findUnique({ where: { id }, include: { items: true } });
  if (!a || a.status !== WorkflowStatus.PENDING_APPROVAL) throw new Error('Invalid adjustment');

  await prisma.$transaction(async (tx) => {
    for (const item of a.items) {
      const batch = await tx.batch.findUnique({ where: { id: item.batchId } });
      if (!batch) throw new Error(`Batch ${item.batchId} not found`);
      if (item.quantityChange < 0 && batch.quantity + item.quantityChange < 0) {
        throw new Error(`Insufficient stock in batch ${batch.batchNumber}`);
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
          referenceId: a.id,
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
  await audit.log(userId, 'adjustment.approve', 'StockAdjustment', id, {});
  return findAdjustmentById(id);
}

export async function submitAdjustment(id: string, userId: string) {
  const a = await prisma.stockAdjustment.findUnique({ where: { id } });
  if (!a || a.status !== WorkflowStatus.DRAFT) throw new Error('Invalid adjustment');
  await prisma.stockAdjustment.update({
    where: { id },
    data: {
      status: WorkflowStatus.PENDING_APPROVAL,
      statusHistory: { create: { status: WorkflowStatus.PENDING_APPROVAL, changedById: userId } },
    },
  });
  await audit.log(userId, 'adjustment.submit', 'StockAdjustment', id, {});
  return findAdjustmentById(id);
}

export async function rejectAdjustment(id: string, userId: string, reason?: string) {
  const a = await prisma.stockAdjustment.findUnique({ where: { id } });
  if (!a || a.status !== WorkflowStatus.PENDING_APPROVAL) throw new Error('Invalid adjustment');
  await prisma.stockAdjustment.update({
    where: { id },
    data: {
      status: WorkflowStatus.REJECTED,
      rejectedAt: new Date(),
      rejectionReason: reason,
      statusHistory: { create: { status: WorkflowStatus.REJECTED, changedById: userId, reason } },
    },
  });
  await audit.log(userId, 'adjustment.reject', 'StockAdjustment', id, { newValue: { reason } });
  return findAdjustmentById(id);
}

export async function findAdjustments(status?: WorkflowStatus) {
  return prisma.stockAdjustment.findMany({
    where: status ? { status } : {},
    include: {
      items: { include: { product: true, batch: true } },
      createdBy: { select: { id: true, name: true } },
      approvedBy: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: 'desc' },
  });
}

export async function findAdjustmentById(id: string) {
  const a = await prisma.stockAdjustment.findUnique({
    where: { id },
    include: {
      items: { include: { product: true, batch: true } },
      createdBy: { select: { id: true, name: true, email: true } },
      approvedBy: { select: { id: true, name: true } },
      statusHistory: true,
    },
  });
  if (!a) throw new Error('Adjustment not found');
  return a;
}
