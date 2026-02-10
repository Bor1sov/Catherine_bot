import json
import logging
import os
from datetime import datetime
from typing import List, Dict, Optional
from dateutil import parser as date_parser
from dateutil.relativedelta import relativedelta

logger = logging.getLogger(__name__)

DATA_DIR = "data"
DATA_FILE = os.path.join(DATA_DIR, "notifications.json")


class Storage:
    """Сервис для хранения напоминаний в JSON файле"""
    
    def __init__(self):
        self._ensure_storage()
    
    def _ensure_storage(self):
        """Создать директорию и файл если их нет"""
        if not os.path.exists(DATA_DIR):
            os.makedirs(DATA_DIR)
        if not os.path.exists(DATA_FILE):
            self._write_data([])
    
    def _read_data(self) -> List[Dict]:
        """Прочитать данные из файла"""
        try:
            with open(DATA_FILE, 'r', encoding='utf-8') as f:
                return json.load(f)
        except json.JSONDecodeError as e:
            logger.error(f"Ошибка чтения JSON: {e}")
            return []
        except Exception as e:
            logger.error(f"Ошибка чтения файла: {e}")
            return []
    
    def _write_data(self, data: List[Dict]) -> bool:
        """Записать данные в файл"""
        try:
            with open(DATA_FILE, 'w', encoding='utf-8') as f:
                json.dump(data, f, ensure_ascii=False, indent=2)
            return True
        except Exception as e:
            logger.error(f"Ошибка записи файла: {e}")
            return False
    
    def add_notification(self, chat_id: int, date: str, text: str) -> Optional[Dict]:
        """
        Добавить новое напоминание
        
        Args:
            chat_id: ID чата пользователя
            date: Дата в формате DD.MM.YYYY
            text: Текст напоминания
            
        Returns:
            Созданное напоминание или None
        """
        try:
            # Парсим дату
            parsed_date = datetime.strptime(date, '%d.%m.%Y')
            
            notification = {
                "id": str(datetime.now().timestamp()),
                "chatId": chat_id,
                "date": parsed_date.isoformat(),
                "text": text,
                "sent": False,
                "createdAt": datetime.now().isoformat()
            }
            
            data = self._read_data()
            data.append(notification)
            self._write_data(data)
            
            return notification
        except ValueError as e:
            logger.error(f"Неверный формат даты: {e}")
            return None
        except Exception as e:
            logger.error(f"Ошибка добавления напоминания: {e}")
            return None
    
    def get_user_notifications(self, chat_id: int) -> List[Dict]:
        """
        Получить активные напоминания пользователя
        
        Args:
            chat_id: ID чата пользователя
            
        Returns:
            Список активных напоминаний
        """
        now = datetime.now()
        notifications = self._read_data()
        
        return [
            n for n in notifications 
            if n["chatId"] == chat_id 
            and not n["sent"] 
            and date_parser.parse(n["date"]) > now
        ]
    
    def get_pending_notifications(self) -> List[Dict]:
        """
        Получить напоминания, которые пора отправить
        
        Returns:
            Список ожидающих отправки напоминаний
        """
        now = datetime.now()
        notifications = self._read_data()
        
        return [
            n for n in notifications 
            if not n["sent"] 
            and date_parser.parse(n["date"]) <= now
        ]
    
    def mark_as_sent(self, notification_id: str) -> bool:
        """
        Отметить напоминание как отправленное
        
        Args:
            notification_id: ID напоминания
            
        Returns:
            True если успешно, False иначе
        """
        try:
            data = self._read_data()
            updated = False
            
            for n in data:
                if n["id"] == notification_id:
                    n["sent"] = True
                    updated = True
                    break
            
            if updated:
                self._write_data(data)
            
            return updated
        except Exception as e:
            logger.error(f"Ошибка отметки напоминания: {e}")
            return False
    
    def delete_notification(self, notification_id: str) -> bool:
        """
        Удалить напоминание
        
        Args:
            notification_id: ID напоминания
            
        Returns:
            True если успешно, False иначе
        """
        try:
            data = self._read_data()
            data = [n for n in data if n["id"] != notification_id]
            self._write_data(data)
            return True
        except Exception as e:
            logger.error(f"Ошибка удаления напоминания: {e}")
            return False
    
    def format_date(self, iso_date: str) -> str:
        """
        Форматировать ISO дату в DD.MM.YYYY
        
        Args:
            iso_date: Дата в ISO формате
            
        Returns:
            Отформатированная дата
        """
        try:
            dt = date_parser.parse(iso_date)
            return dt.strftime('%d.%m.%Y')
        except Exception:
            return iso_date