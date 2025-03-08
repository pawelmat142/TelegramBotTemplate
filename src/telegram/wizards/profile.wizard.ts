import { Profile } from "src/profile/profile.model"
import { ServiceProvider } from "./services.provider"
import { Wizard, WizardStep } from "./wizard"
import { BotUtil } from "../util/bot.util"

export class ProfileWizard extends Wizard {

    protected profile: Profile

    constructor(profile: Profile, services: ServiceProvider) {
        super(Number(profile.telegramChannelId), services)
        this.profile = profile
    }

    private error: any

    public getProfile(): Profile {
        return this.profile
    }

    public getSteps(): WizardStep[] {
        return [{
            order: 0,
            message: [
                `Hi, ${this.profile?.name}`,
                `Welcome to Template app - TODO`,
            ],
            buttons: [[{
                text: 'Delete account',
                process: async () => 2
            }], [{
                text: `Bye`,
                process: async () => 4
            }]], 
        }, {
            order: 1,
            message: [this.error],
        }, {
            order: 2,
            message: [`Are you sure?`],
            buttons: [[{
                text: `No`,
                process: async () => 0
            }, {
                text: `Yes`,
                process: () => this.deleteAccount()
            }]]
        }, {
            order: 3,
            message: [`Your profile deleted successfully`],
            buttons: BotUtil.byeBtn(4)
        }, {
            order: 4,
            message: [],
            close: true
        }]
    }


    private async deleteAccount() {
        try {
            await this.services.profileService.deleteProfile(this.profile)
            return 4
        } catch (error) {
            this.error = error
            this.logger.error(error)
            return 2
        }
    }



}