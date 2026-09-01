const mongoose = require('mongoose');

/**
 * Individual Answer Schema within a student test attempt
 */
const answerItemSchema = new mongoose.Schema(
  {
    questionId: {
      type: String,
      required: true,
      trim: true
    },
    question: {
      type: String,
      required: true,
      trim: true
    },
    selectedOption: {
      type: String,
      default: null, // null if left unanswered
      trim: true
    },
    correctAnswer: {
      type: String,
      required: true,
      trim: true
    },
    isCorrect: {
      type: Boolean,
      required: true
    },
    topic: {
      type: String,
      required: true,
      trim: true
    },
    pattern: {
      type: String,
      required: true,
      trim: true
    },
    explanation: {
      type: String,
      default: '',
      trim: true
    },
    timeSpentSeconds: {
      type: Number,
      default: 0,
      min: 0
    }
  },
  { _id: false }
);

/**
 * Student Test Attempt Schema
 */
const attemptSchema = new mongoose.Schema(
  {
    studentId: {
      type: String,
      required: [true, 'studentId is required'],
      trim: true,
      index: true
    },
    studentName: {
      type: String,
      default: 'Anonymous Student',
      trim: true
    },
    testType: {
      type: String,
      enum: ['TOPIC', 'PATTERN', 'FULL_MOCK', 'CUSTOM'],
      default: 'TOPIC',
      index: true
    },
    topic: {
      type: String,
      default: null,
      trim: true,
      index: true
    },
    pattern: {
      type: String,
      default: null,
      trim: true
    },
    totalQuestions: {
      type: Number,
      required: true,
      min: 1
    },
    correctAnswers: {
      type: Number,
      required: true,
      min: 0
    },
    incorrectAnswers: {
      type: Number,
      required: true,
      min: 0
    },
    unanswered: {
      type: Number,
      default: 0,
      min: 0
    },
    score: {
      type: Number,
      required: true
    },
    accuracy: {
      type: Number,
      required: true
    },
    timeSpentSeconds: {
      type: Number,
      default: 0,
      min: 0
    },
    answers: {
      type: [answerItemSchema],
      default: []
    }
  },
  {
    timestamps: true,
    versionKey: false,
    autoCreate: false,
    autoIndex: false
  }
);

// Indexes for high-performance student analytics & teacher reporting
attemptSchema.index({ studentId: 1, createdAt: -1 });
attemptSchema.index({ topic: 1, createdAt: -1 });
attemptSchema.index({ createdAt: -1 });

const Attempt = mongoose.models.Attempt || mongoose.model('Attempt', attemptSchema, 'attempts');

module.exports = Attempt;
