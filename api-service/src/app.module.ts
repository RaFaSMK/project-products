import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ProductsModule } from './products/products.module';
import { HealthModule } from './health/health.module';
import { MetricsInterceptor } from './common/interceptors/metrics.interceptor';

@Module({
  imports: [
    MongooseModule.forRoot(process.env.API_MONGO_URI || 'mongodb://mongodb:27017/api-db'),
    ThrottlerModule.forRoot([{
      ttl: Number(process.env.THROTTLE_TTL) || 60,
      limit: Number(process.env.THROTTLE_LIMIT) || 30,
    }]),
    ProductsModule,
    HealthModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_INTERCEPTOR, useClass: MetricsInterceptor },
  ],
})
export class AppModule {}
