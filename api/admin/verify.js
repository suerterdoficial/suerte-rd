const app = require('../../index');
module.exports = (req, res) => {
  const url = req.url || '';
  if (!url.startsWith('/api/admin/verify')) {
    const qIdx = url.indexOf('?');
    const query = qIdx !== -1 ? url.substring(qIdx) : '';
    req.url = '/api/admin/verify' + query;
  }
  return app(req, res);
};
