import { prisma } from '@/lib/db';

export class AuditService {
  async log(userId: string, action: string, entityType: string, entityId: string, data?: { previousValue?: unknown; newValue?: unknown; [key: string]: unknown }) {
    return prisma.auditLog.create({
      data: {
        userId,
        action,
        entityType,
        entityId,
        previousValue: data?.previousValue ? JSON.parse(JSON.stringify(data.previousValue)) : undefined,
        newValue: data?.newValue ? JSON.parse(JSON.stringify(data.newValue)) : undefined,
      },
    });
  }
}
