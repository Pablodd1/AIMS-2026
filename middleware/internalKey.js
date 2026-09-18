'use strict';
module.exports = (req, res, next) => {
  const key = process.env.AIMS_INTERNAL_KEY || '';
  if (!key) return res.status(503).json({ response: false, error: 'AIMS_INTERNAL_KEY not set on the backend' });
  if (req.get('x-aims-internal-key') !== key) return res.status(401).json({ response: false, error: 'bad internal key' });
  next();
};
