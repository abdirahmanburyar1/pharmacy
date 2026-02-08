import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { withAuth, apiResponse, apiError } from '@/lib/api';

export async function GET(req: NextRequest) {
  return withAuth(req, ['manage_products', 'sell_medicine'], async (req) => {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search') || '';
    const activeOnly = searchParams.get('activeOnly') !== 'false';

    const where: Record<string, unknown> = {};
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { genericName: { contains: search, mode: 'insensitive' } },
        { barcode: search },
        { sku: search },
      ];
    }
    if (activeOnly) where.isActive = true;

    const products = await prisma.product.findMany({
      where,
      include: {
        batches: {
          where: { quantity: { gt: 0 } },
          orderBy: { expiryDate: 'asc' },
        },
      },
      orderBy: { name: 'asc' },
    });
    return apiResponse(products);
  });
}

export async function POST(req: NextRequest) {
  return withAuth(req, ['manage_products'], async (req) => {
    const body = await req.json();
    const product = await prisma.product.create({
      data: {
        name: body.name,
        genericName: body.genericName,
        sku: body.sku,
        barcode: body.barcode,
        unit: body.unit || 'pcs',
        category: body.category,
        description: body.description,
        reorderLevel: body.reorderLevel,
        sellingPrice: body.sellingPrice,
      },
    });
    return apiResponse(product, 201);
  });
}
