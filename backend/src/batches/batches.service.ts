import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Decimal } from '@prisma/client/runtime/library';

@Injectable()
export class BatchesService {
  constructor(private prisma: PrismaService) {}

  async getFIFOBatches(productId: string, quantity: number) {
    const batches = await this.prisma.batch.findMany({
      where: {
        productId,
        quantity: { gt: 0 },
        expiryDate: { gt: new Date() },
      },
      orderBy: { expiryDate: 'asc' },
    });

    if (batches.reduce((s, b) => s + b.quantity, 0) < quantity) {
      throw new BadRequestException('Insufficient stock');
    }

    const result: { batchId: string; quantity: number; unitPrice: Decimal }[] = [];
    let remaining = quantity;

    for (const batch of batches) {
      if (remaining <= 0) break;
      const take = Math.min(batch.quantity, remaining);
      result.push({ batchId: batch.id, quantity: take, unitPrice: batch.purchasePrice });
      remaining -= take;
    }
    return result;
  }

  async getExpiringSoon(days: number = 90) {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() + days);
    return this.prisma.batch.findMany({
      where: {
        quantity: { gt: 0 },
        expiryDate: { gte: new Date(), lte: cutoff },
      },
      include: { product: true },
      orderBy: { expiryDate: 'asc' },
    });
  }

  async getExpired() {
    return this.prisma.batch.findMany({
      where: {
        quantity: { gt: 0 },
        expiryDate: { lt: new Date() },
      },
      include: { product: true },
    });
  }

  async findByProduct(productId: string) {
    return this.prisma.batch.findMany({
      where: { productId },
      orderBy: { expiryDate: 'asc' },
    });
  }
}
