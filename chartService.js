'use strict';

const moment = require('moment-timezone');
const chartExporter = require("highcharts-export-server");
chartExporter.initPool();

const zone = moment.tz.zone('Europe/Kiev');

const chartDetails = (chartData) => {
    return {
        type: "png",
        options: {
            chart: {
                type: "area",
            },
            time: {
                timezoneOffset: zone.parse(new Date())
            },
            title: {
                text: ''
            },
            xAxis: {
                type: 'datetime',
            },
            yAxis: {
                title: {
                    text: ''
                }
                // tickInterval: 0.1,
                // showFirstLabel: true,
                // showLastLabel: true,
            },
            legend: {
                enabled: false
            },
            plotOptions: {
                area: {
                    fillColor: {
                        linearGradient: {x1: 0, y1: 0, x2: 0, y2: 1},
                        stops: [[0, '#2f7ed8'], [1, '#77a1e5']]
                    },
                    lineWidth: 1,
                    threshold: null
                }
            },
            series: [{
                type: 'area',
                name: '',
                data: chartData
            }]
        }
    }
};

let renderChart = (records, cb) => {
    let normalizedData = records.map(x => {
        return [x['time'], +x['usd']['sell']];
    });
    chartExporter.export(chartDetails(normalizedData), (err, res) => {
        if (err) {
            console.log("ERROR during chart rendering: " + err);
        }
        cb(Buffer.from(res.data, 'base64'), err);
        // // Get the image data (base64)
        // let imageb64 = res.data;
        // // Filename of the output
        // let outputFile = "bar.png";
        // // Save the image to file
        // fs.writeFileSync(outputFile, imageb64, "base64", function(err) {
        //     if (err) console.log(err);
        // });
        // console.log("Saved image!");
        // // chartExporter.killPool();
    });
};

module.exports = {
    renderChart
};
