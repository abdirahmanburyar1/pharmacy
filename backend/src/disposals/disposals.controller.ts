import { Controller, Get, Post, Body, Param, Query } from '@nestjs/common';
import { DisposalsService } from './disposals.service';
import { RequirePermissions } from '../auth/permissions.decorator';
import { CurrentUser } from '../auth/current-user.decorator';

@Controller('disposals')
export class DisposalsController {
  constructor(private disposalsService: DisposalsService) {}

  @Get()
  @RequirePermissions('dispose_stock', 'approve_disposal', 'view_reports')
  findAll(@Query('status') status?: string) {
    return this.disposalsService.findAll(status ? { status: status as any } : {});
  }

  @Get(':id')
  @RequirePermissions('dispose_stock', 'approve_disposal', 'view_reports')
  findOne(@Param('id') id: string) {
    return this.disposalsService.findById(id);
  }

  @Post()
  @RequirePermissions('dispose_stock')
  create(@CurrentUser() user: { id: string }, @Body() body: any) {
    return this.disposalsService.create(user.id, body);
  }

  @Post(':id/submit')
  @RequirePermissions('dispose_stock')
  submit(@Param('id') id: string, @CurrentUser() user: { id: string }) {
    return this.disposalsService.submitForApproval(id, user.id);
  }

  @Post(':id/approve')
  @RequirePermissions('approve_disposal')
  approve(@Param('id') id: string, @CurrentUser() user: { id: string }) {
    return this.disposalsService.approve(id, user.id);
  }

  @Post(':id/reject')
  @RequirePermissions('approve_disposal')
  reject(@Param('id') id: string, @CurrentUser() user: { id: string }, @Body() body?: { reason?: string }) {
    return this.disposalsService.reject(id, user.id, body?.reason);
  }
}
