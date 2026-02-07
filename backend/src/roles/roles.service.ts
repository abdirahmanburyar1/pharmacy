import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class RolesService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.role.findMany({
      include: {
        rolePermissions: { include: { permission: true } },
      },
    });
  }

  async findById(id: string) {
    const role = await this.prisma.role.findUnique({
      where: { id },
      include: {
        rolePermissions: { include: { permission: true } },
      },
    });
    if (!role) throw new NotFoundException('Role not found');
    return role;
  }

  async getPermissions() {
    return this.prisma.permission.findMany({
      orderBy: [{ module: 'asc' }, { code: 'asc' }],
    });
  }

  async create(data: { name: string; description?: string; permissionIds?: string[] }) {
    return this.prisma.role.create({
      data: {
        name: data.name,
        description: data.description,
        rolePermissions: data.permissionIds?.length
          ? { create: data.permissionIds.map((pid) => ({ permissionId: pid })) }
          : undefined,
      },
      include: { rolePermissions: { include: { permission: true } } },
    });
  }

  async update(id: string, data: { name?: string; description?: string; permissionIds?: string[] }) {
    if (data.permissionIds !== undefined) {
      await this.prisma.rolePermission.deleteMany({ where: { roleId: id } });
      if (data.permissionIds.length) {
        await this.prisma.rolePermission.createMany({
          data: data.permissionIds.map((pid) => ({ roleId: id, permissionId: pid })),
        });
      }
    }
    return this.prisma.role.update({
      where: { id },
      data: {
        ...(data.name && { name: data.name }),
        ...(data.description !== undefined && { description: data.description }),
      },
      include: { rolePermissions: { include: { permission: true } } },
    });
  }

  async delete(id: string) {
    return this.prisma.role.delete({ where: { id } });
  }
}
