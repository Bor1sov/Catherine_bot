const fs = require('fs');
const path = require('path');
const moment = require('moment');

class JsonStorage {
  constructor() {
    this.filePath = path.join(__dirname, '../../data/notifications.json');
    this._initStorage();
  }

  _initStorage() {
    if (!fs.existsSync(path.dirname(this.filePath))) {
      fs.mkdirSync(path.dirname(this.filePath), { recursive: true });
    }
    if (!fs.existsSync(this.filePath)) {
      fs.writeFileSync(this.filePath, '[]', 'utf8');
    }
  }

  async _readData() {
    try {
      const data = await fs.promises.readFile(this.filePath, 'utf8');
      return JSON.parse(data) || [];
    } catch (error) {
      console.error('Error reading storage file:', error);
      return [];
    }
  }

  async _writeData(data) {
    try {
      await fs.promises.writeFile(this.filePath, JSON.stringify(data, null, 2));
    } catch (error) {
      console.error('Error writing to storage file:', error);
      throw error;
    }
  }

  async addNotification(chatId, text, dateStr) {
    const data = await this._readData();
    const newNote = {
      id: Date.now().toString(),
      chatId,
      text,
      date: moment(dateStr, 'DD.MM.YYYY').toISOString(),
      sent: false,
      createdAt: new Date().toISOString()
    };
    data.push(newNote);
    await this._writeData(data);
    return newNote;
  }

  async getPendingNotifications() {
    const data = await this._readData();
    return data.filter(note => 
      !note.sent && 
      moment(note.date).isSameOrBefore(moment())
    );
  }

  async getUserNotifications(chatId) {
    const data = await this._readData();
    return data.filter(note => 
      note.chatId === chatId && 
      !note.sent
    );
  }

  async markAsSent(id) {
    const data = await this._readData();
    const updated = data.map(note => 
      note.id === id ? { ...note, sent: true } : note
    );
    await this._writeData(updated);
  }
}

module.exports = new JsonStorage();