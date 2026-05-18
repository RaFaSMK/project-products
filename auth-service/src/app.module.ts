import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { HealthModule } from './health/health.module';

@Module({
  imports: [
    MongooseModule.forRoot(process.env.AUTH_MONGO_URI || 'mongodb://mongodb:27017/auth-db'),
    ThrottlerModule.forRoot([{
      ttl: Number(process.env.THROTTLE_TTL) || 60,
      limit: Number(process.env.THROTTLE_LIMIT) || 30,
    }]),
    AuthModule,
    UsersModule,
    HealthModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class AppModule {}
