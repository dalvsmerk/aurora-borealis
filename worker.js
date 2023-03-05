// 5 */3 * * *

const sendgrid = require('@sendgrid/mail');
const { configure } = require('./config');
const { EmailNotificationStrategy } = require('./notifications/emaill-notification-strategy');
const { Notifier } = require('./notifications/notifier');
const { TelegramNotificationStrategy } = require('./notifications/telegram-notification-strategy');
const logger = createLogger();

init();

async function init() {
    let config;

    try {
        config = configure();
        sendgrid.setApiKey(config.sendgridApiKey);
    } catch (error) {
        logger.error('Aurora Borealis failed to start', error.message);

        process.exit(1);
    }

    logger.info('Aurora Borealis started successfully');

    const telegramApi = createTelegramApi(config);

    const envelop = { 
        to: config.mailTo,
        from: config.mailFrom,
    };
    const notifier = new Notifier([
        new EmailNotificationStrategy({ 
            mailClient: sendgrid, 
            envelop,
        }),
        new TelegramNotificationStrategy({ telegramApi }),
    ]);

    try {
        const lastDatapoint = await fetchLastKpIndex();

        if (shouldNotify(lastDatapoint)) {
            const { kpIndex } =  lastDatapoint;
            
            await notifier.notify({ kpIndex });
        }
    } catch (error) {
        logger.info('Failed to check Kp-index:', error);

        process.exit(1);
    }
}

function shouldNotify(datapoint) {
    const MINOR_GEOMAGNETIC_STORM = 5;

    return datapoint.kpIndex >= MINOR_GEOMAGNETIC_STORM;
}

async function fetchLastKpIndex() {
    /**
     * Latest Kp index data
     * This data is updated each 3 hours GMT starting from midnight,
     * i.e. 00:00, 03:00, 06:00, 09:00 etc
     */
    const NOAA_PLANETARY_K_INDEX = 
        'https://services.swpc.noaa.gov/products/noaa-planetary-k-index.json';

    // [["time_tag", "Kp", "a_running", "station_count"]]
    const response = await fetch(NOAA_PLANETARY_K_INDEX);
    const kpIndexData = await response.json();

    if (kpIndexData.length < 2) {
        throw new Error(`No data available: ${kpIndexData}`);
    }

    const lastMeasurement = kpIndexData.slice(-1)[0];

    return parseNOAADataPoint(lastMeasurement);
}

function parseNOAADataPoint(noaaDatapoint) {
    if (!noaaDatapoint || noaaDatapoint.length !== 4) {
        throw new Error(`Data point format is unexpected: ${noaaDatapoint}`);
    }

    return {
        time: noaaDatapoint[0],
        kpIndex: Number(noaaDatapoint[1]),
    };
}

function createTelegramApi(config) {
    const base = `https://api.telegram.org/bot${config.telegramBotApiToken}`;

    return {
        sendMessage: async (text) => {
            const encodedText = encodeURIComponent(text);
            const url = base + `/sendMessage?chat_id=${config.telegramChannelId}&text=${encodedText}`;
            
            try {
                const response = await fetch(url);
                const result = await response.json();

                if (!result.ok) {
                    throw result;
                }

                logger.info('Successfully sent Telegram message');
            } catch (error) {
                logger.error('Failed to send Telegram message', error);
            }
        },
    }
}

function createLogger() {
    return {
        info: (...args) => console.info('[aurora-borealis-info]', ...args),
        error: (...args) => console.error('[aurora-borealis-error]', ...args),
    };
}
