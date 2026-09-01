const express = require('express');
const attemptController = require('../controllers/attemptController');
const {
  validate,
  submitAttemptSchema,
  attemptQuerySchema,
  studentParamSchema,
  objectIdParamSchema
} = require('../middleware/validationMiddleware');

const router = express.Router();

// 1. Teacher Overview Dashboard (must precede /:id)
router.get('/teacher/overview', attemptController.getTeacherOverview);

// 2. Student Progress & Analytics (must precede /:id)
router.get(
  '/progress/student/:studentId',
  validate(studentParamSchema, 'params'),
  attemptController.getStudentProgress
);

// 3. Student Attempts List (must precede /:id)
router.get(
  '/student/:studentId',
  validate(studentParamSchema, 'params'),
  validate(attemptQuerySchema, 'query'),
  attemptController.getStudentAttempts
);

// 4. Base Attempts CRUD Endpoints
router.get(
  '/',
  validate(attemptQuerySchema, 'query'),
  attemptController.getAttempts
);

router.post(
  '/',
  validate(submitAttemptSchema, 'body'),
  attemptController.submitAttempt
);

// 5. Single Attempt ID Endpoints
router.get(
  '/:id',
  validate(objectIdParamSchema, 'params'),
  attemptController.getAttemptById
);

router.delete(
  '/:id',
  validate(objectIdParamSchema, 'params'),
  attemptController.deleteAttempt
);

module.exports = router;
