import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { PrismaService } from '../../prisma/prisma.service';
import { Public } from '../../common/decorators/public.decorator';

@ApiTags('Health & System Diagnostics')
@Controller('health')
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @ApiOperation({ summary: 'System health check and database readiness' })
  @Public()
  @Get()
  async check() {
    let dbStatus = 'UP';
    let dbLatencyMs = 0;

    try {
      const start = Date.now();
      await this.prisma.$queryRaw`SELECT 1`;
      dbLatencyMs = Date.now() - start;
    } catch (err: any) {
      dbStatus = `DOWN: ${err.message}`;
    }

    return {
      status: dbStatus === 'UP' ? 'ok' : 'degraded',
      timestamp: new Date().toISOString(),
      uptimeSeconds: process.uptime(),
      database: {
        status: dbStatus,
        latencyMs: dbLatencyMs,
      },
    };
  }
}
