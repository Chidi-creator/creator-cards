const validator = require('@app-core/validator');
const { throwAppError } = require('@app-core/errors');
const creatorCardRepository = require('@app/repository/creator-card');
const formatCard = require('./format-card');

const deleteSpec = `root {
  creator_reference string<length:20>
}`;

const parsedDeleteSpec = validator.parse(deleteSpec);

async function deleteCreatorCard({ slug, creator_reference }) {
  validator.validate({ creator_reference }, parsedDeleteSpec);

  const card = await creatorCardRepository.findOne({ query: { slug } });

  if (!card) {
    throwAppError('Card not found', 'RESOURCE_NOT_FOUND', { context: { code: 'NF01' } });
  }

  const deletedAt = Date.now();

  await creatorCardRepository.deleteOne({ query: { slug: card.slug } });

  return formatCard({ ...card, deleted: deletedAt });
}

module.exports = deleteCreatorCard;
