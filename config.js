const fs = require('fs');

function configure() {
    if (getEnvVarOrDefault('NODE_ENV', 'development') !== 'production') {
        loadDotEnv();
    }

    return {
        sendgridApiKey: getEnvVarOrThrow('SENDGRID_API_KEY'),
        mailTo: getEnvVarOrThrow('MAIL_TO'),
        mailFrom: getEnvVarOrThrow('MAIL_FROM'),
        telegramBotApiToken: getEnvVarOrThrow('TELEGRAM_BOT_API_TOKEN'),
        telegramChannelId: getEnvVarOrThrow('TELEGRAM_CHANNEL_NAME'),
    };
}

function getEnvVarOrThrow(key) {
    const variable = process.env[key];

    if (!variable) {
        throw new Error(`Env is missing the following var: ${key}`);
    }

    return variable;
}

function getEnvVarOrDefault(key, defaultValue) {
    const variable = process.env[key];

    return variable ?? defaultValue;
}

function loadDotEnv() {
    const path = __dirname + '/.env';

    if (!fs.existsSync(path)) {
        throw new Error(`Dotenv doesn't exist at ${path}`)
    }

    const dotenv = fs
        .readFileSync(path, { encoding: 'utf8', flag: 'r' })
        .split('\n')
        .filter(kv => kv.length > 0)
        .map(kv => {
            const [k, v] = kv.split('=');
            return [k, v];
        });

    for (const [k, v] of dotenv) {
        process.env[k] = v;
    }
}

module.exports = { configure };
