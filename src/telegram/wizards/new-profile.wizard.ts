import { Profile } from "src/profile/profile.model"
import { ServiceProvider } from "./services.provider"
import { Wizard, WizardButton, WizardStep } from "./wizard"
import { BotUtil } from "../util/bot.util"

export class NewProfileWizard extends Wizard {

    constructor(chatId: number, services: ServiceProvider) {
        super(chatId, services)
        this.profile.telegramChannelId = chatId.toString()
    }

    private profile: Partial<Profile> = {}

    private error: string

    public getSteps(): WizardStep[] {
        return [{
            order: 0,
            message: [
                `New bot template app - TODO`,
                `Would you like to register?`
            ],
            buttons: [[{
                text: 'No',
                process: async () => 2
            }, {
                text: `Yes`,
                process: async () => 1
            }]]
        }, {
            order: 1,
            message: ['Provide your name...'],
            process: async (input: string) => {
                if (!input) {
                    this.error = `Empty...`
                    return 1
                }

                const checkName = await this.services.profileService.findByName(input)
                if (checkName) {
                    this.error = `Name alredy in use...`
                    return 1
                }

                this.profile.name = input
                return 3
            }
        }, {
            order: 2,
            message: [`Bye`],
            close: true
        }, {
            order: 3,
            message: [`Profile with name ${this.profile.name} will be created`],
            buttons: [[{
                text: 'Cancel',
                process: async () => {
                    return 0
                }
            }, {
                text: 'Confirm',
                process: async () => {
                    return this.createProfile()
                }
            }]], 
        }, {
            order: 4,
            message: [this.error],
            buttons: this.byeBtn()
        }, {
            order: 5,
            message: ['Registered!'],
            buttons: this.byeBtn()
        }, {
            order: 6,
            message: [],
            close: true
        }]
    }

    private byeBtn(): WizardButton[][] {
        return BotUtil.byeBtn(6)
    }


    private async createProfile(): Promise<number> {
        try {
            await this.services.profileService.createProfile(this.profile)
            return 5
        } catch (error) {
            this.error = error
            this.logger.warn(error)
            return 4
        }
    }

}