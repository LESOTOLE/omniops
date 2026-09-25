import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly auditService: AuditService,
  ) {}

  async login(loginDto: LoginDto, ipAddress?: string) {
    const { email, password } = loginDto;

    const user = await this.prisma.user.findUnique({
      where: { email },
      include: {
        role: true,
        warehouse: true,
      },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid email or password credentials');
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid email or password credentials');
    }

    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role.name,
      warehouseId: user.warehouseId,
    };

    const accessToken = this.jwtService.sign(payload, {
      secret: this.configService.get<string>('JWT_SECRET', 'omniops_super_secret_jwt_key_2026_dev'),
      expiresIn: this.configService.get<string>('JWT_EXPIRES_IN', '1d'),
    });

    const refreshToken = this.jwtService.sign(payload, {
      secret: this.configService.get<string>('JWT_REFRESH_SECRET', 'omniops_super_secret_refresh_jwt_key_2026_dev'),
      expiresIn: this.configService.get<string>('JWT_REFRESH_EXPIRES_IN', '7d'),
    });

    // Audit log login event asynchronously
    await this.auditService.log({
      action: 'LOGIN',
      entity: 'User',
      entityId: user.id,
      performedBy: user.email,
      userRole: user.role.name,
      ipAddress,
      newValue: {
        loginTime: new Date().toISOString(),
      },
    });

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        phoneNumber: user.phoneNumber,
        role: user.role.name,
        warehouse: user.warehouse
          ? {
              id: user.warehouse.id,
              code: user.warehouse.code,
              name: user.warehouse.name,
            }
          : null,
      },
    };
  }

  async refreshToken(refreshTokenDto: RefreshTokenDto) {
    try {
      const payload = this.jwtService.verify(refreshTokenDto.refreshToken, {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET', 'omniops_super_secret_refresh_jwt_key_2026_dev'),
      });

      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
        include: { role: true },
      });

      if (!user) {
        throw new UnauthorizedException('User account not found');
      }

      const newPayload = {
        sub: user.id,
        email: user.email,
        role: user.role.name,
        warehouseId: user.warehouseId,
      };

      const accessToken = this.jwtService.sign(newPayload, {
        secret: this.configService.get<string>('JWT_SECRET', 'omniops_super_secret_jwt_key_2026_dev'),
        expiresIn: this.configService.get<string>('JWT_EXPIRES_IN', '1d'),
      });

      return {
        accessToken,
      };
    } catch (error) {
      throw new UnauthorizedException('Refresh token is invalid or has expired');
    }
  }

  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        role: true,
        warehouse: true,
      },
    });

    if (!user) {
      throw new BadRequestException('User profile not found');
    }

    return {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      phoneNumber: user.phoneNumber,
      role: user.role.name,
      warehouse: user.warehouse
        ? {
            id: user.warehouse.id,
            code: user.warehouse.code,
            name: user.warehouse.name,
          }
        : null,
      createdAt: user.createdAt,
    };
  }
}
