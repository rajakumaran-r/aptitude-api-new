/**
 * Standardized Operational Application Error
 */
class ApiError extends Error {
  constructor(statusCode, message, code = 'ERROR', details = null) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }

  static badRequest(message = 'Bad Request', details = null, code = 'BAD_REQUEST') {
    return new ApiError(400, message, code, details);
  }

  static notFound(message = 'Resource Not Found', details = null, code = 'NOT_FOUND') {
    return new ApiError(404, message, code, details);
  }

  static unauthorized(message = 'Unauthorized', details = null, code = 'UNAUTHORIZED') {
    return new ApiError(401, message, code, details);
  }

  static forbidden(message = 'Forbidden', details = null, code = 'FORBIDDEN') {
    return new ApiError(403, message, code, details);
  }

  static conflict(message = 'Resource already exists', details = null, code = 'CONFLICT') {
    return new ApiError(409, message, code, details);
  }

  static unprocessable(message = 'Unprocessable Entity', details = null, code = 'VALIDATION_ERROR') {
    return new ApiError(422, message, code, details);
  }

  static internal(message = 'Internal Server Error', details = null, code = 'INTERNAL_ERROR') {
    return new ApiError(500, message, code, details);
  }
}

module.exports = ApiError;
