'use strict';

const mongoDb = require('mongodb');
const logger = require('./logService');
const dbUser = process.env.DB_USER;
const dbPass = process.env.DB_PASS;
const url = `mongodb://${dbUser}:${dbPass}@ds161700.mlab.com:61700/exchange_rates_tracker`;

let dbObj;
let dbCtrl;

let checkDbReady = () => {
    if (!dbObj)
        logger.warn('DB is not ready yet!');
    return !!dbObj;
};

let closeDb = (cb) =>
    dbCtrl.close(cb);

let insertRecord = (o) => {
    return !checkDbReady() || dbObj.collection('records').insertOne(o, (err) => {
        if (err) {
            logger.error(`Failed inserting new data ${JSON.stringify(o)}: ${err}`);
        } else {
            logger.info(`New data ${JSON.stringify(o)} inserted`);
        }
    });
};
let findLast = (cb) => {
    return !checkDbReady() || dbObj.collection('records').find().sort({'_id': -1}).limit(1).toArray((err, arr) => {
        return cb(err, arr[0]);
    });
};
let saveUserChat = (chatId, cb) => {
    return !checkDbReady() || dbObj.collection('chats').find({chatId}).count().then(itemsCount => {
        if (itemsCount > 0) {
            let text = `Chat ${chatId} record already exists. Ignoring..`;
            logger.debug(text);
            return cb(false, text);
        } else {
            return dbObj.collection('chats').insertOne({chatId}, (err) => {
                if (err) {
                    let text = `Failed inserting chat ${chatId} record`;
                    logger.error(text + ': ' + err);
                    return cb(false, text);
                } else {
                    let text = `Chat ${chatId} record inserted`;
                    logger.info(text);
                    return cb(true, text);
                }
            });
        }
    });

};
let getUserChats = (cb) => {
    return !checkDbReady() || dbObj.collection('chats').find().toArray((err, arr) => {
        let ids = (arr || []).map(e => e.chatId);
        return cb(ids);
    });
};
let removeUserChat = (chatId, cb) => {
    return !checkDbReady() || dbObj.collection('chats').remove({chatId}, (err) => {
        if (!!err) {
            logger.error(`Failed removing chat ${chatId} record: ${err}`);
            return cb(`Chat ${chatId} is NOT un-subscribed from updates.`, false);
        } else {
            logger.info(`Chat ${chatId} record removed`);
            return cb(`Chat ${chatId} un-subscribed from updates!`, true);
        }
    });
};

module.exports = {
    checkDbReady, insertRecord, findLast, saveUserChat, getUserChats, removeUserChat, closeDb
};

mongoDb.MongoClient.connect(url, (err, _database) => {
    if (err) {
        return logger.error(err);
    }
    dbCtrl = _database;
    dbObj = _database.db('exchange_rates_tracker');
    logger.info('Connected to database "exchange_rates_tracker"');

    dbObj.createCollection('records').then(() => {
        logger.info('Collection "records" is ready');
    });

    dbObj.createCollection('chats').then(() => {
        logger.info('Collection "chats" is ready');
        dbObj.collection('chats').createIndex({"chatId": 1}, {unique: true}).then(() => {
            logger.info('Created index for "chatId" field');
        });
    });
});
