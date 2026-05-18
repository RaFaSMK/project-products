import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';

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

  // Filtro de exceções global
  app.useGlobalFilters(new HttpExceptionFilter());

  // Swagger
  const config = new DocumentBuilder()
    .setTitle('API Service')
    .setDescription('Microserviço de produtos — CRUD, filtros, paginação e soft delete')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api-docs', app, document);

  const port = process.env.API_PORT || 3000;
  await app.listen(port);
  logger.log(`API Service rodando na porta ${port}`);
  logger.log(`Swagger disponível em http://localhost:${port}/api-docs`);
}
bootstrap();
