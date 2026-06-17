const validator = require('@app-core/validator');
const { throwAppError } = require('@app-core/errors');
const { randomBytes } = require('@app-core/randomness');
const creatorCardRepository = require('@app/repository/creator-card');
const formatCard = require('./format-card');

const createSpec = `root {
  title string<minlength:3|maxlength:100>
  creator_reference string<length:20>
  status string(draft|published)
  description? string<maxlength:500>
  slug? string<minlength:5|maxlength:50>
  access_type? string(public|private)
  access_code? string<length:6>
}`;

const parsedCreateSpec = validator.parse(createSpec);

function isValidSlugFormat(slug) {
  for (let i = 0; i < slug.length; i++) {
    const c = slug[i];
    const isLetter = (c >= 'a' && c <= 'z') || (c >= 'A' && c <= 'Z');
    const isDigit = c >= '0' && c <= '9';
    if (!isLetter && !isDigit && c !== '-' && c !== '_') return false;
  }
  return true;
}

function isAlphanumeric(str) {
  for (let i = 0; i < str.length; i++) {
    const c = str[i];
    const isLetter = (c >= 'a' && c <= 'z') || (c >= 'A' && c <= 'Z');
    const isDigit = c >= '0' && c <= '9';
    if (!isLetter && !isDigit) return false;
  }
  return true;
}

function isValidUrl(url) {
  return (url.indexOf('http://') === 0 || url.indexOf('https://') === 0) && url.length > 8;
}

function slugFromTitle(title) {
  const lower = title.toLowerCase();
  let result = '';
  for (let i = 0; i < lower.length; i++) {
    const c = lower[i];
    if (c === ' ') {
      result += '-';
    } else if ((c >= 'a' && c <= 'z') || (c >= '0' && c <= '9') || c === '-' || c === '_') {
      result += c;
    }
  }
  return result;
}

async function resolveSlug(rawSlug) {
  const existing = await creatorCardRepository.findOne({ query: { slug: rawSlug } });
  if (!existing) return rawSlug;
  return rawSlug + '-' + randomBytes(6);
}

async function createCreatorCard(data) {
  validator.validate(data, parsedCreateSpec);

  const {
    title,
    creator_reference,
    status,
    description,
    access_type = 'public',
    access_code,
    links,
    service_rates,
  } = data;

  let { slug } = data;

  if (access_type === 'private' && !access_code) {
    throwAppError('access_code is required when access_type is private', 'VALIDATION_ERROR', {
      context: { code: 'AC01' },
    });
  }

  if (access_type !== 'private' && access_code) {
    throwAppError('access_code can only be set on private cards', 'VALIDATION_ERROR', {
      context: { code: 'AC05' },
    });
  }

  if (access_code && !isAlphanumeric(access_code)) {
    throwAppError('access_code must contain only alphanumeric characters', 'VALIDATION_ERROR', {
      context: { code: 'AC01' },
    });
  }

  if (slug) {
    if (!isValidSlugFormat(slug)) {
      throwAppError(
        'Slug may only contain letters, numbers, hyphens, and underscores',
        'VALIDATION_ERROR'
      );
    }
    const existing = await creatorCardRepository.findOne({ query: { slug } });
    if (existing) {
      throwAppError('Slug is already taken', 'VALIDATION_ERROR', { context: { code: 'SL02' } });
    }
  } else {
    const base = slugFromTitle(title);
    const candidate = base.length >= 5 ? base : base + '-' + randomBytes(6);
    slug = await resolveSlug(candidate);
  }

  if (links !== undefined) {
    if (!Array.isArray(links)) {
      throwAppError('links must be an array', 'VALIDATION_ERROR');
    }
    for (let i = 0; i < links.length; i++) {
      const link = links[i];
      if (!link.title || link.title.length < 1 || link.title.length > 100) {
        throwAppError(`links[${i}].title must be 1-100 characters`, 'VALIDATION_ERROR');
      }
      if (!link.url || link.url.length > 200 || !isValidUrl(link.url)) {
        throwAppError(
          `links[${i}].url must be a valid http/https URL under 200 characters`,
          'VALIDATION_ERROR'
        );
      }
    }
  }

  if (service_rates !== undefined) {
    const validCurrencies = ['NGN', 'USD', 'GBP', 'GHS'];
    if (!service_rates.currency || validCurrencies.indexOf(service_rates.currency) === -1) {
      throwAppError('service_rates.currency must be one of NGN, USD, GBP, GHS', 'VALIDATION_ERROR');
    }
    if (service_rates.rates !== undefined) {
      if (!Array.isArray(service_rates.rates)) {
        throwAppError('service_rates.rates must be an array', 'VALIDATION_ERROR');
      }
      for (let i = 0; i < service_rates.rates.length; i++) {
        const rate = service_rates.rates[i];
        if (!rate.name || rate.name.length < 3 || rate.name.length > 100) {
          throwAppError(`service_rates.rates[${i}].name must be 3-100 characters`, 'VALIDATION_ERROR');
        }
        if (rate.description !== undefined && rate.description.length > 250) {
          throwAppError(
            `service_rates.rates[${i}].description must be under 250 characters`,
            'VALIDATION_ERROR'
          );
        }
        if (!Number.isInteger(rate.amount) || rate.amount <= 0) {
          throwAppError(
            `service_rates.rates[${i}].amount must be a positive integer`,
            'VALIDATION_ERROR'
          );
        }
      }
    }
  }

  const cardData = { slug, title, creator_reference, status, access_type };
  if (description !== undefined) cardData.description = description;
  if (access_code !== undefined) cardData.access_code = access_code;
  if (links !== undefined) cardData.links = links;
  if (service_rates !== undefined) cardData.service_rates = service_rates;

  const card = await creatorCardRepository.create(cardData);
  return formatCard(card);
}

module.exports = createCreatorCard;
