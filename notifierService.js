'use strict';

const parse = require('node-html-parser').parse;
const https = require('https');
const dbService = require('./dbService');
const logger = require('./logService');

let parseExchangeRates = (html) => {
    const root = parse(html);
    let subRoot = root.querySelector('.b-table-currency');
    let title = subRoot.querySelector('h2 a').text;
    let timestamp = subRoot.querySelector('.timestamp').text;
    let data = subRoot.querySelectorAll("#table-currency-tab0 tr td").map(e => e.text);
    let trend = subRoot.querySelectorAll("#table-currency-tab0 tr i").map(e => e.classNames[0]);

    let [usdCurr, usdBuy, usdSell, eurCurr, eurBuy, eurSell, rubCurr, rubBuy, rubSell] = data;
    let [usdBuyTrend, usdSellTrend, eurBuyTrend, eurSellTrend, rubBuyTrend, rubSellTrend] = trend;

    // logger.debug(title);
    // logger.debug(timestamp);
    // logger.debug(time);
    // logger.debug(usdCurr);
    // logger.debug(usdBuy);
    // logger.debug(usdSell);

    // logger.debug(usdBuyTrend);
    // logger.debug(usdSellTrend);
    // logger.debug(eurBuyTrend);
    // logger.debug(eurSellTrend);
    // logger.debug(rubBuyTrend);
    // logger.debug(rubSellTrend);

    return {
        time: timestamp,
        usd: {
            sell: usdSell,
            sellTrend: usdSellTrend,
            buy: usdBuy,
            buyTrend: usdBuyTrend
        }
    };
};

let isDataEqual = (oldObj, newObj) => {
    if (!oldObj)
        return false;
    if (!newObj) {
        console.error('New object is null/empty. Skipping update');
        return true;
    }

    // logger.debug('Comparing\n' + JSON.stringify(oldObj) + '\nand\n' + JSON.stringify(newObj) + '\n');

    if (oldObj.usd.sell !== newObj.usd.sell)
        return false;
    if (oldObj.usd.buy !== newObj.usd.buy)
        return false;

    return true;
};

// cb = function(data)
let checkForUpdates = (cb) => {
    return https.get('https://finance.ua/ru/', (res) => {
        let fullHtml = '';
        res.on('data', data => fullHtml += data.toString());
        res.on('end', () => {
            let newRecord = parseExchangeRates(fullHtml);

            return dbService.findLast((err, currLast) => {
                if (err) {
                    logger.error(`Failed fetching last record ${err.toString()}`);
                    return cb({
                        error: err,
                        data: newRecord,
                        changed: false
                    });
                }

                if (isDataEqual(currLast, newRecord)) {
                    // logger.debug('Nothing changed..');
                    return cb({
                        data: newRecord,
                        changed: false
                    });
                }

                try {
                    dbService.insertRecord(newRecord).then(() => {
                        logger.info(`Exchange rates changed! Inserted new record ${JSON.stringify(newRecord)}`);
                    });
                    return cb({
                        data: newRecord,
                        changed: true
                    });
                } catch (e) {
                    logger.error(`Failed inserting new record ${JSON.stringify(newRecord)}\nREASON: ${e.toString()}`);
                    return cb({
                        error: e,
                        data: newRecord,
                        changed: true
                    });
                }
            });
        });
    });
};

module.exports = {
    checkForUpdates
};