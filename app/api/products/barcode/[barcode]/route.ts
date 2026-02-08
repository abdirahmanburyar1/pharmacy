import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { withAuth, apiResponse } from '@/lib/api';

export async function GET(req: NextRequest, { params }: { params: { barcode: string } }) {
  return withAuth(req, ['manage_products', 'sell_medicine'], async () => {
    const product = await prisma.product.findUnique({
      where: { barcode: params.barcode, isActive: true },
      include: {
        batches: {
          where: { quantity: { gt: 0 } },
          orderBy: { expiryDate: 'asc' },
        },
      },
    });
    return apiResponse(product || null);
  });
}
