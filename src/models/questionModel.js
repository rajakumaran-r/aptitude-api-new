const mongoose = require('mongoose');

/**
 * Question Schema strictly adhering to the specified 5 fields.
 * autoCreate and autoIndex are set to false so no new collections or index modifications are ever made.
 */
const questionSchema = new mongoose.Schema(
  {
    question: {
      type: String,
      required: [true, 'Question text is required'],
      trim: true
    },
    answer: {
      type: String,
      required: [true, 'Answer is required'],
      trim: true
    },
    options: {
      type: [String],
      required: [true, 'Options array is required'],
      validate: [
        {
          validator: function (val) {
            return Array.isArray(val) && val.length === 4;
          },
          message: 'Options must contain exactly 4 values'
        },
        {
          validator: function (val) {
            return Array.isArray(val) && val.every((opt) => typeof opt === 'string' && opt.trim().length > 0);
          },
          message: 'All 4 options must be non-empty strings'
        }
      ]
    },
    explanation: {
      type: String,
      required: [true, 'Explanation is required'],
      trim: true
    },
    pattern: {
      type: String,
      required: [true, 'Pattern is required'],
      trim: true
    }
  },
  {
    timestamps: true,
    versionKey: false,
    autoCreate: false, // Strictly prevents Mongoose from creating any new collection in MongoDB
    autoIndex: false   // Strictly prevents Mongoose from creating indexes on MongoDB collections
  }
);

// Validate that answer matches one of the 4 options
questionSchema.pre('validate', function (next) {
  if (this.options && Array.isArray(this.options) && this.answer !== undefined && this.answer !== null) {
    const trimmedAnswer = String(this.answer).trim();
    const trimmedOptions = this.options.map((opt) => String(opt).trim());

    if (!trimmedOptions.includes(trimmedAnswer)) {
      this.invalidate('answer', 'Answer must match one of the four options');
    }
  }
  next();
});

// Cache for dynamically bound models per topic collection
const modelsCache = new Map();

/**
 * Get or create a Mongoose model dynamically bound to an existing MongoDB topic collection
 * @param {string} collectionName - e.g. 'percentage', 'profit_and_loss', 'age'
 * @returns {mongoose.Model}
 */
const getTopicQuestionModel = (collectionName) => {
  if (!collectionName) {
    throw new Error('Collection name must be provided to getTopicQuestionModel');
  }

  const normalized = String(collectionName)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, '_');

  if (modelsCache.has(normalized)) {
    return modelsCache.get(normalized);
  }

  const modelName = `Question_${normalized}`;
  const model =
    mongoose.models[modelName] ||
    mongoose.model(modelName, questionSchema, normalized);

  modelsCache.set(normalized, model);
  return model;
};

module.exports = {
  getTopicQuestionModel,
  questionSchema
};
