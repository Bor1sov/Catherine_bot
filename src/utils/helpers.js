module.exports = {
  generateId: () => Math.random().toString(36).substr(2, 9),
  sanitizeText: (text) => text.trim().replace(/[^\w\s]/gi, '')
};