import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { createValidationPipe } from './common/validation';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors({ origin: process.env.CORS_ORIGIN ?? 'http://localhost:5400' });
  app.useGlobalPipes(createValidationPipe());

  const config = new DocumentBuilder()
    .setTitle('CampaignOps mock API')
    .setDescription('Phase 1 mock backend. Acting role is read from the X-Role header.')
    .setVersion('0.1.0')
    .build();
  SwaggerModule.setup('api/docs', app, SwaggerModule.createDocument(app, config));

  const port = Number(process.env.PORT ?? 3400);
  await app.listen(port);
  console.log(`CampaignOps API on http://localhost:${port} (swagger at /api/docs)`);
}

void bootstrap();
