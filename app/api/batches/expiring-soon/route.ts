import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { withAuth, apiResponse } from '@/lib/api';

export async function GET(req: NextRequest) {
  return withAuth(req, ['manage_products', 'view_reports'], async (req) => {
    const { searchParams } = new URL(req.url);
    const days = parseInt(searchParams.get('days') || '90', 10);
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() + days);

    const batches = await prisma.batch.findMany({
      where: {
        quantity: { gt: 0 },
        expiryDate: { gte: new Date(), lte: cutoff },
      },
      include: { product: true },
      orderBy: { expiryDate: 'asc' },
    });
    return apiResponse(batches);
  });
}
