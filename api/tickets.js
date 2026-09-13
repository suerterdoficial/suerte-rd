const app = require('./index');
module.exports = (req, res) => {
  if (!req.url.startsWith('/api/tickets')) {
    req.url = '/api/tickets' + (req.url.startsWith('/') ? req.url : '/' + req.url);
  }
  return app(req, res);
};
