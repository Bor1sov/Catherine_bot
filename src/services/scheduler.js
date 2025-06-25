const cron = require('node-cron');
const bot = require('../bot');
const logger = require('../utils/logger');

class Scheduler {
  constructor(storage) {
    this.storage = storage;
    this.retryCounts = new Map();
  }

  start() {
    this.job = cron.schedule('* * * * *', async () => {
      try {
        const pending = await this.storage.getPendingNotifications();
        
        if (!pending || !Array.isArray(pending)) {
          throw new Error('Invalid pending notifications data');
        }

        for (const note of pending) {
          try {
            await bot.sendMessage(
              note.chatId,
              `🔔 Напоминание: ${note.text}\n` +
              `⏰ Запланировано на: ${moment(note.date).format('DD.MM.YYYY HH:mm')}`
            );
            await this.storage.markAsSent(note.id);
            this.retryCounts.delete(note.id);
          } catch (error) {
            console.error(`Error sending notification ${note.id}:`, error);
            const attempts = (this.retryCounts.get(note.id) || 0);
            if (attempts >= 3) {
              this.retryCounts.delete(note.id);
            } else {
              this.retryCounts.set(note.id, attempts + 1);
            }
          }
        }
      } catch (error) {
        console.error('Scheduler error:', error);
      }
    }, {
      scheduled: true,
      timezone: process.env.TZ
    });
  }

  stop() {
    if (this.job) {
      this.job.stop();
    }
  }
}

module.exports = Scheduler;