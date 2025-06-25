const moment = require('moment');

module.exports = {
  format: (date) => moment(date).format('DD.MM.YYYY HH:mm'),
  isValid: (dateStr) => moment(dateStr, 'DD.MM.YYYY', true).isValid()
};