const app = require('./index');
module.exports = (req, res) => {
  if (!req.url.startsWith('/api/get')) {
    req.url = '/api/get' + (req.url.startsWith('/') ? req.url : '/' + req.url);
  }
  return app(req, res);
};
