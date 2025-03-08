import * as moment from 'moment-timezone';
import * as winston from 'winston'; //npm install --save nest-winston winston
import { createLogger } from 'winston';
import * as DailyRotateFile from 'winston-daily-rotate-file'; //npm i winston-daily-rotate-file
import { utilities as nestWinstonModuleUtilities, WinstonModule } from 'nest-winston';

const timeZone = 'Europe/Warsaw';

const customTimestamp = winston.format((info) => {
    info.timestamp = moment().tz(timeZone).format('YYYY-MM-DD HH:mm:ss')
    return info
  })

  export const createMyLogger = () => WinstonModule.createLogger({
    instance: createLogger({
      transports : [
        new winston.transports.Console({
          format: winston.format.combine(
            customTimestamp(),
            // winston.format.timestamp(),
            winston.format.ms(),
            nestWinstonModuleUtilities.format.nestLike('bottemplate', {
              colors: true,
              prettyPrint: true,
            }),
          ),
        }),

        new DailyRotateFile({
          dirname: '../logs',
          filename: '%DATE%_name.log', //TODO
          datePattern: 'YYYY-MM-DD',
          zippedArchive: true,
          maxSize: '20m',
          maxFiles: '14d',
          format: winston.format.combine(
            // winston.format.timestamp(),
            customTimestamp(),
            winston.format.printf(({ timestamp, level, message }) => {
              return `[${timestamp}] [${level}] ${message}`;
            }),
          ),
        }),
      ]
    })
});