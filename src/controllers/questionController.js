const questionService = require('../services/questionService');
const ApiResponse = require('../utils/apiResponse');

class QuestionController {
  /**
   * GET /api/v1/questions
   * Retrieve paginated questions across all collections
   */
  async getQuestions(req, res, next) {
    try {
      const page = parseInt(req.query.page, 10) || 1;
      const limit = parseInt(req.query.limit, 10) || 20;

      const result = await questionService.getQuestions({ page, limit });

      return ApiResponse.success(
        res,
        200,
        'Questions retrieved successfully',
        result.data,
        result.pagination
      );
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/questions/topic/:topic
   * Retrieve questions directly from topic's collection
   */
  async getQuestionsByTopic(req, res, next) {
    try {
      const { topic } = req.params;
      const page = parseInt(req.query.page, 10) || 1;
      const limit = parseInt(req.query.limit, 10) || 20;

      const result = await questionService.getQuestionsByTopic(topic, { page, limit });

      return res.status(200).json({
        success: true,
        message: `Questions for topic '${result.topic}' retrieved successfully`,
        topic: result.topic,
        collection: result.collection,
        data: result.data,
        pagination: result.pagination
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/questions/topic/:topic/pattern/:pattern
   * Retrieve questions by pattern within a topic collection
   */
  async getQuestionsByPattern(req, res, next) {
    try {
      const { topic, pattern } = req.params;
      const page = parseInt(req.query.page, 10) || 1;
      const limit = parseInt(req.query.limit, 10) || 20;

      const result = await questionService.getQuestionsByPattern(topic, pattern, { page, limit });

      return res.status(200).json({
        success: true,
        message: `Questions for topic '${result.topic}' and pattern '${result.pattern}' retrieved successfully`,
        topic: result.topic,
        collection: result.collection,
        pattern: result.pattern,
        data: result.data,
        pagination: result.pagination
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/questions/random
   * GET /api/v1/questions/topic/:topic/random
   * GET /api/v1/questions/topic/:topic/pattern/:pattern/random
   * Retrieve random unique questions
   */
  async getRandomQuestions(req, res, next) {
    try {
      const { topic, pattern } = req.params;
      const limit = parseInt(req.query.limit, 10) || 10;

      const questions = await questionService.getRandomQuestions({
        topicSlug: topic || null,
        patternSlug: pattern || null,
        limit
      });

      return ApiResponse.success(
        res,
        200,
        'Random questions retrieved successfully',
        questions
      );
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/questions/search
   * Search questions by text and/or pattern across collections
   */
  async searchQuestions(req, res, next) {
    try {
      const { q } = req.query;
      const page = parseInt(req.query.page, 10) || 1;
      const limit = parseInt(req.query.limit, 10) || 20;

      const result = await questionService.searchQuestions({ q, page, limit });

      return ApiResponse.success(
        res,
        200,
        'Search results retrieved successfully',
        result.data,
        result.pagination
      );
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/questions/:id
   * Get single question by ID across collections
   */
  async getQuestionById(req, res, next) {
    try {
      const { id } = req.params;
      const question = await questionService.getQuestionById(id);

      return ApiResponse.success(
        res,
        200,
        'Question retrieved successfully',
        question
      );
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/v1/questions
   * Create a new question in the appropriate topic collection
   */
  async createQuestion(req, res, next) {
    try {
      const question = await questionService.createQuestion(req.body);

      return ApiResponse.success(
        res,
        201,
        'Question created successfully',
        question
      );
    } catch (error) {
      next(error);
    }
  }

  /**
   * PUT /api/v1/questions/:id
   * Update an existing question
   */
  async updateQuestion(req, res, next) {
    try {
      const { id } = req.params;
      const question = await questionService.updateQuestion(id, req.body);

      return ApiResponse.success(
        res,
        200,
        'Question updated successfully',
        question
      );
    } catch (error) {
      next(error);
    }
  }

  /**
   * DELETE /api/v1/questions/:id
   * Delete a question
   */
  async deleteQuestion(req, res, next) {
    try {
      const { id } = req.params;
      await questionService.deleteQuestion(id);

      return ApiResponse.success(
        res,
        200,
        'Question deleted successfully',
        { id }
      );
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new QuestionController();
