const TelegramBot = require('node-telegram-bot-api');
const config = require('../../config');

const bot = new TelegramBot(config.telegram.token, { polling: true });

// Инициализация основных обработчиков
bot.on('message', (msg) => {
  if (msg.text === '/start') {
    bot.sendMessage(msg.chat.id, 'Бот запущен! Используйте /напомни');
  }
});

module.exports = bot;