import { Controller, Post, Body, Get, UseGuards, Req, Ip } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { CurrentUser, AuthenticatedUser } from './decorators/current-user.decorator';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Throttle({ default: { ttl: 60000, limit: 5 } })
  @Post('login')
  @ApiOperation({ summary: 'Login with email & password, returns JWT tokens' })
  @ApiResponse({ status: 200, description: 'Authentication successful' })
  @ApiResponse({ status: 401, description: 'Invalid email or password' })
  async login(@Body() loginDto: LoginDto, @Ip() ipAddress: string) {
    const result = await this.authService.login(loginDto, ipAddress);
    return {
      message: 'Login successful',
      data: result,
    };
  }

  @Throttle({ default: { ttl: 60000, limit: 5 } })
  @Post('refresh')
  @ApiOperation({ summary: 'Refresh access token using refresh token' })
  @ApiResponse({ status: 200, description: 'Token refreshed successfully' })
  @ApiResponse({ status: 401, description: 'Invalid or expired refresh token' })
  async refreshToken(@Body() refreshTokenDto: RefreshTokenDto) {
    const result = await this.authService.refreshToken(refreshTokenDto);
    return {
      message: 'Token refreshed successfully',
      data: result,
    };
  }

  @Get('profile')
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get current logged-in user profile' })
  @ApiResponse({ status: 200, description: 'User profile retrieved' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getProfile(@CurrentUser() user: AuthenticatedUser) {
    const result = await this.authService.getProfile(user.id);
    return {
      message: 'Profile retrieved successfully',
      data: result,
    };
  }
}
