import * as crypto from 'crypto'

export abstract class TelegramUtil {

    public static idByTelegram(telegramChannelId: string): string {
        return `telegram_${telegramChannelId}`
    }

    public static loginToken(): string {
        return crypto.randomUUID()
    }

    public static pin(): string {
        const pin = Math.floor(Math.random() * 10000); // Generates a number between 0 and 9999
        return pin.toString().padStart(4, '0'); // Pads with leading zeros if necessary
    }

    private static emailByTelegram(telegramChannelId: string): string {
        return `${telegramChannelId}@book-agency-telegram.com`
    }

    private static passwordByTelegram(telegramChannelId: string): string {
        const secretKey = process.env.SECRET_KEY
        if (!secretKey) {
            throw new Error("Missing secret key")
        }
        const hmac = crypto.createHmac('sha256', secretKey);
        hmac.update(telegramChannelId);
        const hash = hmac.digest('hex');
        return hash
    }

}