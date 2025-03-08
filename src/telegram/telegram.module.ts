import { Module } from '@nestjs/common';
import { TelegramService } from './telegram.service';
import { WizardService } from './wizard.service';
import { ServiceProvider } from './wizards/services.provider';
import { ProfileModule } from '../profile/profile.module';

@Module({
  imports: [
    ProfileModule,
  ],
  providers: [
    TelegramService, 
    WizardService,
    ServiceProvider
  ],
  exports: [
    TelegramService,
  ]
})
export class TelegramModule {}
