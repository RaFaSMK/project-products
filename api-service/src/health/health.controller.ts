import { Controller, Get, Res } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import { Response } from 'express';
import * as client from 'prom-client';

// Coletar métricas padrão do Node.js (CPU, memória, etc.)
client.collectDefaultMetrics();

@ApiTags('Health')
@Controller()
export class HealthController {
  constructor(@InjectConnection() private connection: Connection) {}

  @Get('health')
  @ApiOperation({ summary: 'Verificar saúde do serviço' })
  getHealth() {
    const mongoState = this.connection.readyState;
    const states = { 0: 'disconnected', 1: 'connected', 2: 'connecting', 3: 'disconnecting' };

    return {
      status: 'ok',
      uptime: Math.floor(process.uptime()),
      timestamp: new Date().toISOString(),
      mongo: states[mongoState] || 'unknown',
    };
  }

  @Get('metrics')
  @ApiOperation({ summary: 'Métricas no formato Prometheus' })
  async getMetrics(@Res() res: Response) {
    res.set('Content-Type', client.register.contentType);
    res.end(await client.register.metrics());
  }
}
