'use strict';

require('dotenv').config();
const http = require('http');
const os = require('os');
const logger = require('./logService');
const dbService = require('./dbService');
const moment = require('moment-timezone');
const PORT = process.env.PORT || 5000;

let startDummyServer = () => {
    http.createServer((req, res) => {
        res.writeHead(200, {'Content-Type': 'text/plain'});
        res.end('Hello World!');
    }).listen(PORT, () => logger.info(`Starting http server on port ${ PORT }`));
};

let trendSign = val =>
    (val === 'up') ? '&#9650;' : '&#9660;';

// let osInfo = () =>
//     'hostname = ' + os.hostname() +
//     '; arch = ' + os.arch() +
//     '; platform = ' + os.platform() +
//     '; userInfo = ' + JSON.stringify(os.userInfo());

let cleanUp = () => {
    logger.info("Closing DB connection");
    dbService.closeDb(() => process.exit(0));
};

let startScheduledJob = (job, jobName, timeoutSec) => {
    logger.info(`Job [${jobName}] scheduled with timeout ${timeoutSec} seconds`);

    (function runScheduledJob() {
        job();
        setTimeout(runScheduledJob, timeoutSec * 1000);
    })();
};

let renderResponse = (data, err) => {
    if (!!err) {
        return `<b>ERROR:</b> ${err.toString()}`;
    }

    if (!data) {
        return `No data yet... wait until next update`;
    }

    // let usdSellTrend = trendSign(data.usd.sellTrend);
    // let usdBuyTrend = trendSign(data.usd.buyTrend);

    let text = `<b>${data.usd.sell + trendSign(data.usd.sellTrend)}</b>   USD/SELL   ${moment(data.time).tz('Europe/Kiev').format('LT')}`;
    // text += `\n\n<i>DEBUG INFO:\n${osInfo()}</i>`;
    return text;
};

let hasNoValues = (data) => {
    let val1 = parseFloat(data.usd.sell);
    let val2 = parseFloat(data.usd.buy);
    return isNaN(val1) || isNaN(val2);
};

let isRecordsEqual = (oldObj, newObj) => {
    if (!oldObj) return false;
    if (!newObj) return true;

    if (oldObj.usd.sell.slice(0, -2) !== newObj.usd.sell.slice(0, -2))
        return false;
    // if (oldObj.usd.buy !== newObj.usd.buy)
    //     return false;

    return true;
};

let parseTime = (timeField) =>
    moment(timeField.slice(0, 5), 'HH:mm').valueOf();

let isRecordNewer = (oldObj, newObj) => {
    if (!oldObj && !!newObj) return true;

    return newObj.time > oldObj.time;
};

module.exports = {
    renderResponse, startDummyServer, startScheduledJob, cleanUp, hasNoValues, isRecordNewer, isRecordsEqual, parseTime
};
