const mongoose = require('mongoose');
const { getTopicQuestionModel } = require('../models/questionModel');
const topicService = require('./topicService');
const { topicRegistry } = require('../config/topicRegistry');
const ApiError = require('../utils/apiError');

/**
 * Escapes regex special characters
 */
const escapeRegex = (str) => {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

class QuestionService {
  /**
   * Helper to discover active collections from MongoDB directly
   */
  async _getLiveCollectionNames() {
    if (mongoose.connection && mongoose.connection.readyState === 1 && mongoose.connection.db) {
      try {
        const collections = await mongoose.connection.db.listCollections().toArray();
        const systemCollections = ['questions', 'attempts', 'users'];
        const names = collections
          .map((c) => c.name)
          .filter((name) => !name.startsWith('system.') && !name.startsWith('.') && !systemCollections.includes(name));
        if (names.length > 0) {
          return names;
        }
      } catch (err) {
        // Fall back to baseline
      }
    }
    return topicRegistry.getAllCollectionNames();
  }

  /**
   * Helper to build $unionWith stages for querying across all active collections in MongoDB
   */
  _buildUnionStages(primaryCollection, allCollections) {
    const otherCollections = allCollections.filter((c) => c !== primaryCollection);
    return otherCollections.map((coll) => ({ $unionWith: { coll } }));
  }

  /**
   * Helper to run deduplicated, paginated aggregation pipeline on a specific model
   */
  async _executeDeduplicatedQuery(Model, matchFilter = {}, page = 1, limit = 20, unionStages = []) {
    const skip = (page - 1) * limit;

    const pipeline = [
      ...unionStages,
      { $match: matchFilter },
      // Deduplicate on question text
      {
        $group: {
          _id: '$question',
          doc: { $first: '$$ROOT' }
        }
      },
      { $replaceRoot: { newRoot: '$doc' } },
      { $sort: { createdAt: -1, _id: -1 } },
      {
        $facet: {
          metadata: [{ $count: 'total' }],
          data: [{ $skip: skip }, { $limit: limit }]
        }
      }
    ];

    const results = await Model.aggregate(pipeline);
    const metadata = results[0]?.metadata[0] || { total: 0 };
    const total = metadata.total;
    const totalPages = Math.ceil(total / limit) || 0;
    const data = results[0]?.data || [];

    return {
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages
      }
    };
  }

  /**
   * Get all questions across all topic collections in MongoDB with pagination and uniqueness
   */
  async getQuestions({ page = 1, limit = 20 }) {
    const collections = await this._getLiveCollectionNames();
    const primaryColl = collections[0] || 'percentage';
    const PrimaryModel = getTopicQuestionModel(primaryColl);
    const unionStages = this._buildUnionStages(primaryColl, collections);

    return this._executeDeduplicatedQuery(PrimaryModel, {}, page, limit, unionStages);
  }

  /**
   * Get questions for a specific topic directly from its collection in MongoDB
   */
  async getQuestionsByTopic(topicSlug, { page = 1, limit = 20 }) {
    const { topic, model } = topicService.resolveTopicModel(topicSlug);

    const result = await this._executeDeduplicatedQuery(model, {}, page, limit);

    return {
      ...result,
      topic: topic.name,
      collection: topic.collectionName
    };
  }

  /**
   * Get questions for a specific pattern within a topic's collection
   */
  async getQuestionsByPattern(topicSlug, patternSlug, { page = 1, limit = 20 }) {
    const { topic, model, pattern } = await topicService.resolveTopicAndPattern(topicSlug, patternSlug);

    const result = await this._executeDeduplicatedQuery(
      model,
      { pattern },
      page,
      limit
    );

    return {
      ...result,
      topic: topic.name,
      collection: topic.collectionName,
      pattern
    };
  }

  /**
   * Get random unique questions across all topic collections or for a specific topic/pattern
   */
  async getRandomQuestions({ topicSlug = null, patternSlug = null, limit = 10 }) {
    let Model;
    let matchFilter = {};
    let unionStages = [];

    if (topicSlug) {
      if (patternSlug) {
        const res = await topicService.resolveTopicAndPattern(topicSlug, patternSlug);
        Model = res.model;
        matchFilter.pattern = res.pattern;
      } else {
        const res = topicService.resolveTopicModel(topicSlug);
        Model = res.model;
      }
    } else {
      const collections = await this._getLiveCollectionNames();
      const primaryColl = collections[0] || 'percentage';
      Model = getTopicQuestionModel(primaryColl);
      unionStages = this._buildUnionStages(primaryColl, collections);
    }

    const pipeline = [
      ...unionStages,
      { $match: matchFilter },
      // Group by question to ensure 100% uniqueness before sampling
      {
        $group: {
          _id: '$question',
          doc: { $first: '$$ROOT' }
        }
      },
      { $replaceRoot: { newRoot: '$doc' } },
      { $sample: { size: limit } }
    ];

    const questions = await Model.aggregate(pipeline);
    return questions;
  }

  /**
   * Search questions by query string across all topic collections in MongoDB
   */
  async searchQuestions({ q, page = 1, limit = 20 }) {
    const trimmed = q.trim();
    // Prevent short words like "age" from matching inside unrelated words like "percentage" or "average"
    const isShortWord = trimmed.length <= 4 && !/\s/.test(trimmed);
    const safeRegex = isShortWord
      ? new RegExp(`\\b${escapeRegex(trimmed)}(?:s|\x27s)?\\b`, 'i')
      : new RegExp(`\\b${escapeRegex(trimmed)}`, 'i');

    const filter = {
      $or: [{ question: { $regex: safeRegex } }, { pattern: { $regex: safeRegex } }]
    };

    const collections = await this._getLiveCollectionNames();
    const primaryColl = collections[0] || 'percentage';
    const PrimaryModel = getTopicQuestionModel(primaryColl);
    const unionStages = this._buildUnionStages(primaryColl, collections);

    return this._executeDeduplicatedQuery(PrimaryModel, filter, page, limit, unionStages);
  }

  /**
   * Helper to locate a question across all topic collections by its ObjectId
   */
  async _findQuestionAcrossCollections(id) {
    const collections = await this._getLiveCollectionNames();
    for (const coll of collections) {
      const Model = getTopicQuestionModel(coll);
      const doc = await Model.findById(id);
      if (doc) {
        return { question: doc, model: Model, collectionName: coll };
      }
    }
    return null;
  }

  /**
   * Get single question by ID across collections
   */
  async getQuestionById(id, topicHint = null) {
    if (topicHint) {
      const { model } = topicService.resolveTopicModel(topicHint);
      const q = await model.findById(id);
      if (q) return q;
    }

    const result = await this._findQuestionAcrossCollections(id);
    if (!result) {
      throw ApiError.notFound(`Question with ID '${id}' not found`);
    }
    return result.question;
  }

  /**
   * Create a new question in the appropriate topic collection
   */
  async createQuestion(data, topicHint = null) {
    const trimmedQuestion = String(data.question).trim();
    let targetTopicSlug = topicHint;

    if (!targetTopicSlug) {
      targetTopicSlug = 'percentage';
    }

    const { model } = topicService.resolveTopicModel(targetTopicSlug);

    // Check for duplicate in the target collection
    const existing = await model.findOne({
      question: { $regex: new RegExp(`^${escapeRegex(trimmedQuestion)}$`, 'i') }
    });

    if (existing) {
      throw ApiError.conflict('A question with identical text already exists in this topic collection');
    }

    const question = new model({
      question: trimmedQuestion,
      answer: String(data.answer).trim(),
      options: data.options.map((opt) => String(opt).trim()),
      explanation: String(data.explanation).trim(),
      pattern: String(data.pattern).trim()
    });

    await question.save();
    return question;
  }

  /**
   * Update an existing question
   */
  async updateQuestion(id, data, topicHint = null) {
    let targetModel;
    let question;

    if (topicHint) {
      const { model } = topicService.resolveTopicModel(topicHint);
      question = await model.findById(id);
      targetModel = model;
    }

    if (!question) {
      const found = await this._findQuestionAcrossCollections(id);
      if (!found) {
        throw ApiError.notFound(`Question with ID '${id}' not found`);
      }
      question = found.question;
      targetModel = found.model;
    }

    const trimmedQuestion = String(data.question).trim();

    if (trimmedQuestion.toLowerCase() !== question.question.toLowerCase()) {
      const collision = await targetModel.findOne({
        _id: { $ne: id },
        question: { $regex: new RegExp(`^${escapeRegex(trimmedQuestion)}$`, 'i') }
      });

      if (collision) {
        throw ApiError.conflict('Another question with identical text already exists');
      }
    }

    question.question = trimmedQuestion;
    question.answer = String(data.answer).trim();
    question.options = data.options.map((opt) => String(opt).trim());
    question.explanation = String(data.explanation).trim();
    question.pattern = String(data.pattern).trim();

    await question.save();
    return question;
  }

  /**
   * Delete a question across collections
   */
  async deleteQuestion(id, topicHint = null) {
    if (topicHint) {
      const { model } = topicService.resolveTopicModel(topicHint);
      const deleted = await model.findByIdAndDelete(id);
      if (deleted) return deleted;
    }

    const found = await this._findQuestionAcrossCollections(id);
    if (!found) {
      throw ApiError.notFound(`Question with ID '${id}' not found`);
    }

    await found.model.findByIdAndDelete(id);
    return found.question;
  }
}

module.exports = new QuestionService();
