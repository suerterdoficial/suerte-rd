const app = require('./index');
module.exports = (req, res) => {
  const url = req.url || '';
  if (!url.startsWith('/api/get')) {
    const qIdx = url.indexOf('?');
    const query = qIdx !== -1 ? url.substring(qIdx) : '';
    req.url = '/api/get' + query;
  }
  return app(req, res);
};
