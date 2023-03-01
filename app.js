const sendgrid = require('@sendgrid/mail');
const { configure } = require('./config');

const REALTIME_IMAGE = 'https://www.sgo.fi/Data/RealTime/Kuvat/skyi_SOD_latest.jpg';

init();

async function init() {
    let config;

    try {
        config = configure();
        sendgrid.setApiKey(config.sendgridApiKey);
    } catch (error) {
        console.error('Aurora Borealis failed to start', error.message);

        process.exit(1);
    }

    try {
        const lastDatapoint = await fetchLastKpIndex();

        if (shouldNotify(lastDatapoint)) {
            sendEmailNotification(sendgrid, config);
        }
    } catch (error) {
        console.log('Failed to fetch last Kp-index data', error);

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
        kpIndex: noaaDatapoint[1], 
    };
}

async function sendEmailNotification(mailClient, config) {
    const message = { 
        to: config.mailTo,
        from: config.mailFrom,
        subject: 'Aurora Borealis notification',
        html: emailBody(),
    };

    try {
        const response = await mailClient.send(message);

        if (response[0].statusCode < 400) {
            console.info('Email notification is sent successfully!');
        } else {
            console.error('Failed to send email notification', response);
        }

    } catch (error) {
        console.error('Failed to send email notification', error.message);
    }
}
