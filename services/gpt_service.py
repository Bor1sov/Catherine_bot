import requests
import logging
from typing import List, Dict, Optional
from config.config import Config
from services.cache_service import CacheService

logger = logging.getLogger(__name__)


class GPTService:
    """Сервис для работы с YandexGPT"""
    
    def __init__(self):
        self.cache = CacheService()
        self.api_key = Config.YANDEX_API_KEY
        self.folder_id = Config.YANDEX_FOLDER_ID
        self.model = Config.YANDEX_GPT_MODEL
        self.endpoint = Config.YANDEX_ENDPOINT
    
    async def generate_response(self, prompt: str, context: List[Dict] = None) -> Optional[str]:
        """
        Генерирует ответ с помощью YandexGPT
        
        Args:
            prompt: Текст запроса
            context: Контекст предыдущих сообщений
            
        Returns:
            Ответ от GPT или None в случае ошибки
        """
        if context is None:
            context = []
            
        # Проверяем кэш
        cache_key = f"gpt:{prompt}"
        cached_response = await self.cache.get(cache_key)
        if cached_response:
            return cached_response
        
        # Формируем сообщения
        messages = [
            {
                "role": "system",
                "text": "Ты - полезный ассистент в чат-боте. Отвечай кратко и по делу."
            },
            *context,
            {
                "role": "user", 
                "text": prompt
            }
        ]
        
        # Подготавливаем данные для запроса
        payload = {
            "modelUri": f"gpt://{self.folder_id}/{self.model}",
            "completionOptions": {
                "temperature": 0.3,
                "maxTokens": 200
            },
            "messages": messages
        }
        
        headers = {
            "Authorization": f"Api-Key {self.api_key}",
            "x-folder-id": self.folder_id,
            "Content-Type": "application/json"
        }
        
        try:
            response = requests.post(
                self.endpoint,
                json=payload,
                headers=headers,
                timeout=5
            )
            response.raise_for_status()
            
            result = response.json()
            answer = result["result"]["alternatives"][0]["message"]["text"]
            
            # Сохраняем в кэш
            await self.cache.set(cache_key, answer)
            return answer
            
        except requests.exceptions.RequestException as e:
            logger.error(f"Ошибка запроса к GPT: {e}")
            if hasattr(e, 'response') and e.response is not None:
                logger.error(f"Ответ сервера: {e.response.text}")
            raise Exception("Не удалось получить ответ от GPT")
        except (KeyError, IndexError) as e:
            logger.error(f"Ошибка обработки ответа GPT: {e}")
            raise Exception("Неверный формат ответа от GPT")
        except Exception as e:
            logger.error(f"Неожиданная ошибка в GPT сервисе: {e}")
            raise Exception("Произошла внутренняя ошибка")