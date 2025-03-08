import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { Profile, ProfileSchema } from './profile.model';
import { ProfileService } from './profile.service';

@Module({
    imports: [
        MongooseModule.forFeature([{
            name: Profile.name,
            schema: ProfileSchema
        }]),
        ConfigModule,
    ],
    providers: [
        ProfileService
    ],
    exports: [
        ProfileService
    ]
})
export class ProfileModule {}
