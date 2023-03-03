// 5 */3 * * *

const { Console } = require('console');
const fs = require('fs');
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

    logger.info('Aurora Borealis started successfully')

    try {
        const lastDatapoint = await fetchLastKpIndex();

        if (shouldNotify(lastDatapoint)) {
            sendEmailNotification(sendgrid, config);
        }
    } catch (error) {
        logger.info('Failed to fetch last Kp-index data', error);

        process.exit(1);
    }
}

function emailBody() {
    const nowGMT = new Date().toGMTString();
    return `
<p>Hey!</p>
<p>There is high probability of aurora borealis visible, check your forecast!</p>
<p>Best regards,</p>
<p>Aurora Borealis Notifier</p>
<p>${nowGMT}</p>
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

async function sendEmailNotification(mailClient, config) {
    try {
        const RECEIVER_DELIMITER = ',';
        const receivers = config.mailTo.split(RECEIVER_DELIMITER);

        for (const receiver of receivers) {
            const message = { 
                to: receiver,
                from: config.mailFrom,
                subject: 'Aurora Borealis notification',
                html: emailBody(),
            };
    
            const response = await mailClient.send(message);
    
            if (response[0].statusCode < 400) {
                logger.info('Email notification is sent successfully!');
            } else {
                logger.error('Failed to send email notification', response);
            }
        }

    } catch (error) {
        logger.error('Failed to send email notification', error.message);
    }
}

function createLogger() {
    const output = fs.createWriteStream('/var/log/cron.log');
    const errorOutput = fs.createWriteStream('/var/log/cron.log');

    const logger = new Console({ stdout: output, stderr: errorOutput });

    return {
        info: (...args) => logger.info('[aurora-borealis-info]', ...args),
        error: (...args) => logger.error('[aurora-borealis-error]', ...args),
    };
}
