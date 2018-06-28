'use strict';

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
        return dbService.getUserChats(chats => chats.forEach(chatId => {
            if (!!result.error) {
                return bot.telegram.sendMessage(chatId, 'ERROR: ' + result.error);
            }
            if (result.changed) {
                return bot.telegram.sendMessage(chatId, utils.renderResponse(result.data), {parse_mode: 'HTML'});
            }
        }));
    })
};

const bot = new Telegraf(process.env.BOT_TOKEN);

bot.start((ctx) =>
    dbService.saveUserChat(ctx.chat.id, (inserted, text) => ctx.reply(text))
);

bot.command('remove', (ctx) =>
    dbService.removeUserChat(ctx.chat.id, (text, err) => ctx.reply(text))
);

bot.command('last', (ctx) =>
    dbService.findLast((err, last) => ctx.replyWithHTML(utils.renderResponse(last, err)))
);

bot.startPolling();

utils.startDummyServer();
process.on('SIGINT', utils.cleanUp);
process.on('SIGTERM', utils.cleanUp);

utils.startScheduledJob(doJob);