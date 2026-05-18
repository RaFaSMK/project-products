import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';

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
}
