import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { withAuth, apiResponse } from '@/lib/api';

export async function GET(req: NextRequest) {
  return withAuth(req, ['view_audit_logs'], async (req) => {
    const { searchParams } = new URL(req.url);
    const entityType = searchParams.get('entityType') || undefined;
    const entityId = searchParams.get('entityId') || undefined;
    const userId = searchParams.get('userId') || undefined;
    const limit = parseInt(searchParams.get('limit') || '100', 10);

    const where: Record<string, string> = {};
    if (entityType) where.entityType = entityType;
    if (entityId) where.entityId = entityId;
    if (userId) where.userId = userId;

    const logs = await prisma.auditLog.findMany({
      where,
      include: { user: { select: { id: true, name: true, email: true } } },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
    return apiResponse(logs);
  });
}
