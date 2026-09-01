const express = require('express');
const topicController = require('../controllers/topicController');
const {
  validate,
  topicParamSchema,
  topicPatternParamSchema
} = require('../middleware/validationMiddleware');

const router = express.Router();

// GET /api/v1/topics - List all available topics with question counts
router.get('/', topicController.getAllTopics);

// GET /api/v1/topics/:topic/patterns - List patterns belonging to a topic
router.get(
  '/:topic/patterns',
  validate(topicParamSchema, 'params'),
  topicController.getTopicPatterns
);

// GET /api/v1/topics/:topic/count - Get question count for a topic
router.get(
  '/:topic/count',
  validate(topicParamSchema, 'params'),
  topicController.getTopicCount
);

// GET /api/v1/topics/:topic/patterns/:pattern/count - Get question count for pattern
router.get(
  '/:topic/patterns/:pattern/count',
  validate(topicPatternParamSchema, 'params'),
  topicController.getPatternCount
);

module.exports = router;
