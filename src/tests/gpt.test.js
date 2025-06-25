const GPTService = require('../src/services/gpt.service');
jest.mock('axios');

describe('GPTService', () => {
  let service;
  
  beforeEach(() => {
    service = new GPTService();
  });

  test('should cache responses', async () => {
    // Тест кэширования
  });
});