const axios = require('axios');
const config = require('../../config');
const CacheService = require('./cache.service');

class GPTService {
  constructor() {
    this.cache = new CacheService();
  }

  async generateResponse(prompt) {
    const cacheKey = `gpt:${prompt}`;
    const cached = await this.cache.get(cacheKey);
    if (cached) return cached;

    try {
      const response = await axios.post(
        config.yandex.endpoint,
        {
          modelUri: `gpt://${config.yandex.folderId}/${config.yandex.gptModel}`,
          messages: [{
            role: 'user',
            text: prompt
          }]
        },
        {
          headers: {
            'Authorization': `Api-Key ${config.yandex.apiKey}`,
            'x-folder-id': config.yandex.folderId
          }
        }
      );

      const result = response.data.result.alternatives[0].message.text;
      this.cache.set(cacheKey, result);
      return result;
    } catch (error) {
      console.error('GPT Error:', error.response?.data || error.message);
      return 'Sorry, I cannot answer right now';
    }
  }
}

module.exports = GPTService;