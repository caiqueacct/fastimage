var log4js = require("log4js");
var logger = log4js.getLogger();

const config = require('config');
logger.level = config.app.logger

class CommonObject {

    constructor() {
        this.logger = logger;
        this.config = config;
    }

}

module.exports = CommonObject