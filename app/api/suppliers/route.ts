import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { withAuth, apiResponse } from '@/lib/api';

export async function GET(req: NextRequest) {
  return withAuth(req, ['create_purchase', 'view_purchases'], async () => {
    const suppliers = await prisma.supplier.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
    });
    return apiResponse(suppliers);
  });
}

export async function POST(req: NextRequest) {
  return withAuth(req, ['create_purchase'], async (req) => {
    const body = await req.json();
    const supplier = await prisma.supplier.create({
      data: {
        name: body.name,
        contact: body.contact,
        email: body.email,
        phone: body.phone,
        address: body.address,
      },
    });
    return apiResponse(supplier, 201);
  });
}
