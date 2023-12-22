const config = require('../config');

module.exports = function (req, res, next) {
  if (req.headers['x-api-key'] !== config.app.X_API_KEY) {
    return res
        .status(403)
        .json({
          error: 'Access denied',
          message: 'Incorrect api key',
        });
  }

  return next();
};
