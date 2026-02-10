import asyncio
import logging
from typing import Any, Optional
from cachetools import TTLCache
from config.config import Config

logger = logging.getLogger(__name__)


class CacheService:
    """Сервис кэширования с TTL"""
    
    def __init__(self):
        self.cache = TTLCache(
            maxsize=1000,  # Максимальное количество элементов
            ttl=Config.CACHE_TTL  # Время жизни в секундах
        )
    
    async def get(self, key: str) -> Optional[Any]:
        """
        Получить значение из кэша
        
        Args:
            key: Ключ для поиска
            
        Returns:
            Значение из кэша или None
        """
        try:
            return self.cache.get(key)
        except Exception as e:
            logger.error(f"Ошибка получения из кэша {key}: {e}")
            return None
    
    async def set(self, key: str, value: Any) -> bool:
        """
        Установить значение в кэш
        
        Args:
            key: Ключ для сохранения
            value: Значение для сохранения
            
        Returns:
            True если успешно, False иначе
        """
        try:
            self.cache[key] = value
            return True
        except Exception as e:
            logger.error(f"Ошибка сохранения в кэш {key}: {e}")
            return False
    
    async def delete(self, key: str) -> bool:
        """
        Удалить значение из кэша
        
        Args:
            key: Ключ для удаления
            
        Returns:
            True если успешно, False иначе
        """
        try:
            if key in self.cache:
                del self.cache[key]
            return True
        except Exception as e:
            logger.error(f"Ошибка удаления из кэша {key}: {e}")
            return False
    
    async def clear(self) -> bool:
        """
        Очистить весь кэш
        
        Returns:
            True если успешно, False иначе
        """
        try:
            self.cache.clear()
            return True
        except Exception as e:
            logger.error(f"Ошибка очистки кэша: {e}")
            return False
    
    def get_stats(self) -> dict:
        """
        Получить статистику кэша
        
        Returns:
            Словарь со статистикой
        """
        return {
            "size": len(self.cache),
            "maxsize": self.cache.maxsize,
            "currsize": self.cache.currsize
        }