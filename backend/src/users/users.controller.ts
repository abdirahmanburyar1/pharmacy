import { Controller, Get, Post, Put, Body, Param, UseGuards } from '@nestjs/common';
import { UsersService } from './users.service';
import { RequirePermissions } from '../auth/permissions.decorator';
import { CurrentUser } from '../auth/current-user.decorator';

@Controller('users')
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Get()
  @RequirePermissions('manage_users')
  findAll() {
    return this.usersService.findAll();
  }

  @Get('me')
  getProfile(@CurrentUser() user: { id: string }) {
    return this.usersService.findById(user.id);
  }

  @Get(':id')
  @RequirePermissions('manage_users')
  findOne(@Param('id') id: string) {
    return this.usersService.findById(id);
  }

  @Post()
  @RequirePermissions('manage_users')
  create(@Body() body: { email: string; password: string; name: string; roleIds?: string[] }) {
    return this.usersService.create(body);
  }

  @Put(':id')
  @RequirePermissions('manage_users')
  update(
    @Param('id') id: string,
    @Body() body: { name?: string; isActive?: boolean; roleIds?: string[] },
  ) {
    return this.usersService.update(id, body);
  }
}
