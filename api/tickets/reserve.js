const app = require('../index');
module.exports = (req, res) => {
  if (!req.url.startsWith('/api/tickets/reserve')) {
    req.url = '/api/tickets/reserve' + (req.url.startsWith('/') ? req.url : '/' + req.url);
  }
  return app(req, res);
};
