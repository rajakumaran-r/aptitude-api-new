const topicService = require('../services/topicService');
const ApiResponse = require('../utils/apiResponse');

class TopicController {
  /**
   * GET /api/v1/topics
   * List all available topics with question counts and patterns
   */
  async getAllTopics(req, res, next) {
    try {
      const topics = await topicService.getAllTopics();

      return ApiResponse.success(
        res,
        200,
        'Topics retrieved successfully',
        topics
      );
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/topics/:topic/patterns
   * Get patterns belonging to a specific topic
   */
  async getTopicPatterns(req, res, next) {
    try {
      const { topic } = req.params;
      const result = await topicService.getTopicPatterns(topic);

      return ApiResponse.success(
        res,
        200,
        `Patterns for topic '${result.topic}' retrieved successfully`,
        result.patterns
      );
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/topics/:topic/count
   * Get question count for a topic
   */
  async getTopicCount(req, res, next) {
    try {
      const { topic } = req.params;
      const result = await topicService.getTopicCount(topic);

      return ApiResponse.success(
        res,
        200,
        `Question count for topic '${result.topic}' retrieved successfully`,
        result
      );
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/topics/:topic/patterns/:pattern/count
   * Get question count for a specific pattern within a topic
   */
  async getPatternCount(req, res, next) {
    try {
      const { topic, pattern } = req.params;
      const result = await topicService.getPatternCount(topic, pattern);

      return ApiResponse.success(
        res,
        200,
        `Question count for pattern '${result.pattern}' in '${result.topic}' retrieved successfully`,
        result
      );
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new TopicController();
