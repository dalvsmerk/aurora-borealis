class Notifier {
    constructor(strategies) {
        if (!strategies.length) {
            throw new Error('No notification strategy specified');
        }

        this.strategies = strategies;
    }

    async notify({ kpIndex }) {
        const errors = [];

        for (const strategy of this.strategies) {
            try {
                await strategy.execute({ kpIndex });
            } catch (error) {
                errors.push(error);
            }
        }

        if (errors.length > 0) {
            throw new Error('Failed to execute notifications:', errors);
        }
    }
}

module.exports = { Notifier };
