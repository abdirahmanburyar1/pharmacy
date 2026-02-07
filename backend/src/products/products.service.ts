import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class ProductsService {
  constructor(private prisma: PrismaService) {}

  async findAll(params?: { search?: string; activeOnly?: boolean }) {
    const where: Prisma.ProductWhereInput = {};
    if (params?.search) {
      where.OR = [
        { name: { contains: params.search, mode: 'insensitive' } },
        { genericName: { contains: params.search, mode: 'insensitive' } },
        { barcode: { equals: params.search } },
        { sku: { equals: params.search } },
      ];
    }
    if (params?.activeOnly !== false) where.isActive = true;

    return this.prisma.product.findMany({
      where,
      include: {
        batches: {
          where: { quantity: { gt: 0 } },
          orderBy: { expiryDate: 'asc' },
        },
      },
      orderBy: { name: 'asc' },
    });
  }

  async findById(id: string) {
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: {
        batches: { orderBy: { expiryDate: 'asc' } },
      },
    });
    if (!product) throw new NotFoundException('Product not found');
    return product;
  }

  async findByBarcode(barcode: string) {
    return this.prisma.product.findUnique({
      where: { barcode, isActive: true },
      include: {
        batches: {
          where: { quantity: { gt: 0 } },
          orderBy: { expiryDate: 'asc' },
        },
      },
    });
  }

  async getAvailableStock(productId: string) {
    const batches = await this.prisma.batch.findMany({
      where: {
        productId,
        quantity: { gt: 0 },
        expiryDate: { gt: new Date() },
      },
      orderBy: { expiryDate: 'asc' },
    });
    return batches.reduce((sum, b) => sum + b.quantity, 0);
  }

  async create(data: {
    name: string;
    genericName?: string;
    sku?: string;
    barcode?: string;
    unit?: string;
    category?: string;
    description?: string;
    reorderLevel?: number;
  }) {
    if (data.barcode) {
      const existing = await this.prisma.product.findUnique({
        where: { barcode: data.barcode },
      });
      if (existing) throw new ConflictException('Barcode already exists');
    }
    if (data.sku) {
      const existing = await this.prisma.product.findUnique({
        where: { sku: data.sku },
      });
      if (existing) throw new ConflictException('SKU already exists');
    }
    return this.prisma.product.create({ data });
  }

  async update(
    id: string,
    data: {
      name?: string;
      genericName?: string;
      sku?: string;
      barcode?: string;
      unit?: string;
      category?: string;
      description?: string;
      isActive?: boolean;
      reorderLevel?: number;
    },
  ) {
    if (data.barcode) {
      const existing = await this.prisma.product.findFirst({
        where: { barcode: data.barcode, NOT: { id } },
      });
      if (existing) throw new ConflictException('Barcode already exists');
    }
    if (data.sku) {
      const existing = await this.prisma.product.findFirst({
        where: { sku: data.sku, NOT: { id } },
      });
      if (existing) throw new ConflictException('SKU already exists');
    }
    return this.prisma.product.update({ where: { id }, data });
  }
}
