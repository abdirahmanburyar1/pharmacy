import { Controller, Get, Post, Put, Body, Param, Query } from '@nestjs/common';
import { ProductsService } from './products.service';
import { RequirePermissions } from '../auth/permissions.decorator';

@Controller('products')
export class ProductsController {
  constructor(private productsService: ProductsService) {}

  @Get()
  @RequirePermissions('manage_products', 'sell_medicine')
  findAll(@Query('search') search?: string, @Query('activeOnly') activeOnly?: string) {
    return this.productsService.findAll({
      search,
      activeOnly: activeOnly === 'false' ? false : true,
    });
  }

  @Get('barcode/:barcode')
  @RequirePermissions('manage_products', 'sell_medicine')
  findByBarcode(@Param('barcode') barcode: string) {
    return this.productsService.findByBarcode(barcode);
  }

  @Get(':id')
  @RequirePermissions('manage_products', 'sell_medicine')
  findOne(@Param('id') id: string) {
    return this.productsService.findById(id);
  }

  @Post()
  @RequirePermissions('manage_products')
  create(@Body() body: any) {
    return this.productsService.create(body);
  }

  @Put(':id')
  @RequirePermissions('manage_products')
  update(@Param('id') id: string, @Body() body: any) {
    return this.productsService.update(id, body);
  }
}
