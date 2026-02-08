import { prisma } from '@/lib/db';
import { AuditService } from './audit';
import { WorkflowStatus, StockMovementType } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

const audit = new AuditService();

async function nextRefNo() {
  const last = await prisma.disposal.findFirst({ orderBy: { createdAt: 'desc' } });
  const num = last ? parseInt(last.referenceNo.replace('DSP-', ''), 10) + 1 : 1;
  return `DSP-${String(num).padStart(6, '0')}`;
}

export async function createDisposal(
  userId: string,
  data: { reason: string; items: { batchId: string; quantity: number; reason?: string }[]; notes?: string }
) {
  if (!data.items?.length) throw new Error('At least one item required');
  const refNo = await nextRefNo();
  let totalValue = 0;
  const items = await Promise.all(
    data.items.map(async (item) => {
      const batch = await prisma.batch.findUnique({ where: { id: item.batchId }, include: { product: true } });
      if (!batch) throw new Error(`Batch ${item.batchId} not found`);
      if (batch.quantity < item.quantity) throw new Error(`Insufficient quantity in batch ${batch.batchNumber}`);
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
    })
  );

  const disposal = await prisma.disposal.create({
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
  await audit.log(userId, 'disposal.create', 'Disposal', disposal.id, { newValue: disposal });
  return disposal;
}

export async function approveDisposal(id: string, userId: string) {
  const d = await prisma.disposal.findUnique({ where: { id }, include: { items: true } });
  if (!d || d.status !== WorkflowStatus.PENDING_APPROVAL) throw new Error('Invalid disposal');

  await prisma.$transaction(async (tx) => {
    for (const item of d.items) {
      await tx.batch.update({
        where: { id: item.batchId },
        data: { quantity: { decrement: item.quantity } },
      });
      await tx.stockMovement.create({
        data: {
          batchId: item.batchId,
          type: StockMovementType.DISPOSAL,
          quantity: -item.quantity,
          referenceId: d.id,
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
  await audit.log(userId, 'disposal.approve', 'Disposal', id, {});
  return findDisposalById(id);
}

export async function submitDisposal(id: string, userId: string) {
  const d = await prisma.disposal.findUnique({ where: { id } });
  if (!d || d.status !== WorkflowStatus.DRAFT) throw new Error('Invalid disposal');
  await prisma.disposal.update({
    where: { id },
    data: {
      status: WorkflowStatus.PENDING_APPROVAL,
      statusHistory: { create: { status: WorkflowStatus.PENDING_APPROVAL, changedById: userId } },
    },
  });
  await audit.log(userId, 'disposal.submit', 'Disposal', id, {});
  return findDisposalById(id);
}

export async function rejectDisposal(id: string, userId: string, reason?: string) {
  const d = await prisma.disposal.findUnique({ where: { id } });
  if (!d || d.status !== WorkflowStatus.PENDING_APPROVAL) throw new Error('Invalid disposal');
  await prisma.disposal.update({
    where: { id },
    data: {
      status: WorkflowStatus.REJECTED,
      rejectedAt: new Date(),
      rejectionReason: reason,
      statusHistory: { create: { status: WorkflowStatus.REJECTED, changedById: userId, reason } },
    },
  });
  await audit.log(userId, 'disposal.reject', 'Disposal', id, { newValue: { reason } });
  return findDisposalById(id);
}

export async function findDisposals(status?: WorkflowStatus) {
  return prisma.disposal.findMany({
    where: status ? { status } : {},
    include: {
      items: { include: { product: true } },
      createdBy: { select: { id: true, name: true } },
      approvedBy: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: 'desc' },
  });
}

export async function findDisposalById(id: string) {
  const d = await prisma.disposal.findUnique({
    where: { id },
    include: {
      items: { include: { product: true, batch: true } },
      createdBy: { select: { id: true, name: true, email: true } },
      approvedBy: { select: { id: true, name: true } },
      statusHistory: true,
    },
  });
  if (!d) throw new Error('Disposal not found');
  return d;
}
