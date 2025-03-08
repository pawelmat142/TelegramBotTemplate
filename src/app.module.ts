import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { TelegramModule } from './telegram/telegram.module';
import { ProfileModule } from './profile/profile.module';


@Module({
  imports: [
    ConfigModule.forRoot(),

    MongooseModule.forRoot(process.env.MONGO_URI),

    TelegramModule,

    ProfileModule

  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
