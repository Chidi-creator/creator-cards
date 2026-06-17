const { createHandler } = require('@app-core/server');

module.exports = createHandler({
  path: '/health',
  method: 'get',
  middlewares: [],
  async handler(rc, helpers) {
    return {
      status: helpers.http_statuses.HTTP_200_OK,
      data: { status: 'service healthy and running', timestamp: Date.now() },
    };
  },
});
