import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { withAuth, apiResponse } from '@/lib/api';

export async function GET(req: NextRequest) {
  return withAuth(req, ['manage_roles'], async () => {
    const permissions = await prisma.permission.findMany({
      orderBy: [{ module: 'asc' }, { code: 'asc' }],
    });
    return apiResponse(permissions);
  });
}
