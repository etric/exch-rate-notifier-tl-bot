'use strict';

require('dotenv').config();

const Markup = require("telegraf/markup");
const Extra = require("telegraf/extra");

const Telegraf = require('telegraf');
const notifierService = require('./notifierService');
const dbService = require('./dbService');
const utils = require('./utils');
const logger = require('./logService');
const chartService = require('./chartService');

let chartUrl;

let broadcastUpdate = (result,) => {
    dbService.getUserChats(chats => chats.forEach(chatId => {
        if (!!result.error) {
            return bot.telegram.sendMessage(chatId, 'ERROR: ' + result.error)
                .catch(error => logger.error("Failed sending message: " + error));
        }
        if (chartUrl) {
            bot.telegram.sendPhoto(chatId, chartUrl).then(() =>
                bot.telegram.sendMessage(chatId, utils.renderResponse(result.data), {parse_mode: 'HTML'})
                    .catch(error => logger.error("Failed sending message: " + error)));
        } else {
            bot.telegram.sendMessage(chatId, utils.renderResponse(result.data), {parse_mode: 'HTML'})
                .catch(error => logger.error("Failed sending message: " + error));
        }
    }));
};

let doJob = () => {
    return !dbService.checkDbReady() || notifierService.checkForUpdates(result => {
        if (!result.changed) {
            return;
        }
        dbService.getTodayRecords((err, records) =>
            chartService.renderChart(records, (chart) => {
                chartUrl = chart;
                broadcastUpdate(result);
            }));
    });
};

const bot = new Telegraf(process.env.BOT_TOKEN);

let kbMenu = () =>
    Markup.keyboard([ ['Subscribe', 'Unsubscribe'], ['Last exchange rates'] ]).resize();

bot.start(ctx =>
    ctx.replyWithHTML('<b>WELCOME</b>\nMake your choice if you are not subscribed yet', Extra.markup(kbMenu))
        .catch(error => logger.error(`Failed replying to ${ctx.chat.id}: ${error}`))
);

bot.hears('Subscribe', ctx =>
    dbService.saveUserChat(ctx.chat.id, (inserted, text) =>
        ctx.reply(text, Extra.markup(kbMenu))
            .catch(error => logger.error(`Failed replying to ${ctx.chat.id}: ${error}`))));

bot.hears('Unsubscribe', ctx =>
    dbService.removeUserChat(ctx.chat.id, (text, err) =>
        ctx.reply(text, Extra.markup(kbMenu))
            .catch(error => logger.error(`Failed replying to ${ctx.chat.id}: ${error}`))));

bot.hears('Last exchange rates', ctx =>
    dbService.findLast((err, last) => {
        if (chartUrl) {
            bot.telegram.sendPhoto(ctx.chat.id, chartUrl).then(() =>
                ctx.replyWithHTML(utils.renderResponse(last, err), Extra.markup(kbMenu))
                    .catch(error => logger.error(`Failed replying to ${ctx.chat.id}: ${error}`)));
        } else {
            ctx.replyWithHTML(utils.renderResponse(last, err), Extra.markup(kbMenu))
                .catch(error => logger.error(`Failed replying to ${ctx.chat.id}: ${error}`));
        }
    }));

bot.startPolling();

process.on('SIGINT', utils.cleanUp);
process.on('SIGTERM', utils.cleanUp);

utils.startDummyServer();
utils.startScheduledJob(doJob, 'CHECK UPDATES', process.env.POLL_FREQ_SECS);
