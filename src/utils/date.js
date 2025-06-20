const moment = require('moment');

module.exports = {
  isValidDate: (dateString) => {
    return moment(dateString, 'DD.MM.YYYY', true).isValid();
  },
  
  isFutureDate: (dateString) => {
    return moment(dateString, 'DD.MM.YYYY').isAfter(moment(), 'day');
  },
  
  formatDate: (date) => {
    return moment(date).format('DD.MM.YYYY HH:mm');
  }
};