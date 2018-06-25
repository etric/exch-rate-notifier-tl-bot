'use strict';

let fmtTime = () => (new Date()).toLocaleString();

module.exports = {
    warn: (msg) => console.log(`\x1b[36m[${fmtTime()}] [WARN] main - ${msg}\x1b[0m`),
    info: (msg) => console.log(`\x1b[32m[${fmtTime()}] [INFO] main - ${msg}\x1b[0m`),
    debug: (msg) => console.log(`\x1b[37m[${fmtTime()}] [DEBUG] main - ${msg}\x1b[0m`),
    error: (msg) => console.log(`\x1b[31m[${fmtTime()}] [ERROR] main - ${msg}\x1b[0m`)
};