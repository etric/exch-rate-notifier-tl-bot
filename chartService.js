'use strict';

const moment = require('moment-timezone');

let renderChart = (records, cb) => {
    let rates = [], times = [], minRate = +999999, maxRate = -1, i = 0;
    records.forEach(x => {
        let rate = +x['usd']['sell'];
        minRate = Math.min(rate, minRate);
        maxRate = Math.max(rate, maxRate);
        rates.push(rate);
        if (i++ % 5 === 0) {
            times.push(moment(x['time']).tz('Europe/Kiev').format('HH:mm'));
        } else {
            times.push('');
        }
    });

    let loBoundary = minRate - 0.2;
    loBoundary = loBoundary.toFixed(2);
    let hiBoundary = maxRate + 0.2;
    hiBoundary = hiBoundary.toFixed(2);

    let url = "https://image-charts.com/chart?chs=700x200&chd=a:" + rates.join(",")
        + "&cht=lc&chxl=0:|" + times.join("|") + "&chxt=x,y&chxr=1," + loBoundary + "," + hiBoundary + "&chls=3.0";

    cb(url, null);
};

module.exports = {
    renderChart
};
