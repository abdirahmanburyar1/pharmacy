import { Controller, Get, Post, Body, Param, Query } from '@nestjs/common';
import { AdjustmentsService } from './adjustments.service';
import { RequirePermissions } from '../auth/permissions.decorator';
import { CurrentUser } from '../auth/current-user.decorator';

@Controller('adjustments')
export class AdjustmentsController {
  constructor(private adjustmentsService: AdjustmentsService) {}

  @Get()
  @RequirePermissions('adjust_stock', 'approve_adjustment', 'view_reports')
  findAll(@Query('status') status?: string) {
    return this.adjustmentsService.findAll(status ? { status: status as any } : {});
  }

  @Get(':id')
  @RequirePermissions('adjust_stock', 'approve_adjustment', 'view_reports')
  findOne(@Param('id') id: string) {
    return this.adjustmentsService.findById(id);
  }

  @Post()
  @RequirePermissions('adjust_stock')
  create(@CurrentUser() user: { id: string }, @Body() body: any) {
    return this.adjustmentsService.create(user.id, body);
  }

  @Post(':id/submit')
  @RequirePermissions('adjust_stock')
  submit(@Param('id') id: string, @CurrentUser() user: { id: string }) {
    return this.adjustmentsService.submitForApproval(id, user.id);
  }

  @Post(':id/approve')
  @RequirePermissions('approve_adjustment')
  approve(@Param('id') id: string, @CurrentUser() user: { id: string }) {
    return this.adjustmentsService.approve(id, user.id);
  }

  @Post(':id/reject')
  @RequirePermissions('approve_adjustment')
  reject(@Param('id') id: string, @CurrentUser() user: { id: string }, @Body() body?: { reason?: string }) {
    return this.adjustmentsService.reject(id, user.id, body?.reason);
  }
}
