// 5 */3 * * *

const sendgrid = require('@sendgrid/mail');
const { configure } = require('./config');
const logger = createLogger();

const REALTIME_IMAGE = 'https://www.sgo.fi/Data/RealTime/Kuvat/skyi_SOD_latest.jpg';

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

    try {
        const lastDatapoint = await fetchLastKpIndex();

        if (shouldNotify(lastDatapoint)) {
            await sendEmailNotification(sendgrid, config, lastDatapoint.kpIndex);
            await sendTelegramNotification(telegramApi, lastDatapoint.kpIndex);
        }
    } catch (error) {
        logger.info('Failed to fetch last Kp-index data', error);

        process.exit(1);
    }
}

function emailBody(kpIndex) {
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

async function sendEmailNotification(mailClient, config, kpIndex) {
    const RECEIVER_DELIMITER = ',';
    const receivers = config.mailTo.split(RECEIVER_DELIMITER);

    try {
        for (const receiver of receivers) {
            const message = { 
                to: receiver,
                from: config.mailFrom,
                subject: 'Aurora Borealis notification',
                html: emailBody(kpIndex),
            };
    
            const response = await mailClient.send(message);
    
            if (response[0].statusCode < 400) {
                logger.info('Email notification is sent successfully!');
            } else {
                logger.error('Failed to send email notification', response);
            }
        }
    } catch (error) {
        logger.error('Failed to send email notification', response);
    }
}

async function sendTelegramNotification(telegramApi, kpIndex) {
    const message = `
Check your forecast, there is a high chance of seeing northern light!
Kp-index is ${kpIndex}.
    `;

    await telegramApi.sendMessage(message);
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
