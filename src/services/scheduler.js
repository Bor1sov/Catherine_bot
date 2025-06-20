const cron = require('node-cron');
const storage = require('./jsonStorage');
const bot = require('../index').bot;

class Scheduler {
  constructor() {
    this.scheduledTask = null;
  }

  start() {
    if (this.scheduledTask) {
      this.scheduledTask.stop();
    }

    this.scheduledTask = cron.schedule('* * * * *', async () => {
      try {
        const pendingNotifications = await storage.getPendingNotifications();
        
        for (const notification of pendingNotifications) {
          try {
            await bot.sendMessage(
              notification.chatId, 
              `🔔 Напоминание: ${notification.text}`
            );
            await storage.markAsSent(notification.id);
          } catch (error) {
            console.error(`Error sending notification ${notification.id}:`, error);
          }
        }
      } catch (error) {
        console.error('Scheduler error:', error);
      }
    });
  }
}

module.exports = new Scheduler();