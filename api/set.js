const app = require('./index');
module.exports = (req, res) => {
  const url = req.url || '';
  if (!url.startsWith('/api/set')) {
    const qIdx = url.indexOf('?');
    const query = qIdx !== -1 ? url.substring(qIdx) : '';
    req.url = '/api/set' + query;
  }
  return app(req, res);
};
