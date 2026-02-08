import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { withAuth, apiResponse } from '@/lib/api';

export async function GET(req: NextRequest) {
  return withAuth(req, ['manage_products', 'dispose_stock', 'view_reports'], async () => {
    const batches = await prisma.batch.findMany({
      where: { quantity: { gt: 0 }, expiryDate: { lt: new Date() } },
      include: { product: true },
    });
    return apiResponse(batches);
  });
}
