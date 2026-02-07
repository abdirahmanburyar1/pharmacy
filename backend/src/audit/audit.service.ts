import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AuditService {
  constructor(private prisma: PrismaService) {}

  async log(
    userId: string,
    action: string,
    entityType: string,
    entityId: string,
    data?: { previousValue?: any; newValue?: any },
  ) {
    return this.prisma.auditLog.create({
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
