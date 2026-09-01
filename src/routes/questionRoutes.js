const express = require('express');
const questionController = require('../controllers/questionController');
const {
  validate,
  createQuestionSchema,
  updateQuestionSchema,
  paginationQuerySchema,
  randomQuerySchema,
  searchQuerySchema,
  objectIdParamSchema,
  topicParamSchema,
  topicPatternParamSchema
} = require('../middleware/validationMiddleware');

const router = express.Router();

// 1. Random Questions Endpoints (must precede /:id)
router.get(
  '/random',
  validate(randomQuerySchema, 'query'),
  questionController.getRandomQuestions
);

router.get(
  '/topic/:topic/random',
  validate(topicParamSchema, 'params'),
  validate(randomQuerySchema, 'query'),
  questionController.getRandomQuestions
);

router.get(
  '/topic/:topic/pattern/:pattern/random',
  validate(topicPatternParamSchema, 'params'),
  validate(randomQuerySchema, 'query'),
  questionController.getRandomQuestions
);

// 2. Search Endpoint (must precede /:id)
router.get(
  '/search',
  validate(searchQuerySchema, 'query'),
  questionController.searchQuestions
);

// 3. Topic and Pattern Filtering Endpoints
router.get(
  '/topic/:topic',
  validate(topicParamSchema, 'params'),
  validate(paginationQuerySchema, 'query'),
  questionController.getQuestionsByTopic
);

router.get(
  '/topic/:topic/pattern/:pattern',
  validate(topicPatternParamSchema, 'params'),
  validate(paginationQuerySchema, 'query'),
  questionController.getQuestionsByPattern
);

// 4. Base Questions (Collection) Endpoints
router.get(
  '/',
  validate(paginationQuerySchema, 'query'),
  questionController.getQuestions
);

router.post(
  '/',
  validate(createQuestionSchema, 'body'),
  questionController.createQuestion
);

// 5. Single Question ID Endpoints
router.get(
  '/:id',
  validate(objectIdParamSchema, 'params'),
  questionController.getQuestionById
);

router.put(
  '/:id',
  validate(objectIdParamSchema, 'params'),
  validate(updateQuestionSchema, 'body'),
  questionController.updateQuestion
);

router.patch(
  '/:id',
  validate(objectIdParamSchema, 'params'),
  validate(updateQuestionSchema, 'body'),
  questionController.updateQuestion
);

router.delete(
  '/:id',
  validate(objectIdParamSchema, 'params'),
  questionController.deleteQuestion
);

module.exports = router;
