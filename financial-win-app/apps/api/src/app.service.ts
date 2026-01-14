import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getHello(): { message: string; timestamp: string; version: string } {
    return {
      message: 'financial-win API is running!',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
    };
  }

  getHealth(): {
    status: string;
    uptime: number;
    memory: any;
    timestamp: string;
  } {
    return {
      status: 'healthy',
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      timestamp: new Date().toISOString(),
    };
  }

  getVersion(): {
    version: string;
    buildTime: string;
    nodeVersion: string;
    timestamp: string;
    gitCommit?: string;
  } {
    // Intentar obtener commit hash desde variable de entorno (si está disponible)
    const gitCommit =
      process.env.GIT_COMMIT || process.env.COMMIT_SHA || undefined;

    return {
      version: process.env.npm_package_version || '1.0.0',
      buildTime: process.env.BUILD_TIME || new Date().toISOString(),
      nodeVersion: process.version,
      timestamp: new Date().toISOString(),
      gitCommit,
    };
  }
}
