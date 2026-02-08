import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { withAuth, apiResponse } from '@/lib/api';

export async function GET(req: NextRequest) {
  return withAuth(req, ['view_reports'], async () => {
    const products = await prisma.product.findMany({
      where: { isActive: true, reorderLevel: { not: null } },
      include: { batches: { where: { quantity: { gt: 0 } } } },
    });

    const result = products
      .filter((p) => {
        const total = p.batches.reduce((s, b) => s + b.quantity, 0);
        return p.reorderLevel != null && total <= p.reorderLevel;
      })
      .map((p) => ({
        ...p,
        totalStock: p.batches.reduce((s, b) => s + b.quantity, 0),
      }));

    return apiResponse(result);
  });
}
