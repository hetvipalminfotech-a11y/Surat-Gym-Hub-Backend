import { Controller, Post, Body, Get, Req, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { RolesGuard } from '../common/guards/roles.guard';
import { ApiBearerAuth } from '@nestjs/swagger';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  async register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Post('login')
  async login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Post('refresh')
  async refresh(@Body() dto: RefreshTokenDto) {
    return this.authService.refreshToken(dto);
  }

  @ApiBearerAuth()
  @Post('logout')
  @UseGuards(RolesGuard)
  async logout(@Req() req: Record<string, unknown>) {
    const user = req.user as { userId: number };
    return this.authService.logout(user.userId);
  }

  @ApiBearerAuth()
  @Get('profile')
  @UseGuards(RolesGuard)
  async getProfile(@Req() req: Record<string, unknown>) {
    const user = req.user as { userId: number };
    return this.authService.getProfile(user.userId);
  }
}
