require('dotenv').config();



module.exports = {
  yandex: {
    apiKey: process.env.YANDEX_API_KEY,
    folderId: process.env.YANDEX_FOLDER_ID,
    gptModel: 'yandexgpt-lite',
    endpoint: 'https://llm.api.cloud.yandex.net/foundationModels/v1/completion'
  },
  telegram: {
    token: process.env.TELEGRAM_BOT_TOKEN
  },
  server: {
    port: process.env.PORT || 3000
  },
  cache: {
    ttl: process.env.CACHE_TTL || 3600
  }
};