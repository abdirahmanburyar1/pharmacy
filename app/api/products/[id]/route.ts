import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { withAuth, apiResponse, apiError } from '@/lib/api';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  return withAuth(req, ['manage_products', 'sell_medicine'], async () => {
    const product = await prisma.product.findUnique({
      where: { id: params.id },
      include: { batches: { orderBy: { expiryDate: 'asc' } } },
    });
    if (!product) return apiError('Not found', 404);
    return apiResponse(product);
  });
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  return withAuth(req, ['manage_products'], async (req) => {
    const body = await req.json();
    const product = await prisma.product.update({
      where: { id: params.id },
      data: {
        name: body.name,
        genericName: body.genericName,
        sku: body.sku,
        barcode: body.barcode,
        unit: body.unit,
        category: body.category,
        description: body.description,
        isActive: body.isActive,
        reorderLevel: body.reorderLevel,
        sellingPrice: body.sellingPrice,
      },
    });
    return apiResponse(product);
  });
}
