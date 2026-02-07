import { Controller, Get, Post, Put, Body, Param } from '@nestjs/common';
import { SuppliersService } from './suppliers.service';
import { RequirePermissions } from '../auth/permissions.decorator';

@Controller('suppliers')
export class SuppliersController {
  constructor(private suppliersService: SuppliersService) {}

  @Get()
  @RequirePermissions('create_purchase', 'view_purchases')
  findAll() {
    return this.suppliersService.findAll();
  }

  @Get(':id')
  @RequirePermissions('create_purchase', 'view_purchases')
  findOne(@Param('id') id: string) {
    return this.suppliersService.findById(id);
  }

  @Post()
  @RequirePermissions('create_purchase')
  create(@Body() body: any) {
    return this.suppliersService.create(body);
  }

  @Put(':id')
  @RequirePermissions('create_purchase')
  update(@Param('id') id: string, @Body() body: any) {
    return this.suppliersService.update(id, body);
  }
}
