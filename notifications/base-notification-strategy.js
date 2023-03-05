class BaseNotificationStrategy {
    async execute({ kpIndex }) {
        throw new Error('Not implemented');
    }
}

module.exports = { BaseNotificationStrategy };
