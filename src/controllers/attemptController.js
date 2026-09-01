const attemptService = require('../services/attemptService');
const ApiResponse = require('../utils/apiResponse');

class AttemptController {
  /**
   * POST /api/v1/attempts
   * Record a student's test attempt
   */
  async submitAttempt(req, res, next) {
    try {
      const attempt = await attemptService.recordAttempt(req.body);
      return ApiResponse.success(res, 201, 'Test attempt submitted and recorded successfully', attempt);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/attempts
   * Paginated list of attempts (with topic, testType, studentId filters)
   */
  async getAttempts(req, res, next) {
    try {
      const page = parseInt(req.query.page, 10) || 1;
      const limit = parseInt(req.query.limit, 10) || 20;

      const { data, pagination } = await attemptService.getAttempts({
        ...req.query,
        page,
        limit
      });

      return ApiResponse.success(
        res,
        200,
        'Test attempts retrieved successfully',
        data,
        pagination
      );
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/attempts/teacher/overview
   * Teacher Dashboard Overview: Class-wide analytics, top students, struggling topics
   */
  async getTeacherOverview(req, res, next) {
    try {
      const overview = await attemptService.getTeacherOverview();
      return ApiResponse.success(res, 200, 'Teacher analytics overview retrieved successfully', overview);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/attempts/progress/student/:studentId
   * Comprehensive Student Progress Report (Topic & Pattern performance breakdown)
   */
  async getStudentProgress(req, res, next) {
    try {
      const { studentId } = req.params;
      const progress = await attemptService.getStudentProgress(studentId);
      return ApiResponse.success(
        res,
        200,
        `Progress report for student '${studentId}' retrieved successfully`,
        progress
      );
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/attempts/student/:studentId
   * List all test attempts of a specific student
   */
  async getStudentAttempts(req, res, next) {
    try {
      const { studentId } = req.params;
      const page = parseInt(req.query.page, 10) || 1;
      const limit = parseInt(req.query.limit, 10) || 20;

      const { data, pagination } = await attemptService.getAttempts({
        ...req.query,
        studentId,
        page,
        limit
      });

      return ApiResponse.success(
        res,
        200,
        `Attempts for student '${studentId}' retrieved successfully`,
        data,
        pagination
      );
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/attempts/:id
   * Get single test attempt details by ID (with question-by-question review)
   */
  async getAttemptById(req, res, next) {
    try {
      const { id } = req.params;
      const attempt = await attemptService.getAttemptById(id);
      return ApiResponse.success(res, 200, 'Test attempt details retrieved successfully', attempt);
    } catch (error) {
      next(error);
    }
  }

  /**
   * DELETE /api/v1/attempts/:id
   * Delete test attempt
   */
  async deleteAttempt(req, res, next) {
    try {
      const { id } = req.params;
      const deleted = await attemptService.deleteAttempt(id);
      return ApiResponse.success(res, 200, 'Test attempt deleted successfully', deleted);
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new AttemptController();
