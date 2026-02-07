import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SuppliersService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.supplier.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
    });
  }

  async findById(id: string) {
    const s = await this.prisma.supplier.findUnique({ where: { id } });
    if (!s) throw new NotFoundException('Supplier not found');
    return s;
  }

  async create(data: { name: string; contact?: string; email?: string; phone?: string; address?: string }) {
    return this.prisma.supplier.create({ data });
  }

  async update(id: string, data: Partial<{ name: string; contact: string; email: string; phone: string; address: string; isActive: boolean }>) {
    return this.prisma.supplier.update({ where: { id }, data });
  }
}
