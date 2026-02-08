import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { withAuth, apiResponse } from '@/lib/api';

export async function GET(req: NextRequest) {
  return withAuth(req, ['view_reports'], async () => {
    const batches = await prisma.batch.findMany({
      where: { quantity: { gt: 0 } },
      include: { product: true },
    });

    const totalValue = batches.reduce((s, b) => s + b.quantity * Number(b.purchasePrice), 0);
    const byProduct = batches.reduce((acc: Record<string, { product: object; quantity: number; value: number }>, b) => {
      const key = b.productId;
      if (!acc[key]) acc[key] = { product: b.product, quantity: 0, value: 0 };
      acc[key].quantity += b.quantity;
      acc[key].value += b.quantity * Number(b.purchasePrice);
      return acc;
    }, {});

    return apiResponse({
      totalValue,
      batchCount: batches.length,
      byProduct: Object.values(byProduct),
    });
  });
}
