const TelegramBot = require('node-telegram-bot-api');
const cron = require('node-cron');
const moment = require('moment');
const fs = require('fs');
const path = require('path');
const GPTService = require('../services/gpt.service');
const config = require('../config');

// Инициализация хранилища
const DATA_FILE = path.join(__dirname, '../data/notifications.json');

function initStorage() {
  if (!fs.existsSync(path.dirname(DATA_FILE))) {
    fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
  }
  if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(DATA_FILE, JSON.stringify([]));
  }
}

function readNotifications() {
  try {
    return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
  } catch (error) {
    console.error('Ошибка чтения файла:', error);
    return [];
  }
}

function writeNotifications(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

class BotController {
  constructor() {
    this.bot = new TelegramBot(config.telegram.token, { polling: true });
    this.gpt = new GPTService();
    this.scheduledTask = null;
    this.userStates = {};
    
    initStorage();
    this.setupHandlers();
    this.startScheduler();
    
    // Отправляем уведомление о старте
    this.bot.sendMessage(625281378, 'Бот запущен и готов к работе!');
  }

  // Методы для работы с напоминаниями
  addNotification(chatId, date, text) {
    const notifications = readNotifications();
    const newNotification = {
      id: Date.now().toString(),
      chatId,
      date: moment(date, 'DD.MM.YYYY').toISOString(),
      text,
      sent: false,
      createdAt: new Date().toISOString()
    };
    notifications.push(newNotification);
    writeNotifications(notifications);
    return newNotification;
  }

  getUserNotifications(chatId) {
    return readNotifications().filter(n => 
      n.chatId === chatId && !n.sent && moment(n.date).isAfter(moment())
    );
  }

  getPendingNotifications() {
    return readNotifications().filter(n => 
      !n.sent && moment(n.date).isSameOrBefore(moment())
    );
  }

  markAsSent(id) {
    const notifications = readNotifications();
    writeNotifications(notifications.map(n => 
      n.id === id ? {...n, sent: true} : n
    ));
  }

  startScheduler() {
    if (this.scheduledTask) this.scheduledTask.stop();

    this.scheduledTask = cron.schedule('* * * * *', () => {
      this.getPendingNotifications().forEach(notification => {
        this.bot.sendMessage(notification.chatId, `🔔 Напоминание: ${notification.text}`)
          .then(() => this.markAsSent(notification.id))
          .catch(err => console.error('Ошибка отправки:', err));
      });
    });
  }

  setupHandlers() {
    // Обработчик команды /start
    this.bot.onText(/\/start/, (msg) => {
      const chatId = msg.chat.id;
      this.bot.sendMessage(
        chatId,
        '👋 Привет! Я многофункциональный бот с возможностями:\n\n' +
        '🤖 *YandexGPT* - отвечаю на ваши вопросы\n' +
        '⏰ *Напоминания* - создавайте и управляйте напоминаниями\n\n' +
        '📌 Доступные команды:\n' +
        '/help - получить помощь\n' +
        '/set_reminder - создать напоминание\n' +
        '/my_reminders - ваши напоминания',
        { parse_mode: 'Markdown' }
      );
    });

    // Обработчик команды /help
    this.bot.onText(/\/help/, (msg) => {
      const chatId = msg.chat.id;
      this.bot.sendMessage(
        chatId,
        '📖 *Как пользоваться ботом:*\n\n' +
        '1. Просто напишите мне вопрос для получения ответа от YandexGPT\n\n' +
        '2. Для напоминаний:\n' +
        '   - /set_reminder - создать новое\n' +
        '   - /my_reminders - просмотреть активные\n\n' +
        '3. /cancel - отменить текущее действие',
        { parse_mode: 'Markdown' }
      );
    });

    // Обработчик команды /set_reminder
    this.bot.onText('напомни', (msg) => {
      const chatId = msg.chat.id;
      this.userStates[chatId] = { action: 'awaiting_date' };
      
      this.bot.sendMessage(
        chatId,
        '📅 Введите дату в формате ДД.ММ.ГГГГ (например, 25.12.2023):',
        { reply_markup: { force_reply: true } }
      ).then((sentMsg) => {
        this.bot.onReplyToMessage(chatId, sentMsg.message_id, (dateMsg) => {
          const dateText = dateMsg.text;
          
          if (!moment(dateText, 'DD.MM.YYYY', true).isValid()) {
            delete this.userStates[chatId];
            return this.bot.sendMessage(chatId, '❌ Неверный формат даты');
          }
          
          if (!moment(dateText, 'DD.MM.YYYY').isAfter(moment(), 'day')) {
            delete this.userStates[chatId];
            return this.bot.sendMessage(chatId, '❌ Дата должна быть в будущем');
          }
          
          this.userStates[chatId] = { action: 'awaiting_text', date: dateText };
          
          this.bot.sendMessage(
            chatId,
            '✏️ Введите текст напоминания:',
            { reply_markup: { force_reply: true } }
          ).then((sentMsg2) => {
            this.bot.onReplyToMessage(chatId, sentMsg2.message_id, (textMsg) => {
              try {
                const reminder = this.addNotification(chatId, dateText, textMsg.text);
                delete this.userStates[chatId];
                this.startScheduler();
                
                this.bot.sendMessage(
                  chatId,
                  `✅ Напоминание создано!\n\n` +
                  `📅 Дата: ${moment(reminder.date).format('DD.MM.YYYY')}\n` +
                  `📝 Текст: ${reminder.text}`
                );
              } catch (error) {
                console.error('Ошибка:', error);
                this.bot.sendMessage(chatId, '❌ Ошибка при создании напоминания');
              }
            });
          });
        });
      });
    });

    // Обработчик команды /my_reminders
    this.bot.onText('что не забыть?', (msg) => {
      const chatId = msg.chat.id;
      const reminders = this.getUserNotifications(chatId);
      
      if (reminders.length === 0) {
        return this.bot.sendMessage(chatId, 'У вас нет активных напоминаний');
      }
      
      let message = '📋 Ваши напоминания:\n\n';
      reminders.forEach((r, i) => {
        message += `${i+1}. ${moment(r.date).format('DD.MM.YYYY')} - ${r.text}\n`;
      });
      
      this.bot.sendMessage(chatId, message);
    });

    // Обработчик команды /cancel
    this.bot.onText(/\/cancel/, (msg) => {
      const chatId = msg.chat.id;
      if (this.userStates[chatId]) {
        delete this.userStates[chatId];
        this.bot.sendMessage(chatId, 'Текущее действие отменено');
      } else {
        this.bot.sendMessage(chatId, 'Нет активных действий для отмены');
      }
    });

    // Обработчик обычных сообщений (GPT)
    this.bot.on('message', async (msg) => {
      const chatId = msg.chat.id;
      const text = msg.text;
      
      if (!text || text.startsWith('/')) return;
      
      if (this.userStates[chatId]) {
        // Обработка состояний диалога
        return this.bot.sendMessage(
          chatId,
          'Завершите текущее действие или отмените его командой /cancel'
        );
      }
      
      try {
        this.bot.sendChatAction(chatId, 'typing');
        const response = await this.gpt.generateResponse(text);
        this.bot.sendMessage(chatId, response || 'Не удалось получить ответ');
      } catch (error) {
        console.error('GPT Error:', error);
        this.bot.sendMessage(chatId, 'Произошла ошибка. Попробуйте позже.');
      }
    });

    // Обработчики ошибок
    this.bot.on('polling_error', (error) => {
      console.error('Polling error:', error);
    });
  }
}

module.exports = BotController;