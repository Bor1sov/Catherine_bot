const storage = require('../services/jsonStorage');
const Scheduler = require('../services/scheduler');
const { isValidDate, isFutureDate } = require('../utils/date');

class NotificationController {
  constructor() {
    this.storage = storage;
    this.scheduler = new Scheduler(this.storage);
    this.scheduler.start();
  }

  async createNotification(chatId, dateStr, text) {
    if (!isValidDate(dateStr)) {
      throw new Error('Неверный формат даты. Используйте ДД.ММ.ГГГГ');
    }

    if (!isFutureDate(dateStr)) {
      throw new Error('Дата должна быть в будущем');
    }

    return this.storage.addNotification(chatId, text, dateStr);
  }

  async getUserNotifications(chatId) {
    return this.storage.getUserNotifications(chatId);
  }
}

module.exports = NotificationController;