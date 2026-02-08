import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import * as bcrypt from 'bcrypt';
import { withAuth, apiResponse, apiError } from '@/lib/api';

export async function GET(req: NextRequest) {
  return withAuth(req, ['manage_users'], async () => {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        isActive: true,
        createdAt: true,
        userRoles: { include: { role: true } },
      },
    });
    return apiResponse(users);
  });
}

export async function POST(req: NextRequest) {
  return withAuth(req, ['manage_users'], async (req) => {
    try {
      const body = await req.json();
      const passwordHash = await bcrypt.hash(body.password, 10);
      const user = await prisma.user.create({
        data: {
          email: body.email.toLowerCase(),
          passwordHash,
          name: body.name,
          userRoles: body.roleIds?.length
            ? { create: body.roleIds.map((roleId: string) => ({ roleId })) }
            : undefined,
        },
        select: {
          id: true,
          email: true,
          name: true,
          isActive: true,
          userRoles: { include: { role: true } },
        },
      });
      return apiResponse(user, 201);
    } catch (e) {
      return apiError((e as Error).message, 400);
    }
  });
}
