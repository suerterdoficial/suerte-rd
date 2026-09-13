const app = require('./index');
module.exports = (req, res) => {
  if (!req.url.startsWith('/api/set')) {
    req.url = '/api/set' + (req.url.startsWith('/') ? req.url : '/' + req.url);
  }
  return app(req, res);
};
