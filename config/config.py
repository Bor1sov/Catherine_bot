import os
from dotenv import load_dotenv

load_dotenv()


class Config:
    """Конфигурация приложения"""
    
    # Yandex GPT настройки
    YANDEX_API_KEY = os.getenv('YANDEX_API_KEY')
    YANDEX_FOLDER_ID = os.getenv('YANDEX_FOLDER_ID')
    YANDEX_GPT_MODEL = 'yandexgpt-lite'
    YANDEX_ENDPOINT = 'https://llm.api.cloud.yandex.net/foundationModels/v1/completion'
    
    # Telegram настройки
    TELEGRAM_BOT_TOKEN = os.getenv('TELEGRAM_BOT_TOKEN')
    
    # Сервер настройки
    PORT = int(os.getenv('PORT', 3000))
    
    # Кэш настройки
    CACHE_TTL = int(os.getenv('CACHE_TTL', 3600))
    
    # ID администратора для уведомлений
    ADMIN_CHAT_ID = int(os.getenv('ADMIN_CHAT_ID', 625281378))
    
    @classmethod
    def validate(cls):
        """Проверка обязательных настроек"""
        required_vars = [
            'YANDEX_API_KEY',
            'YANDEX_FOLDER_ID', 
            'TELEGRAM_BOT_TOKEN'
        ]
        
        missing = []
        for var in required_vars:
            if not getattr(cls, var):
                missing.append(var)
        
        if missing:
            raise ValueError(f"Отсутствуют обязательные переменные окружения: {', '.join(missing)}")