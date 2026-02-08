import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { withAuth, apiResponse } from '@/lib/api';

export async function GET(req: NextRequest) {
  return withAuth(req, ['view_reports'], async (req) => {
    const { searchParams } = new URL(req.url);
    const from = searchParams.get('from') ? new Date(searchParams.get('from')!) : new Date(0);
    const to = searchParams.get('to') ? new Date(searchParams.get('to')!) : new Date();

    const sales = await prisma.sale.findMany({
      where: { createdAt: { gte: from, lte: to } },
      include: { items: { include: { batch: true } } },
    });

    let revenue = 0;
    let cost = 0;
    for (const sale of sales) {
      for (const item of sale.items) {
        revenue += Number(item.totalPrice);
        cost += item.quantity * Number(item.batch.purchasePrice);
      }
    }

    return apiResponse({
      from: from.toISOString().slice(0, 10),
      to: to.toISOString().slice(0, 10),
      revenue,
      cost,
      profit: revenue - cost,
      margin: revenue > 0 ? ((revenue - cost) / revenue) * 100 : 0,
    });
  });
}
