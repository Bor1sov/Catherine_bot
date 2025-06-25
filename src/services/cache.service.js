const NodeCache = require('node-cache');
const config = require('../../config');

class CacheService {
  constructor() {
    this.cache = new NodeCache({
      stdTTL: config.cache.ttl,
      checkperiod: 600
    });
  }

  async get(key) {
    return this.cache.get(key);
  }

  async set(key, value) {
    return this.cache.set(key, value);
  }
}

module.exports = CacheService;