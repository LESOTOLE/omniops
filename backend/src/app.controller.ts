import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AppService } from './app.service';

@ApiTags('System')
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get('health')
  @ApiOperation({ summary: 'Check API and system health status' })
  @ApiResponse({ status: 200, description: 'System is healthy' })
  getHealth() {
    return this.appService.getSystemStatus();
  }
}
