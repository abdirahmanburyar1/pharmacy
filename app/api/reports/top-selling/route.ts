import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { withAuth, apiResponse } from '@/lib/api';

export async function GET(req: NextRequest) {
  return withAuth(req, ['view_reports'], async (req) => {
    const { searchParams } = new URL(req.url);
    const from = searchParams.get('from') ? new Date(searchParams.get('from')!) : new Date(0);
    const to = searchParams.get('to') ? new Date(searchParams.get('to')!) : new Date();
    const limit = parseInt(searchParams.get('limit') || '20', 10);

    const items = await prisma.saleItem.groupBy({
      by: ['productId'],
      _sum: { quantity: true, totalPrice: true },
      where: { sale: { createdAt: { gte: from, lte: to } } },
    });

    const productIds = items.map((i) => i.productId);
    const products = await prisma.product.findMany({
      where: { id: { in: productIds } },
    });
    const productMap = Object.fromEntries(products.map((p) => [p.id, p]));

    const result = items
      .map((i) => ({
        product: productMap[i.productId],
        quantity: i._sum.quantity || 0,
        revenue: Number(i._sum.totalPrice || 0),
      }))
      .sort((a, b) => (b.quantity || 0) - (a.quantity || 0))
      .slice(0, limit);

    return apiResponse(result);
  });
}
