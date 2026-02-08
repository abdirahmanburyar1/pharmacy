import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { withAuth, apiResponse } from '@/lib/api';

export async function GET(req: NextRequest) {
  return withAuth(req, ['view_reports'], async (req) => {
    const { searchParams } = new URL(req.url);
    const date = searchParams.get('date') ? new Date(searchParams.get('date')!) : new Date();
    const start = new Date(date);
    start.setHours(0, 0, 0, 0);
    const end = new Date(date);
    end.setHours(23, 59, 59, 999);

    const sales = await prisma.sale.findMany({
      where: { createdAt: { gte: start, lte: end } },
      include: { items: { include: { product: true } }, payments: true },
    });

    const totalSales = sales.reduce((s, sale) => s + Number(sale.finalAmount), 0);
    const totalDiscount = sales.reduce((s, sale) => s + Number(sale.discount), 0);
    const itemCount = sales.reduce((s, sale) => s + sale.items.reduce((si, i) => si + i.quantity, 0), 0);

    return apiResponse({
      date: date.toISOString().slice(0, 10),
      totalSales,
      totalDiscount,
      transactionCount: sales.length,
      itemCount,
      sales,
    });
  });
}
