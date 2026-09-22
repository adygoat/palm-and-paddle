import {
  ValidationPipe,
} from '@nestjs/common';

import {
  NestFactory,
} from '@nestjs/core';

import {
  ExpressAdapter,
} from '@nestjs/platform-express';

import express from 'express';
import serverless from 'serverless-http';

import {
  AppModule,
} from '../../app.module';

const expressApp =
  express();

let cachedServer:
  ReturnType<typeof serverless>
  | null = null;

async function bootstrap() {
  if (cachedServer) {
    return cachedServer;
  }

  const app =
    await NestFactory.create(
      AppModule,
      new ExpressAdapter(
        expressApp,
      ),
    );

  /*
   * Netlify requests arrive as:
   * /api/courts
   * /api/bookings
   * /api/admin/bookings
   */
  app.setGlobalPrefix('api');

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
    }),
  );

  app.enableCors();

  await app.init();

  cachedServer =
    serverless(
      expressApp,
    );

  return cachedServer;
}

export const handler =
  async (
    event: any,
    context: any,
  ) => {
    const server =
      await bootstrap();

    return server(
      event,
      context,
    );
  };