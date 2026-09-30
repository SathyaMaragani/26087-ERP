/**
 * Vercel serverless entry point for the NCCT NestJS API.
 * This module bootstraps the NestJS application once per cold start and
 * forwards all requests through it using the standard Node.js IncomingMessage /
 * ServerResponse interface — no framework rewrite needed.
 *
 * Vercel routes:
 *   /api/*   → this handler (see vercel.json rewrites)
 *   /health  → this handler
 */
import type { IncomingMessage, ServerResponse } from 'http';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import helmet from 'helmet';
// Resolve the app module from the monorepo package
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { AppModule } = require('../apps/api/src/app.module');

let cachedApp: any = null;

async function bootstrap() {
  if (cachedApp) return cachedApp;

  const app = await NestFactory.create(AppModule, { logger: ['error', 'warn'] });

  app.use(
    helmet({
      contentSecurityPolicy: false,
      crossOriginEmbedderPolicy: false,
    }),
  );

  app.setGlobalPrefix('api/v1', { exclude: ['health', 'api/docs'] });

  app.enableCors({
    origin: true,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
    exposedHeaders: ['x-request-id', 'x-tenant-id'],
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  await app.init();
  cachedApp = app.getHttpAdapter().getInstance();
  return cachedApp;
}

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  const expressApp = await bootstrap();
  expressApp(req, res);
}
