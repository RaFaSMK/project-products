import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const logger = new Logger('Bootstrap');

  // Segurança
  app.use(helmet());
  app.enableCors({ origin: process.env.CORS_ORIGIN || '*' });

  // Validação global
  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, transform: true }),
  );

  // Swagger
  const config = new DocumentBuilder()
    .setTitle('Auth Service')
    .setDescription('Microserviço de autenticação — registro, login e JWT')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api-docs', app, document);

  const port = process.env.AUTH_PORT || 3001;
  await app.listen(port);
  logger.log(`Auth Service rodando na porta ${port}`);
  logger.log(`Swagger disponível em http://localhost:${port}/api-docs`);
}
bootstrap();
