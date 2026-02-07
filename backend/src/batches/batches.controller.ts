import { Controller, Get, Param, Query } from '@nestjs/common';
import { BatchesService } from './batches.service';
import { RequirePermissions } from '../auth/permissions.decorator';

@Controller('batches')
export class BatchesController {
  constructor(private batchesService: BatchesService) {}

  @Get('expiring-soon')
  @RequirePermissions('manage_products', 'view_reports')
  getExpiringSoon(@Query('days') days?: string) {
    return this.batchesService.getExpiringSoon(days ? parseInt(days, 10) : 90);
  }

  @Get('expired')
  @RequirePermissions('manage_products', 'dispose_stock', 'view_reports')
  getExpired() {
    return this.batchesService.getExpired();
  }

  @Get('product/:productId')
  @RequirePermissions('manage_products', 'sell_medicine')
  findByProduct(@Param('productId') productId: string) {
    return this.batchesService.findByProduct(productId);
  }
}
