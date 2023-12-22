const authApiMiddleware = require('../middlewares/authAPI');

module.exports = (app, method, path, handler) => {
  const callbacks = [];

  callbacks.push(authApiMiddleware);
  callbacks.push(handler);

  app[method](path, ...callbacks);
};
