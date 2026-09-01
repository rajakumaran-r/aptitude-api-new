/**
 * Standardized API Response Helper
 */
class ApiResponse {
  /**
   * Send a successful HTTP response
   * @param {import('express').Response} res
   * @param {number} statusCode
   * @param {string} message
   * @param {any} data
   * @param {object|null} pagination
   */
  static success(res, statusCode = 200, message = 'Success', data = null, pagination = null) {
    const responsePayload = {
      success: true,
      message,
      data
    };

    if (pagination !== null && pagination !== undefined) {
      responsePayload.pagination = pagination;
    }

    return res.status(statusCode).json(responsePayload);
  }

  /**
   * Send an error HTTP response
   * @param {import('express').Response} res
   * @param {number} statusCode
   * @param {string} message
   * @param {string} code
   * @param {any} details
   */
  static error(res, statusCode = 500, message = 'An error occurred', code = 'ERROR', details = null) {
    const errorPayload = {
      code,
      details: details || []
    };

    return res.status(statusCode).json({
      success: false,
      message,
      error: errorPayload
    });
  }
}

module.exports = ApiResponse;
