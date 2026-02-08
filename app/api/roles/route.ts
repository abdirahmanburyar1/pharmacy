import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { withAuth, apiResponse } from '@/lib/api';

export async function GET(req: NextRequest) {
  return withAuth(req, ['manage_roles'], async () => {
    const roles = await prisma.role.findMany({
      include: { rolePermissions: { include: { permission: true } } },
    });
    return apiResponse(roles);
  });
}

export async function POST(req: NextRequest) {
  return withAuth(req, ['manage_roles'], async (req) => {
    const body = await req.json();
    const role = await prisma.role.create({
      data: {
        name: body.name,
        description: body.description,
        rolePermissions: body.permissionIds?.length
          ? { create: body.permissionIds.map((pid: string) => ({ permissionId: pid })) }
          : undefined,
      },
      include: { rolePermissions: { include: { permission: true } } },
    });
    return apiResponse(role, 201);
  });
}
