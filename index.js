'use strict';

const Markup = require("telegraf/markup");
const Extra = require("telegraf/extra");

const Telegraf = require('telegraf');
const notifierService = require('./notifierService');
const dbService = require('./dbService');
const logger = require('./logService');
const utils = require('./utils');


let doJob = () => {
    if (!dbService.checkDbReady()) {
        return logger.warn("DB is not initialized yet");
    }
    return notifierService.checkForUpdates(result => {
        if (!result.changed) {
            return;
        }
        return dbService.getUserChats(chats => chats.forEach(chatId => {
            if (!!result.error) {
                return bot.telegram.sendMessage(chatId, 'ERROR: ' + result.error);
            }
            return bot.telegram.sendMessage(chatId, utils.renderResponse(result.data), {parse_mode: 'HTML'});
        }));
    })
};

const bot = new Telegraf(process.env.BOT_TOKEN);

let kbMenu = () =>
    Markup.keyboard([ ['Subscribe', 'Unsubscribe'], ['Last exchange rates'] ]).resize();

bot.start(ctx =>
    ctx.replyWithHTML('<b>WELCOME</b>\nMake your choice if you are not subscribed yet', Extra.markup(kbMenu))
);

bot.hears('Subscribe', ctx =>
    dbService.saveUserChat(ctx.chat.id, (inserted, text) => ctx.reply(text, Extra.markup(kbMenu)))
);

bot.hears('Unsubscribe', ctx =>
    dbService.removeUserChat(ctx.chat.id, (text, err) => ctx.reply(text, Extra.markup(kbMenu)))
);

bot.hears('Last exchange rates', ctx =>
    dbService.findLast((err, last) => ctx.replyWithHTML(utils.renderResponse(last, err), Extra.markup(kbMenu)))
);

bot.startPolling();

utils.startDummyServer();
process.on('SIGINT', utils.cleanUp);
process.on('SIGTERM', utils.cleanUp);

utils.startScheduledJob(doJob);