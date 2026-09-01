const mongoose = require('mongoose');
const ApiError = require('../utils/apiError');
const ApiResponse = require('../utils/apiResponse');
const logger = require('../utils/logger');

/**
 * 404 Not Found Middleware for unknown routes
 */
const notFoundHandler = (req, res, next) => {
  next(ApiError.notFound(`Route not found: ${req.method} ${req.originalUrl}`));
};

/**
 * Centralized Error Handling Middleware
 */
const errorHandler = (err, req, res, next) => {
  let error = err;

  // Log error with details
  logger.error(`${req.method} ${req.originalUrl} - ${err.message}`, err);

  // Handle JSON parse error (e.g. malformed body)
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    error = ApiError.badRequest('Malformed JSON payload received', [], 'MALFORMED_JSON');
  }

  // Handle Mongoose CastError (invalid ObjectId)
  else if (err instanceof mongoose.Error.CastError || err.name === 'CastError') {
    error = ApiError.badRequest(`Invalid value for ${err.path}: ${err.value}`, [], 'INVALID_IDENTIFIER');
  }

  // Handle Mongoose ValidationError
  else if (err instanceof mongoose.Error.ValidationError || err.name === 'ValidationError') {
    const details = Object.values(err.errors || {}).map((e) => ({
      field: e.path,
      message: e.message
    }));
    error = ApiError.badRequest('Database validation failed', details, 'VALIDATION_ERROR');
  }

  // Handle MongoDB Duplicate Key Error (code 11000)
  else if (err.code === 11000) {
    const fields = Object.keys(err.keyPattern || err.keyValue || {});
    const fieldName = fields[0] || 'question';
    error = ApiError.conflict(
      `A question with the same ${fieldName} already exists`,
      [{ field: fieldName, message: `${fieldName} must be unique` }],
      'DUPLICATE_KEY_ERROR'
    );
  }

  // If not an ApiError instance, convert to 500 ApiError
  if (!(error instanceof ApiError)) {
    const statusCode = error.statusCode || 500;
    const isProduction = process.env.NODE_ENV === 'production';
    const message = isProduction && statusCode === 500 ? 'Internal Server Error' : (error.message || 'Internal Server Error');
    error = new ApiError(statusCode, message, 'INTERNAL_SERVER_ERROR');
  }

  const responseCode = error.statusCode || 500;
  const responseMessage = error.message;
  const errorCode = error.code || 'ERROR';
  const errorDetails = error.details || [];

  return ApiResponse.error(res, responseCode, responseMessage, errorCode, errorDetails);
};

module.exports = {
  notFoundHandler,
  errorHandler
};
