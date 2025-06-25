const axios = require('axios');
const config = require('../config');
const CacheService = require('./cache.service');

class GPTService {
  constructor() {
    this.cache = new CacheService();
  }

  async generateResponse(prompt, context = []) {
    const cacheKey = `gpt:${prompt}`;
    const cached = await this.cache.get(cacheKey);
    if (cached) return cached;

    const messages = [
      {
        role: 'system',
        text: 'Ты - полезный ассистент в чат-боте. Отвечай кратко и по делу.'
      },
      ...context,
      {
        role: 'user',
        text: prompt
      }
    ];

    try {
      const response = await axios.post(config.yandex.endpoint, {
        modelUri: `gpt://${config.yandex.folderId}/${config.yandex.gptModel}`,
        completionOptions: {
          temperature: 0.3,
          maxTokens: 200
        },
        messages
      }, {
        headers: {
          'Authorization': `Api-Key ${config.yandex.apiKey}`,
          'x-folder-id': config.yandex.folderId,
          'Content-Type': 'application/json'
        },
        timeout: 5000
      });

      const result = response.data.result.alternatives[0].message.text;
      await this.cache.set(cacheKey, result);
      return result;
    } catch (error) {
      console.error('GPT Service Error:', error.response?.data || error.message);
      throw new Error('Failed to get GPT response');
    }
  }
}

module.exports = GPTService;