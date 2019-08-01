'use strict';

const cheerio = require('cheerio');
const https = require('https');
const dbService = require('./dbService');
const logger = require('./logService');
const utils = require('./utils');

let parseExchangeRates = (html) => {
    const $ = cheerio.load(html);
    let usdMiniaylo = $('a[data-gtm-ea="miniaylo-usd-button"] .fua-xrates__index');

    let usdBuy = $(usdMiniaylo[0]).text();
    let usdBuyTrend = $(usdMiniaylo[0]).find('.fua-xrates__progress svg').hasClass("fua-arrow__down") ? 'down' : 'up';

    let usdSell = $(usdMiniaylo[1]).text();
    let usdSellTrend = $(usdMiniaylo[1]).find('.fua-xrates__progress svg').hasClass("fua-arrow__down") ? 'down' : 'up';

    return {
        time: new Date(),
        usd: {
            sell: usdSell,
            sellTrend: usdSellTrend,
            buy: usdBuy,
            buyTrend: usdBuyTrend
        }
    };
};

let checkForUpdates = (cb) => {
    return https.get('https://finance.ua/', (res) => {
        let fullHtml = '';
        res.on('data', data => fullHtml += data.toString());
        res.on('end', () => {
            let newRecord = parseExchangeRates(fullHtml);
            if (utils.hasNoValues(newRecord)) {
                logger.debug('No exchange rates data. Skipping...');
                return cb({ changed: false });
            }

            //TODO handle if db is empty
            return dbService.findLast((err, currLast) => {
                if (!!err) {
                    logger.error(`Failed fetching last record ${err.toString()}`);
                    return cb({ error: err });
                }

                if (utils.isRecordsEqual(currLast, newRecord)) {
                    logger.debug('Exchange rates haven\'t changed');
                    return cb({ changed: false });
                }

                if (!utils.isRecordNewer(currLast, newRecord)) {
                    logger.debug('Received stale data (probably from cache)');
                    return cb({ changed: false });
                }

                try {
                    dbService.insertRecord(newRecord);
                    logger.info(`Exchange rates changed! Inserted new record ${JSON.stringify(newRecord)}`);
                    return cb({ data: newRecord, changed: true });
                }
                catch (e) {
                    logger.error(`Failed inserting new record ${JSON.stringify(newRecord)}\nREASON: ${e.toString()}`);
                    return cb({ error: e, data: newRecord, changed: true });
                }
            });
        });
    });
};

module.exports = {
    checkForUpdates
};
