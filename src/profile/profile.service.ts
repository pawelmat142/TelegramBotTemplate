import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Profile } from './profile.model';
import { TelegramUtil } from 'src/telegram/util/telegram.util';

@Injectable()
export class ProfileService {

    private readonly logger = new Logger(this.constructor.name)

    constructor(
        @InjectModel(Profile.name) private profileModel: Model<Profile>,
    ) {}

    public findById(uid: string) {
        return this.profileModel.findOne({ uid }).exec()
    }

    public findByName(name: string) {
        return this.profileModel.findOne({ name }).exec()
    }

    public findTelegramChannedId(uid: string) {
        return this.profileModel.findOne({ uid }).select('telegramChannelId').exec()
    }

    public findByTelegram(telegramChannelId: string) {
        return this.profileModel.findOne({ telegramChannelId })
    }

    async createProfile(_profile: Partial<Profile>) {
        const checkName = await this.profileModel.findOne({ name: _profile.name })
            .select({ _id: true })
        if (checkName) {
            throw new BadRequestException('Name already n use')
        }

        _profile.uid = TelegramUtil.idByTelegram(_profile.telegramChannelId)

        const profile = new this.profileModel({
            uid: _profile.uid,
            name: _profile.name,
            roles: [],
            status: 'ACTIVE',
            telegramChannelId: _profile.telegramChannelId,
            created: new Date()
        })

        const saved = await profile.save()
        this.logger.log(`Created user ${profile.name}, uid: ${profile.uid}`)
        return saved
    }

    public async deleteProfile(profile: Profile) {
        const result = await this.profileModel.deleteOne({ uid: profile.uid })
        if (!result.deletedCount) {
            throw new NotFoundException(`Profile not found`)
        }
    }
}
