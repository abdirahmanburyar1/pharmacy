import { Controller, Get, Post, Body, Param, Query } from '@nestjs/common';
import { PurchasesService } from './purchases.service';
import { RequirePermissions } from '../auth/permissions.decorator';
import { CurrentUser } from '../auth/current-user.decorator';

@Controller('purchases')
export class PurchasesController {
  constructor(private purchasesService: PurchasesService) {}

  @Get()
  @RequirePermissions('create_purchase', 'view_purchases', 'approve_purchase')
  findAll(@Query('status') status?: string) {
    const s = status as any;
    return this.purchasesService.findAll(s ? { status: s } : {});
  }

  @Get(':id')
  @RequirePermissions('create_purchase', 'view_purchases', 'approve_purchase')
  findOne(@Param('id') id: string) {
    return this.purchasesService.findById(id);
  }

  @Post()
  @RequirePermissions('create_purchase')
  create(@CurrentUser() user: { id: string }, @Body() body: any) {
    return this.purchasesService.create(user.id, body);
  }

  @Post(':id/submit')
  @RequirePermissions('create_purchase')
  submit(@Param('id') id: string, @CurrentUser() user: { id: string }) {
    return this.purchasesService.submitForApproval(id, user.id);
  }

  @Post(':id/approve')
  @RequirePermissions('approve_purchase')
  approve(@Param('id') id: string, @CurrentUser() user: { id: string }) {
    return this.purchasesService.approve(id, user.id);
  }

  @Post(':id/reject')
  @RequirePermissions('approve_purchase')
  reject(@Param('id') id: string, @CurrentUser() user: { id: string }, @Body() body?: { reason?: string }) {
    return this.purchasesService.reject(id, user.id, body?.reason);
  }
}
