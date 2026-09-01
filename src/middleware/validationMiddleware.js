const Joi = require('joi');
const mongoose = require('mongoose');
const ApiError = require('../utils/apiError');

/**
 * Generic validator middleware factory for Joi schemas
 * @param {Joi.Schema} schema
 * @param {'body'|'query'|'params'} source
 */
const validate = (schema, source = 'body') => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req[source], {
      abortEarly: false,
      stripUnknown: false
    });

    if (error) {
      const details = error.details.map((d) => ({
        field: d.path.join('.'),
        message: d.message.replace(/['"]/g, '')
      }));
      return next(ApiError.badRequest('Validation error', details, 'VALIDATION_ERROR'));
    }

    req[source] = value;
    next();
  };
};

/**
 * Joi custom rule for answer in options validation
 */
const answerInOptionsRule = (value, helpers) => {
  const { answer, options } = value;
  if (answer && Array.isArray(options)) {
    const trimmedAnswer = String(answer).trim();
    const trimmedOptions = options.map((opt) => String(opt).trim());
    if (!trimmedOptions.includes(trimmedAnswer)) {
      return helpers.error('any.custom', {
        customMessage: 'Answer must match one of the four provided options exactly'
      });
    }
  }
  return value;
};

// --- Question Schemas ---

const createQuestionSchema = Joi.object({
  question: Joi.string().trim().min(5).max(2000).required().messages({
    'string.empty': 'Question cannot be empty',
    'any.required': 'Question is required'
  }),
  answer: Joi.string().trim().min(1).max(500).required().messages({
    'string.empty': 'Answer cannot be empty',
    'any.required': 'Answer is required'
  }),
  options: Joi.array()
    .items(Joi.string().trim().min(1).max(500).required())
    .length(4)
    .required()
    .messages({
      'array.base': 'Options must be an array of strings',
      'array.length': 'Options must contain exactly 4 values',
      'any.required': 'Options is required'
    }),
  explanation: Joi.string().trim().min(3).max(5000).required().messages({
    'string.empty': 'Explanation cannot be empty',
    'any.required': 'Explanation is required'
  }),
  pattern: Joi.string().trim().min(2).max(200).required().messages({
    'string.empty': 'Pattern cannot be empty',
    'any.required': 'Pattern is required'
  })
})
  .custom(answerInOptionsRule, 'Answer matches an option check')
  .messages({
    'any.custom': '{{#customMessage}}'
  });

const updateQuestionSchema = Joi.object({
  question: Joi.string().trim().min(5).max(2000).required().messages({
    'string.empty': 'Question cannot be empty',
    'any.required': 'Question is required'
  }),
  answer: Joi.string().trim().min(1).max(500).required().messages({
    'string.empty': 'Answer cannot be empty',
    'any.required': 'Answer is required'
  }),
  options: Joi.array()
    .items(Joi.string().trim().min(1).max(500).required())
    .length(4)
    .required()
    .messages({
      'array.base': 'Options must be an array of strings',
      'array.length': 'Options must contain exactly 4 values',
      'any.required': 'Options is required'
    }),
  explanation: Joi.string().trim().min(3).max(5000).required().messages({
    'string.empty': 'Explanation cannot be empty',
    'any.required': 'Explanation is required'
  }),
  pattern: Joi.string().trim().min(2).max(200).required().messages({
    'string.empty': 'Pattern cannot be empty',
    'any.required': 'Pattern is required'
  })
})
  .custom(answerInOptionsRule, 'Answer matches an option check')
  .messages({
    'any.custom': '{{#customMessage}}'
  });

// --- Query Schemas ---

const paginationQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1).messages({
    'number.base': 'Page must be a valid integer',
    'number.min': 'Page must be greater than or equal to 1'
  }),
  limit: Joi.number().integer().min(1).max(100).default(20).messages({
    'number.base': 'Limit must be a valid integer',
    'number.min': 'Limit must be greater than or equal to 1',
    'number.max': 'Limit cannot exceed 100'
  })
});

const randomQuerySchema = Joi.object({
  limit: Joi.number().integer().min(1).max(100).default(10).messages({
    'number.base': 'Limit must be a valid integer',
    'number.min': 'Limit must be greater than or equal to 1',
    'number.max': 'Limit cannot exceed 100'
  })
});

const searchQuerySchema = Joi.object({
  q: Joi.string().trim().min(1).max(200).required().messages({
    'string.empty': 'Search query parameter q cannot be empty',
    'any.required': 'Search query parameter q is required'
  }),
  page: Joi.number().integer().min(1).default(1).messages({
    'number.min': 'Page must be greater than or equal to 1'
  }),
  limit: Joi.number().integer().min(1).max(100).default(20).messages({
    'number.min': 'Limit must be greater than or equal to 1',
    'number.max': 'Limit cannot exceed 100'
  })
});

// --- Param Schemas ---

const objectIdParamSchema = Joi.object({
  id: Joi.string()
    .custom((value, helpers) => {
      if (!mongoose.Types.ObjectId.isValid(value)) {
        return helpers.error('any.invalid');
      }
      return value;
    })
    .required()
    .messages({
      'any.invalid': 'Invalid MongoDB ObjectId format',
      'any.required': 'ID parameter is required'
    })
});

const topicParamSchema = Joi.object({
  topic: Joi.string().trim().min(1).max(100).required().messages({
    'string.empty': 'Topic parameter cannot be empty',
    'any.required': 'Topic parameter is required'
  })
});

const topicPatternParamSchema = Joi.object({
  topic: Joi.string().trim().min(1).max(100).required().messages({
    'string.empty': 'Topic parameter cannot be empty',
    'any.required': 'Topic parameter is required'
  }),
  pattern: Joi.string().trim().min(1).max(200).required().messages({
    'string.empty': 'Pattern parameter cannot be empty',
    'any.required': 'Pattern parameter is required'
  })
});

// --- Student & Attempt Schemas ---

const answerItemSchema = Joi.object({
  questionId: Joi.string().trim().required(),
  question: Joi.string().trim().required(),
  selectedOption: Joi.string().trim().allow(null, '').default(null),
  correctAnswer: Joi.string().trim().required(),
  isCorrect: Joi.boolean().optional(),
  topic: Joi.string().trim().allow(null, '').default('general'),
  pattern: Joi.string().trim().allow(null, '').default('General'),
  explanation: Joi.string().trim().allow('').default(''),
  timeSpentSeconds: Joi.number().min(0).default(0)
});

const submitAttemptSchema = Joi.object({
  studentId: Joi.string().trim().min(1).max(100).required().messages({
    'string.empty': 'studentId cannot be empty',
    'any.required': 'studentId is required'
  }),
  studentName: Joi.string().trim().min(1).max(100).default('Anonymous Student'),
  testType: Joi.string().valid('TOPIC', 'PATTERN', 'FULL_MOCK', 'CUSTOM').default('TOPIC'),
  topic: Joi.string().trim().allow(null, '').default(null),
  pattern: Joi.string().trim().allow(null, '').default(null),
  timeSpentSeconds: Joi.number().min(0).default(0),
  answers: Joi.array().items(answerItemSchema).min(1).required().messages({
    'array.min': 'Attempt must contain at least 1 question answer',
    'any.required': 'answers array is required'
  })
});

const attemptQuerySchema = Joi.object({
  studentId: Joi.string().trim().min(1).max(100),
  topic: Joi.string().trim().min(1).max(100),
  testType: Joi.string().valid('TOPIC', 'PATTERN', 'FULL_MOCK', 'CUSTOM'),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
  startDate: Joi.date().iso(),
  endDate: Joi.date().iso()
});

const studentParamSchema = Joi.object({
  studentId: Joi.string().trim().min(1).max(100).required().messages({
    'string.empty': 'studentId parameter cannot be empty',
    'any.required': 'studentId parameter is required'
  })
});

module.exports = {
  validate,
  createQuestionSchema,
  updateQuestionSchema,
  paginationQuerySchema,
  randomQuerySchema,
  searchQuerySchema,
  objectIdParamSchema,
  topicParamSchema,
  topicPatternParamSchema,
  submitAttemptSchema,
  attemptQuerySchema,
  studentParamSchema
};
