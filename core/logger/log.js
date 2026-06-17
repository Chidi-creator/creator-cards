const logClient = require('./log-client');
const { LOG_TYPE } = require('./constants');

function _log(type, data, optionalKey = 'APP-LOG') {
  logClient[type](data, String(optionalKey));
}

const logger = (data, optionalKey) => _log(LOG_TYPE.LOG, data, optionalKey);
logger.info = (data, optionalKey) => _log(LOG_TYPE.INFO, data, optionalKey);
logger.warn = (data, optionalKey) => _log(LOG_TYPE.WARN, data, optionalKey);
logger.error = (data, optionalKey) => _log(LOG_TYPE.ERROR, data, optionalKey);
logger.errorX = (data, optionalKey) =>
  _log(LOG_TYPE.ERROR, { errorMessage: data.message, errorStack: data.stack, _raw: data }, optionalKey);

module.exports = logger;
