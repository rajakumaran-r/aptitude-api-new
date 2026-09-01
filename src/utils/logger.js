/**
 * Lightweight structured logging utility
 */
const isTest = process.env.NODE_ENV === 'test';

const logger = {
  info: (message, meta = {}) => {
    if (isTest) return;
    const timestamp = new Date().toISOString();
    const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
    console.log(`[${timestamp}] [INFO]: ${message}${metaStr}`);
  },

  warn: (message, meta = {}) => {
    if (isTest) return;
    const timestamp = new Date().toISOString();
    const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
    console.warn(`[${timestamp}] [WARN]: ${message}${metaStr}`);
  },

  error: (message, error = null) => {
    if (isTest) return;
    const timestamp = new Date().toISOString();
    const errDetails = error ? (error.stack || error.message || JSON.stringify(error)) : '';
    console.error(`[${timestamp}] [ERROR]: ${message} ${errDetails}`);
  }
};

module.exports = logger;
