import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getSystemStatus(): Record<string, any> {
    return {
      service: 'OmniOps API Engine',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      status: 'healthy',
    };
  }
}
