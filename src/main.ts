import 'dotenv/config'; // Load .env BEFORE any other imports
import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { AppModule } from '@/app.module';
import { PORT } from '@/app.settings';

async function bootstrap(): Promise<void> {
  const logger = new Logger('Bootstrap');

  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('api/v1');

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  // CORS for development
  app.enableCors();

  await app.listen(PORT);

  logger.log(`Application listening on port ${PORT}`);
}

bootstrap();
