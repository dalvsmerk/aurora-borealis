const { BaseNotificationStrategy } = require('./base-notification-strategy');

class EmailNotificationStrategy extends BaseNotificationStrategy {
    constructor({ mailClient, envelop }) {
        this.mailClient = mailClient;
        this.envelop = envelop;
    }

    async execute({ kpIndex }) {
        const RECEIVER_DELIMITER = ',';
        const receivers = this.envelop.to.split(RECEIVER_DELIMITER);

        for (const receiver of receivers) {
            const message = { 
                to: receiver,
                from: this.envelop.from,
                subject: 'Aurora Borealis notification',
                html: this.emailBody(kpIndex),
            };
    
            const response = await this.mailClient.send(message);
    
            if (response[0].statusCode >= 400) {
                throw new Error('Failed to send email notification', response);
            }
        }
    }

    emailBody(kpIndex) {
        const REALTIME_IMAGE = 'https://www.sgo.fi/Data/RealTime/Kuvat/skyi_SOD_latest.jpg';
        const nowGMT = new Date().toGMTString();
        return `
<p>Hey!</p>
<p>There is high probability of aurora borealis visible, check your forecast!</p>
<p>Kp-index is ${kpIndex} at ${nowGMT}</p>
<p>Best,</p>
<p>Aurora Borealis Notifier</p>
<img src="${REALTIME_IMAGE}" width="300" alt="Aurora Borealis" />
        `;
    }
}

module.exports = { EmailNotificationStrategy };
