const { throwAppError } = require('@app-core/errors');
const creatorCardRepository = require('@app/repository/creator-card');
const formatCard = require('./format-card');

async function getCreatorCard({ slug, access_code }) {
  const card = await creatorCardRepository.findOne({ query: { slug } });

  if (!card) {
    throwAppError('Card not found', 'RESOURCE_NOT_FOUND', { context: { code: 'NF01' } });
  }

  if (card.status === 'draft') {
    throwAppError('Card not found', 'RESOURCE_NOT_FOUND', { context: { code: 'NF02' } });
  }

  if (card.access_type === 'private') {
    if (!access_code) {
      throwAppError('Access code is required for private cards', 'INVALID_REQUEST', {
        context: { code: 'AC03' },
      });
    }
    if (access_code !== card.access_code) {
      throwAppError('Invalid access code', 'INVALID_REQUEST', { context: { code: 'AC04' } });
    }
  }

  const result = formatCard(card);
  delete result.access_code;
  return result;
}

module.exports = getCreatorCard;
