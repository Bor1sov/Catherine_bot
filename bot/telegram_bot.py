import logging
import asyncio
from datetime import datetime
from telegram import Update, ReplyKeyboardMarkup, ReplyKeyboardRemove, ForceReply
from telegram.ext import (
    Application,
    CommandHandler,
    MessageHandler,
    ConversationHandler,
    ContextTypes,
    filters,
    JobQueue
)
from config.config import Config
from services.gpt_service import GPTService
from services.storage import Storage

logger = logging.getLogger(__name__)

# Состояния для напоминаний
(AWAITING_DATE, AWAITING_TEXT) = range(2)

# Хранилище состояний пользователей
user_states = {}


class TelegramBot:
    """Основной класс Telegram бота"""
    
    def __init__(self):
        self.gpt = GPTService()
        self.storage = Storage()
        self.app = None
    
    async def start_scheduler(self, application: Application):
        """Запуск планировщика для проверки напоминаний"""
        job_queue = application.job_queue
        
        # Запускаем проверку каждую минуту
        job_queue.run_repeating(
            self.check_notifications,
            interval=60,
            first=10
        )
    
    async def check_notifications(self, context: ContextTypes.DEFAULT_TYPE):
        """Проверить и отправить ожидающие напоминания"""
        pending = self.storage.get_pending_notifications()
        
        for notification in pending:
            try:
                await context.bot.send_message(
                    chat_id=notification["chatId"],
                    text=f"🔔 Напоминание: {notification['text']}"
                )
                self.storage.mark_as_sent(notification["id"])
                logger.info(f"Отправлено напоминание {notification['id']}")
            except Exception as e:
                logger.error(f"Ошибка отправки напоминания: {e}")
    
    async def start_command(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        """Обработчик команды /start"""
        await update.message.reply_text(
            "👋 Привет! Я многофункциональный бот с возможностями:\n\n"
            "🤖 *YandexGPT* - отвечаю на ваши вопросы\n"
            "⏰ *Напоминания* - создавайте и управляйте напоминаниями\n\n"
            "📌 Доступные команды:\n"
            "/help - получить помощь\n"
            "/set_reminder - создать напоминание\n"
            "/my_reminders - ваши напоминания",
            parse_mode="Markdown"
        )
    
    async def help_command(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        """Обработчик команды /help"""
        await update.message.reply_text(
            "📖 *Как пользоваться ботом:*\n\n"
            "1. Просто напишите мне вопрос для получения ответа от YandexGPT\n\n"
            "2. Для напоминаний:\n"
            "   - /set_reminder - создать новое\n"
            "   - /my_reminders - просмотреть активные\n\n"
            "3. /cancel - отменить текущее действие",
            parse_mode="Markdown"
        )
    
    async def set_reminder_start(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        """Начало создания напоминания"""
        user_id = update.effective_user.id
        user_states[user_id] = {"action": "awaiting_date"}
        
        await update.message.reply_text(
            "📅 Введите дату в формате ДД.ММ.ГГГГ (например, 25.12.2024):",
            reply_markup=ForceReply(selective=True)
        )
        return AWAITING_DATE
    
    async def set_reminder_date(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        """Получение даты напоминания"""
        user_id = update.effective_user.id
        date_text = update.message.text
        
        try:
            # Проверка формата даты
            date = datetime.strptime(date_text, '%d.%m.%Y')
            
            # Проверка что дата в будущем
            if date <= datetime.now():
                del user_states[user_id]
                await update.message.reply_text("❌ Дата должна быть в будущем")
                return ConversationHandler.END
            
            user_states[user_id] = {"action": "awaiting_text", "date": date_text}
            
            await update.message.reply_text(
                "✏️ Введите текст напоминания:",
                reply_markup=ForceReply(selective=True)
            )
            return AWAITING_TEXT
            
        except ValueError:
            await update.message.reply_text("❌ Неверный формат даты. Используйте ДД.ММ.ГГГГ")
            return AWAITING_DATE
    
    async def set_reminder_text(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        """Получение текста напоминания и создание"""
        user_id = update.effective_user.id
        text = update.message.text
        
        if user_id not in user_states or user_states[user_id].get("action") != "awaiting_text":
            await update.message.reply_text("Начните создание напоминания с команды /set_reminder")
            return ConversationHandler.END
        
        date_text = user_states[user_id]["date"]
        
        # Создаем напоминание
        reminder = self.storage.add_notification(user_id, date_text, text)
        
        del user_states[user_id]
        
        if reminder:
            formatted_date = self.storage.format_date(reminder["date"])
            await update.message.reply_text(
                f"✅ Напоминание создано!\n\n"
                f"📅 Дата: {formatted_date}\n"
                f"📝 Текст: {reminder['text']}"
            )
        else:
            await update.message.reply_text("❌ Ошибка при создании напоминания")
        
        return ConversationHandler.END
    
    async def cancel_reminder(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        """Отмена создания напоминания"""
        user_id = update.effective_user.id
        
        if user_id in user_states:
            del user_states[user_id]
            await update.message.reply_text("Текущее действие отменено")
        else:
            await update.message.reply_text("Нет активных действий для отмены")
        
        return ConversationHandler.END
    
    async def my_reminders(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        """Показать напоминания пользователя"""
        user_id = update.effective_user.id
        reminders = self.storage.get_user_notifications(user_id)
        
        if not reminders:
            await update.message.reply_text("📋 У вас нет активных напоминаний")
            return
        
        message = "📋 Ваши напоминания:\n\n"
        for i, r in enumerate(reminders, 1):
            formatted_date = self.storage.format_date(r["date"])
            message += f"{i}. {formatted_date} - {r['text']}\n"
        
        await update.message.reply_text(message)
    
    async def handle_message(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        """Обработчик обычных сообщений - запрос к GPT"""
        user_id = update.effective_user.id
        text = update.message.text
        
        # Проверяем, если пользователь в процессе создания напоминания
        if user_id in user_states:
            await update.message.reply_text(
                "Завершите текущее действие или отмените его командой /cancel"
            )
            return
        
        # Проверяем, что это не команда
        if text.startswith('/'):
            return
        
        try:
            await update.message.chat.send_action("typing")
            response = await self.gpt.generate_response(text)
            
            if response:
                await update.message.reply_text(response)
            else:
                await update.message.reply_text("Не удалось получить ответ")
                
        except Exception as e:
            logger.error(f"Ошибка GPT: {e}")
            await update.message.reply_text("Произошла ошибка. Попробуйте позже.")
    
    async def post_init(self, application: Application):
        """Действия после инициализации бота"""
        # Запускаем планировщик
        await self.start_scheduler(application)
        
        # Отправляем уведомление админу
        try:
            await application.bot.send_message(
                chat_id=Config.ADMIN_CHAT_ID,
                text="✅ Бот запущен и готов к работе!"
            )
        except Exception as e:
            logger.error(f"Не удалось отправить уведомление админу: {e}")
    
    def run(self):
        """Запуск бота"""
        # Проверяем конфигурацию
        Config.validate()
        
        # Создаем приложение
        self.app = Application.builder().token(Config.TELEGRAM_BOT_TOKEN).build()
        
        # Обработчики команд
        self.app.add_handler(CommandHandler("start", self.start_command))
        self.app.add_handler(CommandHandler("help", self.help_command))
        self.app.add_handler(CommandHandler("my_reminders", self.my_reminders))
        
        # Обработчик напоминаний с состояниями
        reminder_handler = ConversationHandler(
            entry_points=[CommandHandler("set_reminder", self.set_reminder_start)],
            states={
                AWAITING_DATE: [MessageHandler(filters.TEXT & ~filters.COMMAND, self.set_reminder_date)],
                AWAITING_TEXT: [MessageHandler(filters.TEXT & ~filters.COMMAND, self.set_reminder_text)],
            },
            fallbacks=[CommandHandler("cancel", self.cancel_reminder)],
            name="reminder_conversation",
            persistent=False
        )
        self.app.add_handler(reminder_handler)
        
        # Обработчик сообщений
        self.app.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, self.handle_message))
        
        # Пост-инициализация
        self.app.post_init = self.post_init
        
        # Запуск
        logger.info("Запуск бота...")
        self.app.run_polling(allowed_updates=Update.ALL_TYPES)


def main():
    """Точка входа"""
    # Настройка логирования
    logging.basicConfig(
        format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
        level=logging.INFO
    )
    
    bot = TelegramBot()
    bot.run()


if __name__ == "__main__":
    main()