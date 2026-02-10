"""
Точка входа для Catherine Bot (Telegram бот с YandexGPT)
"""
import logging
from bot.telegram_bot import main

if __name__ == "__main__":
    # Настройка логирования
    logging.basicConfig(
        format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
        level=logging.INFO,
        handlers=[
            logging.StreamHandler(),
            logging.FileHandler("bot.log", encoding="utf-8")
        ]
    )
    
    logging.info("Запуск Catherine Bot...")
    main()