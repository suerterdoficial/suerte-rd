const app = require('../index');
module.exports = (req, res) => {
  if (!req.url.startsWith('/api/tickets/update-status')) {
    req.url = '/api/tickets/update-status' + (req.url.startsWith('/') ? req.url : '/' + req.url);
  }
  return app(req, res);
};
