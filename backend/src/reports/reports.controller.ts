import { Controller, Get, Query } from '@nestjs/common';
import { ReportsService } from './reports.service';
import { RequirePermissions } from '../auth/permissions.decorator';

@Controller('reports')
export class ReportsController {
  constructor(private reportsService: ReportsService) {}

  @Get('sales/daily')
  @RequirePermissions('view_reports')
  dailySales(@Query('date') date?: string) {
    return this.reportsService.dailySalesReport(
      date ? new Date(date) : new Date(),
    );
  }

  @Get('sales/monthly')
  @RequirePermissions('view_reports')
  monthlySales(@Query('year') year: string, @Query('month') month: string) {
    return this.reportsService.monthlySalesReport(
      parseInt(year, 10),
      parseInt(month, 10),
    );
  }

  @Get('profit')
  @RequirePermissions('view_reports')
  profit(@Query('from') from: string, @Query('to') to: string) {
    return this.reportsService.profitReport(
      from ? new Date(from) : new Date(0),
      to ? new Date(to) : new Date(),
    );
  }

  @Get('inventory-valuation')
  @RequirePermissions('view_reports')
  inventoryValuation() {
    return this.reportsService.inventoryValuation();
  }

  @Get('expiry')
  @RequirePermissions('view_reports')
  expiryReport(@Query('days') days?: string) {
    return this.reportsService.expiryReport(days ? parseInt(days, 10) : 90);
  }

  @Get('disposals')
  @RequirePermissions('view_reports')
  disposalReport(@Query('from') from?: string, @Query('to') to?: string) {
    return this.reportsService.disposalReport(
      from ? new Date(from) : undefined,
      to ? new Date(to) : undefined,
    );
  }

  @Get('purchases')
  @RequirePermissions('view_reports')
  purchaseReport(@Query('from') from?: string, @Query('to') to?: string) {
    return this.reportsService.purchaseReport(
      from ? new Date(from) : undefined,
      to ? new Date(to) : undefined,
    );
  }

  @Get('top-selling')
  @RequirePermissions('view_reports')
  topSelling(
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('limit') limit?: string,
  ) {
    const fromDate = from ? new Date(from) : new Date(0);
    const toDate = to ? new Date(to) : new Date();
    return this.reportsService.topSellingMedicines(
      fromDate,
      toDate,
      limit ? parseInt(limit, 10) : 20,
    );
  }

  @Get('low-stock')
  @RequirePermissions('view_reports')
  lowStock() {
    return this.reportsService.lowStockReport();
  }
}
