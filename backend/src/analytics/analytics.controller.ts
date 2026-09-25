import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { RoleName } from '@prisma/client';
import { AnalyticsService } from './analytics.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@ApiTags('Analytics & Executive Dashboard')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('summary')
  @Roles(RoleName.SUPER_ADMIN, RoleName.WAREHOUSE_MANAGER)
  @ApiOperation({ summary: 'Get executive dashboard metrics, top products, and revenue trends' })
  @ApiQuery({ name: 'warehouseId', required: false, description: 'Filter metrics by specific warehouse' })
  async getSummary(@Query('warehouseId') warehouseId?: string) {
    const data = await this.analyticsService.getExecutiveSummary(warehouseId);
    return {
      message: 'Executive analytics summary retrieved',
      data,
    };
  }
}
