import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { AppService } from './app.service';

@ApiTags('health')
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  @ApiOperation({ summary: 'Health check endpoint' })
  @ApiResponse({ status: 200, description: 'API is running' })
  getHello(): { message: string; timestamp: string; version: string } {
    return this.appService.getHello();
  }

  @Get('health')
  @ApiOperation({ summary: 'Detailed health check' })
  @ApiResponse({ status: 200, description: 'Detailed health information' })
  getHealth(): {
    status: string;
    uptime: number;
    memory: any;
    timestamp: string;
  } {
    return this.appService.getHealth();
  }

  @Get('version')
  @ApiOperation({ summary: 'Get API version information' })
  @ApiResponse({
    status: 200,
    description: 'Version information including build time and git commit',
  })
  getVersion(): {
    version: string;
    buildTime: string;
    nodeVersion: string;
    timestamp: string;
    gitCommit?: string;
  } {
    return this.appService.getVersion();
  }
}
