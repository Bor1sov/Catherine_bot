// Переменные
const TelegramBot = require('node-telegram-bot-api');
const TOKEN = '7780623829:AAFd4OGIvEjV9Pbr1_rGvQVGBFdc4b4vZ4c';
const bot = new TelegramBot(TOKEN, { polling: true });
module.exports.bot = bot;
const storage = require('./services/jsonStorage');
const scheduler = require('./services/scheduler');
const dateUtils = require('./utils/date');

// Действия при перезагрузке

bot.sendMessage(625281378, 'Выполнена перезагрузка, жду дальнейших указаний!');
console.log('I AM ALIVE!');
scheduler.start();


// Проверка работы, базовый функционал

// bot.on('message', msg => {
//     const { id } = msg.chat;
//     const { text } = msg.chat;
//     const messageText = text.toLowerCase();
//     if (messageText == 'всё работает?') {
//         bot.sendMessage(id, 'Всё работает отлично!');
//     }
//     if (messageText == 'как дела?') {
//         bot.sendMessage(id, 'Всё хорошо, а у вас?');
//     }
// });

///////////////////////////////////////////////////////////////////// Планировщик ////////////////////////////////////////////////////////////////

// Обработчики команд
bot.onText('напомни', async (msg) => {
    const chatId = msg.chat.id;
    
    try {
        // Запрашиваем дату
        const sentMsg = await bot.sendMessage(chatId, 'Введите дату уведомления в формате ДД.ММ.ГГГГ:', {
            reply_markup: { force_reply: true }
        });

        // Ожидаем ответ с датой
        const dateMsg = await new Promise((resolve) => {
            bot.onReplyToMessage(chatId, sentMsg.message_id, resolve);
        });

        const dateText = dateMsg.text;

        if (!dateUtils.isValidDate(dateText)) {
            return bot.sendMessage(chatId, 'Неверный формат даты. Используйте ДД.ММ.ГГГГ');
        }

        if (!dateUtils.isFutureDate(dateText)) {
            return bot.sendMessage(chatId, 'Прошлое не изменить (пока-что)');
        }

        // Запрашиваем текст напоминания
        const sentMsg2 = await bot.sendMessage(chatId, 'Введите текст уведомления:', {
            reply_markup: { force_reply: true }
        });

        // Ожидаем ответ с текстом
        const textMsg = await new Promise((resolve) => {
            bot.onReplyToMessage(chatId, sentMsg2.message_id, resolve);
        });

        // Сохраняем напоминание
        await storage.addNotification(chatId, dateText, textMsg.text);
        scheduler.start();
        await bot.sendMessage(chatId, `Уведомление на ${dateText} установлено!`);
        
    } catch (error) {
        console.error('Error saving notification:', error);
        bot.sendMessage(chatId, 'Произошла ошибка при сохранении уведомления');
    }
});

bot.onText('что нужно не забыть?', async (msg) => {
  const chatId = msg.chat.id;
  
  try {
    const userNotifications = await storage.getUserNotifications(chatId);
    
    if (userNotifications.length === 0) {
      return bot.sendMessage(chatId, 'У вас нет активных уведомлений.');
    }
    
    let message = 'Ваши уведомления:\n\n';
    userNotifications.forEach((n, i) => {
      message += `${i+1}. ${dateUtils.formatDate(n.date)} - ${n.text}\n`;
    });
    
    bot.sendMessage(chatId, message);
  } catch (error) {
    console.error('Error getting notifications:', error);
    bot.sendMessage(chatId, 'Произошла ошибка при получении уведомлений');
  }
});