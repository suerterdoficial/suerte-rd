const app = require('../../index');
module.exports = (req, res) => {
  if (!req.url.startsWith('/api/admin/verify')) {
    req.url = '/api/admin/verify' + (req.url.startsWith('/') ? req.url : '/' + req.url);
  }
  return app(req, res);
};
