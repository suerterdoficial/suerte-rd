const app = require('../index');
module.exports = (req, res) => {
  const url = req.url || '';
  if (!url.startsWith('/api/tickets/update-status')) {
    const qIdx = url.indexOf('?');
    const query = qIdx !== -1 ? url.substring(qIdx) : '';
    req.url = '/api/tickets/update-status' + query;
  }
  return app(req, res);
};
