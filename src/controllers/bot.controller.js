const TelegramBot = require('node-telegram-bot-api');
const GPTService = require('../services/gpt.service');
const config = require('../../config');

class BotController {
  constructor() {
    this.bot = new TelegramBot(config.telegram.token, { polling: true });
    this.gpt = new GPTService();
    this.setupHandlers();
  }

  setupHandlers() {
    this.bot.onText(/\/ask (.+)/, async (msg, match) => {
      const chatId = msg.chat.id;
      const prompt = match[1];
      
      this.bot.sendChatAction(chatId, 'typing');
      const response = await this.gpt.generateResponse(prompt);
      this.bot.sendMessage(chatId, response);
    });

    this.bot.on('message', (msg) => {
      if (msg.text === '/start') {
        this.bot.sendMessage(msg.chat.id, 'Welcome! Use /ask or /remind');
      }
    });
  }
}

module.exports = BotController;