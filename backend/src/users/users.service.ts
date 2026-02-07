import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async findByEmail(email: string) {
    return this.prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });
  }

  async findById(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: {
        userRoles: { include: { role: true } },
      },
    });
    if (!user) throw new NotFoundException('User not found');
    const { passwordHash, ...result } = user;
    return result;
  }

  async findAll() {
    return this.prisma.user.findMany({
      where: {},
      select: {
        id: true,
        email: true,
        name: true,
        isActive: true,
        createdAt: true,
        userRoles: { include: { role: true } },
      },
    });
  }

  async create(data: { email: string; password: string; name: string; roleIds?: string[] }) {
    const passwordHash = await bcrypt.hash(data.password, 10);
    return this.prisma.user.create({
      data: {
        email: data.email.toLowerCase(),
        passwordHash,
        name: data.name,
        userRoles: data.roleIds?.length
          ? { create: data.roleIds.map((roleId) => ({ roleId })) }
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
  }

  async update(id: string, data: { name?: string; isActive?: boolean; roleIds?: string[] }) {
    await this.prisma.user.update({
      where: { id },
      data: {
        ...(data.name && { name: data.name }),
        ...(data.isActive !== undefined && { isActive: data.isActive }),
        ...(data.roleIds && {
          userRoles: {
            deleteMany: {},
            create: data.roleIds.map((roleId) => ({ roleId })),
          },
        }),
      },
    });
    return this.findById(id);
  }

  async updatePassword(id: string, newPassword: string) {
    const passwordHash = await bcrypt.hash(newPassword, 10);
    await this.prisma.user.update({
      where: { id },
      data: { passwordHash },
    });
  }
}
