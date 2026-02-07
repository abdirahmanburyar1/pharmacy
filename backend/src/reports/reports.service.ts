import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class ReportsService {
  constructor(private prisma: PrismaService) {}

  async dailySalesReport(date: Date) {
    const start = new Date(date);
    start.setHours(0, 0, 0, 0);
    const end = new Date(date);
    end.setHours(23, 59, 59, 999);

    const sales = await this.prisma.sale.findMany({
      where: { createdAt: { gte: start, lte: end } },
      include: { items: { include: { product: true } }, payments: true },
    });

    const totalSales = sales.reduce((s, sale) => s + Number(sale.finalAmount), 0);
    const totalDiscount = sales.reduce((s, sale) => s + Number(sale.discount), 0);
    const itemCount = sales.reduce((s, sale) => s + sale.items.reduce((si, i) => si + i.quantity, 0), 0);

    return {
      date: date.toISOString().slice(0, 10),
      totalSales,
      totalDiscount,
      transactionCount: sales.length,
      itemCount,
      sales,
    };
  }

  async monthlySalesReport(year: number, month: number) {
    const start = new Date(year, month - 1, 1);
    const end = new Date(year, month, 0, 23, 59, 59, 999);

    const sales = await this.prisma.sale.findMany({
      where: { createdAt: { gte: start, lte: end } },
      include: { items: { include: { product: true } }, payments: true },
    });

    const totalSales = sales.reduce((s, sale) => s + Number(sale.finalAmount), 0);
    const totalCost = 0; // Would need to track cost per sale item

    return {
      year,
      month,
      totalSales,
      transactionCount: sales.length,
      sales,
    };
  }

  async profitReport(from: Date, to: Date) {
    const sales = await this.prisma.sale.findMany({
      where: { createdAt: { gte: from, lte: to } },
      include: { items: { include: { product: true, batch: true } } },
    });

    let revenue = 0;
    let cost = 0;
    for (const sale of sales) {
      for (const item of sale.items) {
        revenue += Number(item.totalPrice);
        cost += item.quantity * Number(item.batch.purchasePrice);
      }
    }

    return {
      from: from.toISOString().slice(0, 10),
      to: to.toISOString().slice(0, 10),
      revenue,
      cost,
      profit: revenue - cost,
      margin: revenue > 0 ? ((revenue - cost) / revenue) * 100 : 0,
    };
  }

  async inventoryValuation() {
    const batches = await this.prisma.batch.findMany({
      where: { quantity: { gt: 0 } },
      include: { product: true },
    });

    const totalValue = batches.reduce((s, b) => s + b.quantity * Number(b.purchasePrice), 0);
    const byProduct = batches.reduce((acc, b) => {
      const key = b.productId;
      if (!acc[key]) acc[key] = { product: b.product, quantity: 0, value: 0 };
      acc[key].quantity += b.quantity;
      acc[key].value += b.quantity * Number(b.purchasePrice);
      return acc;
    }, {} as Record<string, any>);

    return {
      totalValue,
      batchCount: batches.length,
      byProduct: Object.values(byProduct),
    };
  }

  async expiryReport(days: number = 90) {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() + days);
    return this.prisma.batch.findMany({
      where: {
        quantity: { gt: 0 },
        expiryDate: { gte: new Date(), lte: cutoff },
      },
      include: { product: true },
      orderBy: { expiryDate: 'asc' },
    });
  }

  async disposalReport(from?: Date, to?: Date) {
    const where: Prisma.DisposalWhereInput = { status: 'APPROVED' };
    if (from || to) {
      where.approvedAt = {};
      if (from) (where.approvedAt as any).gte = from;
      if (to) (where.approvedAt as any).lte = to;
    }

    return this.prisma.disposal.findMany({
      where,
      include: { items: { include: { product: true } }, approvedBy: true },
      orderBy: { approvedAt: 'desc' },
    });
  }

  async purchaseReport(from?: Date, to?: Date) {
    const where: Prisma.PurchaseWhereInput = { status: 'APPROVED' };
    if (from || to) {
      where.approvedAt = {};
      if (from) (where.approvedAt as any).gte = from;
      if (to) (where.approvedAt as any).lte = to;
    }

    return this.prisma.purchase.findMany({
      where,
      include: { supplier: true, items: { include: { product: true } } },
      orderBy: { approvedAt: 'desc' },
    });
  }

  async topSellingMedicines(from: Date, to: Date, limit: number = 20) {
    const items = await this.prisma.saleItem.groupBy({
      by: ['productId'],
      _sum: { quantity: true, totalPrice: true },
      where: {
        sale: { createdAt: { gte: from, lte: to } },
      },
    });

    const productIds = items.map((i) => i.productId);
    const products = await this.prisma.product.findMany({
      where: { id: { in: productIds } },
    });
    const productMap = Object.fromEntries(products.map((p) => [p.id, p]));

    return items
      .map((i) => ({
        product: productMap[i.productId],
        quantity: i._sum.quantity || 0,
        revenue: Number(i._sum.totalPrice || 0),
      }))
      .sort((a, b) => (b.quantity || 0) - (a.quantity || 0))
      .slice(0, limit);
  }

  async lowStockReport() {
    const products = await this.prisma.product.findMany({
      where: { isActive: true, reorderLevel: { not: null } },
      include: {
        batches: { where: { quantity: { gt: 0 } } },
      },
    });

    return products
      .filter((p) => {
        const total = p.batches.reduce((s, b) => s + b.quantity, 0);
        return p.reorderLevel != null && total <= p.reorderLevel;
      })
      .map((p) => ({
        ...p,
        totalStock: p.batches.reduce((s, b) => s + b.quantity, 0),
      }));
  }
}
