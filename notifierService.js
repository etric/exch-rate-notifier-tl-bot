'use strict';

const cheerio = require('cheerio');
const https = require('https');
const dbService = require('./dbService');
const logger = require('./logService');
const utils = require('./utils');

let parseExchangeRates = (html) => {
    const $ = cheerio.load(html);
    let usdMiniayloData = $('a[data-gtm-ea="miniaylo-$-button"] .fua-xrates__value');

    let usdBuyNode = $(usdMiniayloData[0]);
    let usdBuyValue = usdBuyNode.contents().get(0).nodeValue.trim();
    let usdBuyTrend = usdBuyNode.find('.fua-xrates__progress').hasClass('fua-down') ? 'down' : 'up';

    let usdSellNode = $(usdMiniayloData[1]);
    let usdSellValue = usdSellNode.contents().get(0).nodeValue.trim();
    let usdSellTrend = usdSellNode.find('.fua-xrates__progress').hasClass('fua-down') ? 'down' : 'up';

    return {
        time: new Date().getTime(),
        usd: {
            sell: usdSellValue,
            sellTrend: usdSellTrend,
            buy: usdBuyValue,
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
