import { prisma } from '@/lib/db';
import { AuditService } from './audit';
import { WorkflowStatus, StockMovementType } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

const audit = new AuditService();

async function nextOrderNumber() {
  const last = await prisma.purchase.findFirst({ orderBy: { createdAt: 'desc' } });
  const num = last ? parseInt(last.orderNumber.replace('PO-', ''), 10) + 1 : 1;
  return `PO-${String(num).padStart(6, '0')}`;
}

export async function createPurchase(
  userId: string,
  data: { supplierId: string; items: { productId: string; batchNumber: string; expiryDate: string; quantity: number; unitPrice: number }[]; notes?: string }
) {
  if (!data.items?.length) throw new Error('At least one item required');
  const orderNumber = await nextOrderNumber();
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

  const purchase = await prisma.purchase.create({
    data: {
      orderNumber,
      supplierId: data.supplierId,
      totalAmount: new Decimal(totalAmount),
      notes: data.notes,
      createdById: userId,
      status: WorkflowStatus.DRAFT,
      items: { create: items },
      statusHistory: { create: { status: WorkflowStatus.DRAFT } },
    },
    include: { items: { include: { product: true } }, supplier: true },
  });
  await audit.log(userId, 'purchase.create', 'Purchase', purchase.id, { newValue: purchase });
  return purchase;
}

export async function submitPurchase(id: string, userId: string) {
  const p = await prisma.purchase.findUnique({ where: { id } });
  if (!p || p.status !== WorkflowStatus.DRAFT) throw new Error('Invalid purchase');
  await prisma.purchase.update({
    where: { id },
    data: {
      status: WorkflowStatus.PENDING_APPROVAL,
      statusHistory: { create: { status: WorkflowStatus.PENDING_APPROVAL, changedById: userId } },
    },
  });
  await audit.log(userId, 'purchase.submit', 'Purchase', id, {});
  return findPurchaseById(id);
}

export async function approvePurchase(id: string, userId: string) {
  const purchase = await prisma.purchase.findUnique({ where: { id }, include: { items: true } });
  if (!purchase || purchase.status !== WorkflowStatus.PENDING_APPROVAL) throw new Error('Invalid purchase');

  await prisma.$transaction(async (tx) => {
    for (const item of purchase.items) {
      const existing = await tx.batch.findUnique({
        where: { productId_batchNumber: { productId: item.productId, batchNumber: item.batchNumber } },
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
        statusHistory: { create: { status: WorkflowStatus.APPROVED, changedById: userId } },
      },
    });
  });
  await audit.log(userId, 'purchase.approve', 'Purchase', id, {});
  return findPurchaseById(id);
}

export async function rejectPurchase(id: string, userId: string, reason?: string) {
  const p = await prisma.purchase.findUnique({ where: { id } });
  if (!p || p.status !== WorkflowStatus.PENDING_APPROVAL) throw new Error('Invalid purchase');
  await prisma.purchase.update({
    where: { id },
    data: {
      status: WorkflowStatus.REJECTED,
      rejectedAt: new Date(),
      rejectionReason: reason,
      statusHistory: { create: { status: WorkflowStatus.REJECTED, changedById: userId, reason } },
    },
  });
  await audit.log(userId, 'purchase.reject', 'Purchase', id, { newValue: { reason } });
  return findPurchaseById(id);
}

export async function findPurchases(status?: WorkflowStatus) {
  return prisma.purchase.findMany({
    where: status ? { status } : {},
    include: {
      supplier: true,
      items: { include: { product: true } },
      createdBy: { select: { id: true, name: true, email: true } },
      approvedBy: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: 'desc' },
  });
}

export async function findPurchaseById(id: string) {
  const p = await prisma.purchase.findUnique({
    where: { id },
    include: {
      supplier: true,
      items: { include: { product: true } },
      createdBy: { select: { id: true, name: true, email: true } },
      approvedBy: { select: { id: true, name: true } },
      statusHistory: true,
    },
  });
  if (!p) throw new Error('Purchase not found');
  return p;
}
