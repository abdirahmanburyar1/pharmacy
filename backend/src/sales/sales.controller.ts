import { Controller, Get, Post, Body, Param, Query } from '@nestjs/common';
import { SalesService } from './sales.service';
import { RequirePermissions } from '../auth/permissions.decorator';
import { CurrentUser } from '../auth/current-user.decorator';

@Controller('sales')
export class SalesController {
  constructor(private salesService: SalesService) {}

  @Get()
  @RequirePermissions('view_sales', 'view_reports')
  findAll(@Query('from') from?: string, @Query('to') to?: string) {
    return this.salesService.findAll({
      from: from ? new Date(from) : undefined,
      to: to ? new Date(to) : undefined,
    });
  }

  @Get(':id')
  @RequirePermissions('view_sales')
  findOne(@Param('id') id: string) {
    return this.salesService.findById(id);
  }

  @Post()
  @RequirePermissions('sell_medicine')
  create(@CurrentUser() user: { id: string }, @Body() body: any) {
    return this.salesService.create(user.id, body);
  }
}
