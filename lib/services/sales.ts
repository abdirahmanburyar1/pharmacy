import { prisma } from '@/lib/db';
import { AuditService } from './audit';
import { StockMovementType } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

const audit = new AuditService();

async function getFIFOBatches(productId: string, quantity: number) {
  const batches = await prisma.batch.findMany({
    where: { productId, quantity: { gt: 0 }, expiryDate: { gt: new Date() } },
    orderBy: { expiryDate: 'asc' },
  });
  const total = batches.reduce((s, b) => s + b.quantity, 0);
  if (total < quantity) throw new Error('Insufficient stock');
  const result: { batchId: string; quantity: number; unitPrice: Decimal }[] = [];
  let remaining = quantity;
  for (const batch of batches) {
    if (remaining <= 0) break;
    const take = Math.min(batch.quantity, remaining);
    result.push({ batchId: batch.id, quantity: take, unitPrice: batch.purchasePrice });
    remaining -= take;
  }
  return result;
}

async function nextSaleNumber() {
  const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const last = await prisma.sale.findFirst({
    where: { saleNumber: { startsWith: `S-${today}` } },
    orderBy: { createdAt: 'desc' },
  });
  const num = last ? parseInt(last.saleNumber.split('-')[2] || '0', 10) + 1 : 1;
  return `S-${today}-${String(num).padStart(4, '0')}`;
}

export async function createSale(
  cashierId: string,
  data: {
    items: { productId: string; quantity: number; unitPrice: number }[];
    payments: { method: string; amount: number; reference?: string }[];
    discount?: number;
  }
) {
  if (!data.items?.length) throw new Error('Cart is empty');

  const saleItems: { productId: string; batchId: string; quantity: number; unitPrice: Decimal; totalPrice: Decimal }[] = [];
  let totalAmount = 0;

  for (const item of data.items) {
    const batches = await getFIFOBatches(item.productId, item.quantity);
    for (const b of batches) {
      totalAmount += b.quantity * item.unitPrice;
      saleItems.push({
        productId: item.productId,
        batchId: b.batchId,
        quantity: b.quantity,
        unitPrice: new Decimal(item.unitPrice),
        totalPrice: new Decimal(b.quantity * item.unitPrice),
      });
    }
  }

  const discount = data.discount || 0;
  const finalAmount = totalAmount - discount;
  const paymentTotal = data.payments?.reduce((s, p) => s + p.amount, 0) || 0;
  if (paymentTotal < finalAmount) throw new Error('Insufficient payment');

  const saleNumber = await nextSaleNumber();

  const sale = await prisma.$transaction(async (tx) => {
    const s = await tx.sale.create({
      data: {
        saleNumber,
        totalAmount: new Decimal(totalAmount),
        discount: new Decimal(discount),
        finalAmount: new Decimal(finalAmount),
        cashierId,
        items: { create: saleItems },
        payments: {
          create: (data.payments || []).map((p) => ({
            method: p.method,
            amount: new Decimal(p.amount),
            reference: p.reference,
          })),
        },
      },
      include: { items: { include: { product: true, batch: true } }, payments: true },
    });
    for (const item of s.items) {
      await tx.batch.update({
        where: { id: item.batchId },
        data: { quantity: { decrement: item.quantity } },
      });
      await tx.stockMovement.create({
        data: {
          batchId: item.batchId,
          type: StockMovementType.SALE,
          quantity: -item.quantity,
          referenceId: s.id,
          referenceType: 'Sale',
          performedById: cashierId,
        },
      });
    }
    return s;
  });

  await audit.log(cashierId, 'sale.create', 'Sale', sale.id, { newValue: sale });
  return findSaleById(sale.id);
}

export async function findSales(from?: Date, to?: Date) {
  const where: { createdAt?: { gte?: Date; lte?: Date } } = {};
  if (from || to) {
    where.createdAt = {};
    if (from) where.createdAt.gte = from;
    if (to) where.createdAt.lte = to;
  }
  return prisma.sale.findMany({
    where,
    include: {
      cashier: { select: { id: true, name: true } },
      items: { include: { product: true } },
      payments: true,
    },
    orderBy: { createdAt: 'desc' },
  });
}

export async function findSaleById(id: string) {
  const s = await prisma.sale.findUnique({
    where: { id },
    include: {
      cashier: { select: { id: true, name: true, email: true } },
      items: { include: { product: true, batch: true } },
      payments: true,
    },
  });
  if (!s) throw new Error('Sale not found');
  return s;
}
