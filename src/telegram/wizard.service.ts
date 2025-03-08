import { Injectable, Logger } from '@nestjs/common';
import { BehaviorSubject } from 'rxjs';
import { Wizard } from './wizards/wizard';
import { WizBtn } from './util/wiz-btn';
import { BotUtil } from './util/bot.util';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ProfileWizard } from './wizards/profile.wizard';
import { ServiceProvider } from './wizards/services.provider';
import { NewProfileWizard } from './wizards/new-profile.wizard';
import TelegramBot = require("node-telegram-bot-api")

@Injectable()
export class WizardService {

    private readonly logger = new Logger(WizardService.name)

    private readonly wizards$ = new BehaviorSubject<Wizard[]>([])

    private readonly bot: TelegramBot = this.initBot()

    private lastMessageWithButtonsId = {}

    constructor(
        private readonly servicesProvider: ServiceProvider
    ) {}

    private initBot(): TelegramBot {
        const token = process.env.TELEGRAM_BOT_TOKEN
        if (!token || process.env.SKIP_TELEGRAM === 'true') {
            this.logger.warn('[SKIP] Initializing telegram bot')
            return undefined
        } else {
            this.logger.log('TELEGRAM BOT INITIALIZATION')
            return new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, { polling: true })
        }
    }

    onModuleInit() {
        if (process.env.SKIP_TELEGRAM !== 'true') {
            this.bot.on('message', (message: TelegramBot.Message) => this.onBotMessage(message))
            this.bot.on('callback_query', (callback: TelegramBot.CallbackQuery) => this.onBotButton(callback))
        }
    }

    lastMsgIdPerTelegram = new Map<number, number>()

    public async sendMessage(chatId: number, message: string, options?: TelegramBot.SendMessageOptions): Promise<TelegramBot.Message> {
        const result = await this.bot?.sendMessage(chatId, message, options)
        this.lastMsgIdPerTelegram.set(chatId, result.message_id)
        return result
    }

    public async cleanMessages(telegramChannelId: string) {
        const msgId = this.lastMsgIdPerTelegram.get(Number(telegramChannelId))
        if (msgId) {
            for (let i = 0; i < 50; i++) {
                this.bot.deleteMessage(Number(telegramChannelId), msgId-i).catch(er=>{return})
            }
            this.logger.log('Chat cleaned successfully');
        }
    }

    private async onBotMessage(message: TelegramBot.Message) {
        const chatId = message.chat.id
        if (!chatId) {
          this.logger.error('Chat id not found')
          return
        }
        const input = message.text
        if (!input) {
            return
        }
        let wizard = await this.findOrCreateWizard(chatId)
        let step = wizard.getStep()

        if (step.process) {
            const order = await step.process(input)
            wizard.order = order
        }
        wizard.msgId = message.message_id
        this.sendWizardMessage(wizard, input)
    }


    public async onBotButton(message: TelegramBot.CallbackQuery) {
        const chatId = message.from.id
        if (!chatId) {
          this.logger.error('Chat id not found')
          return
        }
        let input = message.data
        if (!input || input === WizBtn.AVOID_BUTTON_CALLBACK) {
            return
        }

        let wizard = await this.findOrCreateWizard(chatId)
        let step = wizard.getStep()

        const clickedButton = BotUtil.findClickedButton(step, message.data)
        await this.removeCallbackButtons(message)

        if (clickedButton) {
            if (clickedButton.switch) {
                this.stopWizard(wizard)
                wizard = this.switchWizard(clickedButton.switch, wizard as ProfileWizard) as ProfileWizard
                await wizard.init()
            } else if (clickedButton.process) {
                this.wizardLog(wizard, `processing...`)
                const order = await clickedButton.process()
                wizard.order = order
            }
        }

        wizard.msgId = message.message.message_id
        this.sendWizardMessage(wizard, input)
    }

    
    private async findOrCreateWizard(chatId: number): Promise<Wizard> {
        this.showTyping(chatId)
        let wizard = this.findWizard(chatId)
        if (!wizard) {
            wizard = await this.prepareWizard(chatId)
        }
        wizard.modified = new Date()
        return wizard
    }

    public async showTyping(chatId: number): Promise<boolean> {
        return this.bot?.sendChatAction(chatId, 'typing')
    }

    
    private async startNewWizard(chatId: number) {
        let wizard = await this.findOrCreateWizard(chatId)
        this.sendWizardMessage(wizard, '')
    }

    private findWizard(chatId: number): Wizard {
        return this.wizards$.value.find(w => w.chatId === chatId)
    }

    private async prepareWizard(chatId: number): Promise<Wizard> {
        const telegramChannelId = chatId.toString()
        const profile = await this.servicesProvider.profileService.findByTelegram(telegramChannelId)
        const wizard: Wizard = profile 
            ? new ProfileWizard(profile, this.servicesProvider)
            : new NewProfileWizard(chatId, this.servicesProvider)

        await wizard.init()
        const wizards = this.wizards$.value
        wizards.push(wizard)
        this.wizards$.next(wizards)
        return wizard
    }

    private stopWizard(wizard: Wizard) {
        this.cleanMessages(wizard.chatId.toString())
        const wizards = this.wizards$.value.filter(w => w.chatId !== wizard.chatId)
        this.wizards$.next(wizards)
        this.wizardLog(wizard, `stopped`)
    }

    @Cron(CronExpression.EVERY_30_MINUTES)
    private async deactivateExpiredWizards() {
        const expiredWizardChatIds = this.wizards$.value
            .filter(BotUtil.isExpired).map(w => w.chatId)
        const wizards = this.wizards$.value
            .filter(w => !expiredWizardChatIds.includes(w.chatId))
        this.wizards$.next(wizards)
        expiredWizardChatIds.forEach(chatId => this.sendMessage(chatId, 'Dialog expired!'))
    }

    private removeCallbackButtons(callback: TelegramBot.CallbackQuery): Promise<TelegramBot.Message | boolean> {
        const chatId = callback.from.id

        const msgIdToRemoveButtons = this.lastMessageWithButtonsId[chatId]
        if (!msgIdToRemoveButtons) return

        const buttons = callback.message.reply_markup.inline_keyboard
        const newButtons = []
        buttons.forEach(btns => {
            btns.forEach(btn => {
                if (btn.callback_data === callback.data) {
                    btn.callback_data = WizBtn.AVOID_BUTTON_CALLBACK    //prevents process again same step action
                    newButtons.push([btn])
                }
            })
        })
        return this.removeChatButtons(chatId, this.lastMessageWithButtonsId[chatId], newButtons)
    }

    private async sendWizardMessage(wizard: Wizard, _input: string) {
        const input = _input.toLowerCase()

        let step = wizard.getStep()
        
        let msg = step.message

        if (!isNaN(step.nextOrder)) {
            wizard.order = step.nextOrder
            step = wizard.getStep()
            msg.push('', ...step.message)
        }
        BotUtil.addBackBtnIfNeeded(step)


        if (step.close || input === WizBtn.STOP) {
            if (input === WizBtn.STOP) {
                msg = ['Dialog interrupted']
            }
            this.stopWizard(wizard)
            delete step.buttons
        }
        let buttons = step.buttons || []

        const options: TelegramBot.SendMessageOptions = {}

        if (Array.isArray(buttons)) {
            options.reply_markup = {
                one_time_keyboard: true,
                inline_keyboard: buttons.map(btns => btns.map(btn => {
                    if (btn.url && btn.process) {
                        btn.process()
                    }
                    if (!btn.callback_data) {
                        btn.callback_data = btn.text
                    }
                    return btn as TelegramBot.InlineKeyboardButton
                })),
            }
        }
        if (!msg.length) {
            this.logger.warn(`empty message`)
            return
        }
        const result = await this.sendMessage(wizard.chatId, BotUtil.msgFrom(msg), options)
        this.wizardLog(wizard, `message sent`)
        if (buttons.length) {
            this.lastMessageWithButtonsId[result.chat.id] = result.message_id
        }
        if (step.close) {
            this.stopWizard(wizard)
        }
    }

    public removeChatButtons(chatId: number, messageId: number, buttons: TelegramBot.InlineKeyboardButton[][]) {
        if (!messageId) return
        return this.bot.editMessageReplyMarkup({
            inline_keyboard: buttons ?? []
        }, {
            chat_id: chatId,
            message_id: messageId
        })
    }


    // SWITCH
    private switchWizard(name: string, currentWizard: ProfileWizard): ProfileWizard {
        const wizard = this.selectSWitchWizard(name, currentWizard)
        const wizards = this.wizards$.value.filter(w => w.chatId === currentWizard.chatId)
        wizards.push(wizard)
        this.wizards$.next(wizards)
        return wizard
    }

    private selectSWitchWizard(name: string, currentWizard: ProfileWizard): ProfileWizard {
        switch (name) {
            case ProfileWizard.name:
                return new ProfileWizard(currentWizard.getProfile(), this.servicesProvider)

            default: throw new Error('switch wizard error')
        }
    }

    private wizardLog(wizard: Wizard, log: string) {
        const unitIdentifierLog = wizard instanceof ProfileWizard ? ` [${wizard.getProfile().uid}]` : ''
        this.logger.log(`[${wizard.constructor.name}]${unitIdentifierLog} step ${wizard.order}, chatId: ${wizard.chatId} - ${log}`)
    }
}
