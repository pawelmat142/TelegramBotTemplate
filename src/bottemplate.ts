import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import * as dotenv from 'dotenv';
import { Logger } from '@nestjs/common';
import { createMyLogger } from './global/logger';
import { AppExceptionFilter } from './global/exceptions/exception-filter';

// TODO replace all 'bottemplate' occurrences with new app name  
// TODO rename this filename wiwth new app name :) 

dotenv.config()
export const globalLogger = new Logger('GLOBAL')

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: createMyLogger(),
  });

  app.useGlobalFilters(new AppExceptionFilter())


  const port = process.env.PORT ?? 3000
  globalLogger.log(`Listening on port ${port}`)
  await app.listen(port);
}
bootstrap()
