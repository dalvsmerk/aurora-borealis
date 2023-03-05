const { BaseNotificationStrategy } = require('./base-notification-strategy');

class TelegramNotificationStrategy extends BaseNotificationStrategy {
    constructor({ telegramApi }) {
        this.telegramApi = telegramApi;
    }

    async execute({ kpIndex }) {
        const message = `
Check your forecast, there is a high chance of seeing northern light!
Kp-index is ${kpIndex}.
    `;

        const response = await this.telegramApi.sendMessage(message);

        if (!response.ok) {
            throw new Error('Failed to send Telegram notification');
        }
    }
}

module.exports = { TelegramNotificationStrategy };
