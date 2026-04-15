import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  ParseIntPipe,
  UseGuards,
  Req,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { UpdateUserDto, ChangePasswordDto, AdminResetPasswordDto } from './dto/users.dto';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../common/enums';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { RequestWithUser } from '../common/types/request-with-user';
import { UserItem, PaginatedUsersResponse } from './users.types';

@ApiTags('users')
@ApiBearerAuth()
@Controller('users')
@UseGuards(RolesGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) { }

  @Get()
  @Roles(UserRole.ADMIN)
  async findAll(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('search') search?: string,
  ): Promise<PaginatedUsersResponse> {
    return this.usersService.findAll({ page, limit, search });
  }

  @Get('me')
  async getMe(@Req() req: RequestWithUser): Promise<UserItem> {
    return this.usersService.findOne(req.user.userId, req.user.userId, req.user.role);
  }

  @Get(':id')

  async findOne(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: RequestWithUser,
  ): Promise<UserItem> {
    return this.usersService.findOne(id, req.user.userId, req.user.role);
  }

  @Patch(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateUserDto,
    @Req() req: RequestWithUser,
  ): Promise<UserItem> {
    return this.usersService.update(id, dto, req.user.userId, req.user.role);
  }

  @Post('me/change-password')
  async changePassword(
    @Req() req: RequestWithUser,
    @Body() dto: ChangePasswordDto,
  ): Promise<{ message: string }> {
    return this.usersService.changePassword(req.user.userId, dto);
  }

  @Post(':id/reset-password')
  @Roles(UserRole.ADMIN)
  async adminResetPassword(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: AdminResetPasswordDto,
  ): Promise<{ message: string }> {
    return this.usersService.adminResetPassword(id, dto);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  async remove(@Param('id', ParseIntPipe) id: number): Promise<{ message: string }> {
    return this.usersService.remove(id);
  }
}
