const fs = require('fs');
const path = require('path');
const moment = require('moment');

class JsonStorage {
  constructor() {
    this.filePath = path.join(__dirname, '../data/notifications.json');
    this._ensureStorageExists();
  }

  // Создает файл, если он не существует
  _ensureStorageExists() {
    if (!fs.existsSync(path.dirname(this.filePath))) {
      fs.mkdirSync(path.dirname(this.filePath), { recursive: true });
    }
    if (!fs.existsSync(this.filePath)) {
      fs.writeFileSync(this.filePath, JSON.stringify([]));
    }
  }

  // Чтение всех данных
  _readData() {
    try {
      const data = fs.readFileSync(this.filePath, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      console.error('Error reading storage file:', error);
      return [];
    }
  }

  // Запись данных
  _writeData(data) {
    try {
      fs.writeFileSync(this.filePath, JSON.stringify(data, null, 2));
    } catch (error) {
      console.error('Error writing to storage file:', error);
    }
  }

  // Добавление уведомления
  async addNotification(chatId, date, text) {
    const notifications = this._readData();
    const newNotification = {
      id: Date.now().toString(),
      chatId,
      date: moment(date, 'DD.MM.YYYY').toISOString(),
      text,
      sent: false,
      createdAt: new Date().toISOString()
    };
    notifications.push(newNotification);
    this._writeData(notifications);
    return newNotification;
  }

  // Получение уведомлений пользователя
  async getUserNotifications(chatId) {
    const notifications = this._readData();
    return notifications.filter(n => 
      n.chatId === chatId && 
      !n.sent && 
      moment(n.date).isAfter(moment())
    );
  }

  // Пометить уведомление как отправленное
  async markAsSent(id) {
    const notifications = this._readData();
    const updated = notifications.map(n => 
      n.id === id ? { ...n, sent: true } : n
    );
    this._writeData(updated);
  }

  // Получить все уведомления для отправки
  async getPendingNotifications() {
    const notifications = this._readData();
    return notifications.filter(n => 
      !n.sent && 
      moment(n.date).isSameOrBefore(moment())
    );
  }
}

module.exports = new JsonStorage();