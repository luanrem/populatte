import { NestFactory } from '@nestjs/core';

import { AppModule } from './app.module';
import { MulterExceptionFilter } from './infrastructure/upload/filters/multer-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    rawBody: true,
  });

  app.enableCors({
    origin: [
      'http://localhost:3000',
      'http://localhost:3001',
      process.env['WEB_URL'] ?? '',
    ].filter(Boolean),
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  app.useGlobalFilters(new MulterExceptionFilter());

  await app.listen(process.env['PORT'] ?? 3001);
}
bootstrap();
