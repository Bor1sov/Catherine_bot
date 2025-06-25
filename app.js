const express = require('express');
const BotController = require('./controllers/bot.controller');
const config = require('./config');



class App {
    constructor() {
        this.app = express();
        this.port = config.server.port;
        this.bot = new BotController();
    }

    start() {

        this.app.listen(this.port, () => {
            console.log('I AM ALIVE!')
        });
    }
}

const application = new App();
application.start();

