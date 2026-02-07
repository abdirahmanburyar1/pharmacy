import { Controller, Get, Post, Put, Delete, Body, Param } from '@nestjs/common';
import { RolesService } from './roles.service';
import { RequirePermissions } from '../auth/permissions.decorator';

@Controller('roles')
export class RolesController {
  constructor(private rolesService: RolesService) {}

  @Get()
  @RequirePermissions('manage_roles')
  findAll() {
    return this.rolesService.findAll();
  }

  @Get('permissions')
  @RequirePermissions('manage_roles')
  getPermissions() {
    return this.rolesService.getPermissions();
  }

  @Get(':id')
  @RequirePermissions('manage_roles')
  findOne(@Param('id') id: string) {
    return this.rolesService.findById(id);
  }

  @Post()
  @RequirePermissions('manage_roles')
  create(@Body() body: { name: string; description?: string; permissionIds?: string[] }) {
    return this.rolesService.create(body);
  }

  @Put(':id')
  @RequirePermissions('manage_roles')
  update(
    @Param('id') id: string,
    @Body() body: { name?: string; description?: string; permissionIds?: string[] },
  ) {
    return this.rolesService.update(id, body);
  }

  @Delete(':id')
  @RequirePermissions('manage_roles')
  delete(@Param('id') id: string) {
    return this.rolesService.delete(id);
  }
}
