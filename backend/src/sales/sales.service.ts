import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { BatchesService } from '../batches/batches.service';
import { AuditService } from '../audit/audit.service';
import { StockMovementType } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

@Injectable()
export class SalesService {
  constructor(
    private prisma: PrismaService,
    private batchesService: BatchesService,
    private audit: AuditService,
  ) {}

  private async nextSaleNumber(): Promise<string> {
    const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const last = await this.prisma.sale.findFirst({
      where: { saleNumber: { startsWith: `S-${today}` } },
      orderBy: { createdAt: 'desc' },
    });
    const num = last ? parseInt(last.saleNumber.split('-')[2] || '0', 10) + 1 : 1;
    return `S-${today}-${String(num).padStart(4, '0')}`;
  }

  async create(
    cashierId: string,
    data: {
      items: { productId: string; quantity: number; unitPrice: number }[];
      payments: { method: string; amount: number; reference?: string }[];
      discount?: number;
    },
  ) {
    if (!data.items?.length) throw new BadRequestException('Cart is empty');

    const saleItems: { productId: string; batchId: string; quantity: number; unitPrice: Decimal; totalPrice: Decimal }[] = [];
    let totalAmount = 0;

    for (const item of data.items) {
      const batches = await this.batchesService.getFIFOBatches(item.productId, item.quantity);
      for (const b of batches) {
        const total = b.quantity * Number(b.unitPrice);
        totalAmount += b.quantity * item.unitPrice;
        saleItems.push({
          productId: item.productId,
          batchId: b.batchId,
          quantity: b.quantity,
          unitPrice: new Decimal(item.unitPrice),
          totalPrice: new Decimal(b.quantity * item.unitPrice),
        });
      }
    }

    const discount = data.discount || 0;
    const finalAmount = totalAmount - discount;

    const paymentTotal = data.payments?.reduce((s, p) => s + p.amount, 0) || 0;
    if (paymentTotal < finalAmount) throw new BadRequestException('Insufficient payment');

    const saleNumber = await this.nextSaleNumber();

    const sale = await this.prisma.$transaction(async (tx) => {
      const s = await tx.sale.create({
        data: {
          saleNumber,
          totalAmount: new Decimal(totalAmount),
          discount: new Decimal(discount),
          finalAmount: new Decimal(finalAmount),
          cashierId,
          items: {
            create: saleItems,
          },
          payments: {
            create: (data.payments || []).map((p) => ({
              method: p.method,
              amount: new Decimal(p.amount),
              reference: p.reference,
            })),
          },
        },
        include: { items: { include: { product: true, batch: true } }, payments: true },
      });

      for (const item of s.items) {
        await tx.batch.update({
          where: { id: item.batchId },
          data: { quantity: { decrement: item.quantity } },
        });
        await tx.stockMovement.create({
          data: {
            batchId: item.batchId,
            type: StockMovementType.SALE,
            quantity: -item.quantity,
            referenceId: s.id,
            referenceType: 'Sale',
            performedById: cashierId,
          },
        });
      }

      return s;
    });

    await this.audit.log(cashierId, 'sale.create', 'Sale', sale.id, { newValue: sale });
    return this.findById(sale.id);
  }

  async findAll(params?: { from?: Date; to?: Date }) {
    const where: any = {};
    if (params?.from || params?.to) {
      where.createdAt = {};
      if (params.from) where.createdAt.gte = params.from;
      if (params.to) where.createdAt.lte = params.to;
    }

    return this.prisma.sale.findMany({
      where,
      include: {
        cashier: { select: { id: true, name: true } },
        items: { include: { product: true } },
        payments: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findById(id: string) {
    const s = await this.prisma.sale.findUnique({
      where: { id },
      include: {
        cashier: { select: { id: true, name: true, email: true } },
        items: { include: { product: true, batch: true } },
        payments: true,
      },
    });
    if (!s) throw new NotFoundException('Sale not found');
    return s;
  }

  async findByNumber(saleNumber: string) {
    return this.prisma.sale.findUnique({
      where: { saleNumber },
      include: {
        cashier: true,
        items: { include: { product: true } },
        payments: true,
      },
    });
  }
}
