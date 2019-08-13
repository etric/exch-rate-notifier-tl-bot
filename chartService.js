'use strict';

const node_echarts = require('node-echarts');
const logger = require('./logService');
const moment = require('moment-timezone');

let renderChart = (records, cb) => {
    let minRate = +999999, maxRate = -1;
    let normalizedData = records.map(x => {
        let rate = +x['usd']['sell'];
        if (rate < minRate) {
            minRate = rate;
        }
        if (rate > maxRate) {
            maxRate = rate;
        }
        return {
            value: [x['time'], rate]
        };
    });

    let option = {
        calculable : true,
        xAxis: {
            type: 'time',
            axisLabel: {
                formatter: (function(value){
                    return moment(value).tz('Europe/Kiev').format('HH:mm');
                }),
                boundaryGap: false
            },
            // data: times
        },
        yAxis: {
            type: 'value',
            min: minRate - 0.1,
            max: maxRate + 0.1,
        },
        series: [{
            data: normalizedData,
            type: 'line',
            // smooth: true,
            // hoverAnimation: false,
            showSymbol: false
        }]
    };

    const config = {
        width: 500, // Image width, type is number.
        height: 500, // Image height, type is number.
        option, // Echarts configuration, type is Object.
        enableAutoDispose: true  //Enable auto-dispose echarts after the image is created.
    };

    cb(node_echarts(config), null);
};

module.exports = {
    renderChart
};
