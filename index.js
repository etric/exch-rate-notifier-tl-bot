'use strict';

const Telegraf = require('telegraf');
const notifierService = require('./notifierService');
const dbService = require('./dbService');
const logger = require('./logService');
const http = require('http');

const POLL_FREQ_SECS = process.env.POLL_FREQ_SECS;
logger.info(`Data source POLL frequency is ${POLL_FREQ_SECS} seconds`);

const bot = new Telegraf(process.env.BOT_TOKEN);

let trendSign = (val) => {
    let up = '&#9650;';
    let down = '&#9660;';
    return val === 'up' ? up : down;
};

let renderResponse = (data) => {
    let usdTrend;
    switch (data.usd.sellTrend) {
        case 'up':
            usdTrend = "😟 BAD TIMES TO BUY USD 😟";
            break;
        case 'down':
            usdTrend = "🎉 GOOD TIMES TO BUY USD 🎉";
            break;
        default:
            usdTrend = 'UNKNOWN TREND';
            break;
    }

    let usdSellTrend = trendSign(data.usd.sellTrend);
    let usdBuyTrend = trendSign(data.usd.buyTrend);

    let text = `${usdTrend} \n\n`;
    text += `${data.time} \n`;
    text += `             <b>BUY</b>             <b>SELL</b> \n`;
    text += `<b>USD</b>    ${data.usd.buy + usdBuyTrend}   ${data.usd.sell + usdSellTrend}`;
    return text;
};

let scheduledJob = () => {
    if (!dbService.checkDbReady()) {
        return logger.warn("DB is not initialized yet");
    }
    notifierService.checkForUpdates(result => {
        dbService.getUserChats(chats => {
            chats.forEach(chatId => {
                if (result.changed) {
                    return bot.telegram.sendMessage(chatId, renderResponse(result.data), {parse_mode: 'HTML'})
                }
            })
        });
    });
};

bot.start((ctx) => dbService.saveUserChat(ctx.chat.id, (inserted, text) => ctx.reply(text)));

bot.command('remove', (ctx) => {
    let chatId = ctx.chat.id;
    return dbService.removeUserChat(chatId, (removed) => {
        let text;
        if (removed) {
            text = `Chat ${chatId} un-subscribed from updates!`;
        } else {
            text = `Chat ${chatId} is NOT un-subscribed from updates.`;
        }
        return ctx.reply(text);
    });
});

bot.command('last', ctx => {
    return notifierService.checkForUpdates(result =>
        dbService.getUserChats(chats => {
            chats.forEach(chatId => {
                return bot.telegram.sendMessage(chatId, renderResponse(result.data), {parse_mode: 'HTML'})
            })
        })
    );
});

bot.startPolling();
setInterval(scheduledJob, POLL_FREQ_SECS * 1000);

http.createServer(function (req, res) {
    res.writeHead(200, {'Content-Type': 'text/plain'});
    res.end('Hello World!');
}).listen(8080);


let cleanUp = () => {
    logger.info("Closing DB connection");
    dbService.closeDb(() => {
        process.exit(0);
    });
};
process.on('SIGINT', cleanUp);
process.on('SIGTERM', cleanUp);