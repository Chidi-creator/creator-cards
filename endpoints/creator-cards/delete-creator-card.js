const { createHandler } = require('@app-core/server');
const deleteCreatorCardService = require('@app/services/creator-cards/delete-creator-card');

module.exports = createHandler({
  path: '/creator-cards/:slug',
  method: 'delete',
  middlewares: [],
  async handler(rc, helpers) {
    const { slug } = rc.params;
    const { creator_reference } = rc.body;

    const response = await deleteCreatorCardService({ slug, creator_reference });
    return {
      status: helpers.http_statuses.HTTP_200_OK,
      data: response,
    };
  },
});
