import { Router, Request, Response } from 'express';
import { db } from '../services/database.js';
import os from 'os';

const router = Router();

router.get('/', async (req: Request, res: Response) => {
  try {
    const dbHealthy = await db.healthCheck();
    
    const checks = {
      status: dbHealthy ? 'ok' : 'degraded',
      timestamp: new Date().toISOString(),
      database: {
        connected: dbHealthy,
        type: 'postgresql-16',
        port: '5437'
      },
      memory: {
        used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
        total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
        unit: 'MB'
      },
      uptime: Math.round(process.uptime()),
      system: {
        platform: os.platform(),
        cpus: os.cpus().length,
        freemem: Math.round(os.freemem() / 1024 / 1024),
        totalmem: Math.round(os.totalmem() / 1024 / 1024),
        unit: 'MB'
      }
    };

    const httpStatus = dbHealthy ? 200 : 503;
    res.status(httpStatus).json(checks);
  } catch (error) {
    res.status(503).json({
      status: 'error',
      timestamp: new Date().toISOString(),
      error: 'Health check failed'
    });
  }
});

router.get('/db', async (req: Request, res: Response) => {
  try {
    const isHealthy = await db.healthCheck();
    res.status(isHealthy ? 200 : 503).json({
      status: isHealthy ? 'ok' : 'error',
      database: 'postgresql-16',
      port: '5437 (unified internal/external)',
      connected: isHealthy
    });
  } catch (error) {
    res.status(503).json({
      status: 'error',
      database: 'postgresql-16',
      connected: false
    });
  }
});

export default router;
