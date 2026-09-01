const mongoose = require('mongoose');
const { getTopicQuestionModel } = require('../models/questionModel');
const { topicRegistry, toCollectionName, toSlug, DISPLAY_NAMES } = require('../config/topicRegistry');
const ApiError = require('../utils/apiError');

class TopicService {
  /**
   * Discovers all active topic collections directly from MongoDB
   * @returns {Promise<string[]>} List of collection names
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
        // Fall back to registry baseline if listCollections fails
      }
    }
    return topicRegistry.getAllCollectionNames();
  }

  /**
   * Get all topics directly from MongoDB with live question and pattern counts
   */
  async getAllTopics() {
    const collectionNames = await this._getLiveCollectionNames();

    const topicDetails = await Promise.all(
      collectionNames.map(async (collName) => {
        try {
          const Model = getTopicQuestionModel(collName);
          const count = await Model.countDocuments();
          const patterns = await Model.distinct('pattern');

          const topicMeta = topicRegistry.getTopic(collName) || {
            slug: toSlug(collName),
            collectionName: collName,
            name: DISPLAY_NAMES[collName] || collName.split('_').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
          };

          return {
            slug: topicMeta.slug,
            collectionName: collName,
            name: topicMeta.name,
            patternCount: patterns.length,
            questionCount: count,
            patterns
          };
        } catch (err) {
          return {
            slug: toSlug(collName),
            collectionName: collName,
            name: DISPLAY_NAMES[collName] || collName,
            patternCount: 0,
            questionCount: 0,
            patterns: []
          };
        }
      })
    );

    return topicDetails;
  }

  /**
   * Get patterns belonging to a specific topic directly from its MongoDB collection
   */
  async getTopicPatterns(topicSlug) {
    const topic = topicRegistry.getTopic(topicSlug);
    if (!topic) {
      throw ApiError.notFound(`Topic '${topicSlug}' not found`);
    }

    const Model = getTopicQuestionModel(topic.collectionName);
    const patterns = await Model.distinct('pattern');

    return {
      topic: topic.name,
      slug: topic.slug,
      collectionName: topic.collectionName,
      patterns: patterns || []
    };
  }

  /**
   * Get question count for a specific topic directly from its collection
   */
  async getTopicCount(topicSlug) {
    const topic = topicRegistry.getTopic(topicSlug);
    if (!topic) {
      throw ApiError.notFound(`Topic '${topicSlug}' not found`);
    }

    const Model = getTopicQuestionModel(topic.collectionName);
    const count = await Model.countDocuments();

    return {
      topic: topic.name,
      slug: topic.slug,
      collectionName: topic.collectionName,
      count
    };
  }

  /**
   * Get question count for a specific pattern within a topic
   */
  async getPatternCount(topicSlug, patternSlugOrName) {
    const topic = topicRegistry.getTopic(topicSlug);
    if (!topic) {
      throw ApiError.notFound(`Topic '${topicSlug}' not found`);
    }

    const Model = getTopicQuestionModel(topic.collectionName);
    const patterns = await Model.distinct('pattern');

    // Find matching pattern in the database collection
    const target = (patternSlugOrName || '').trim().toLowerCase();
    const resolvedPattern = patterns.find(
      (p) => p.toLowerCase() === target || toSlug(p) === toSlug(target)
    );

    if (!resolvedPattern) {
      throw ApiError.notFound(
        `Pattern '${patternSlugOrName}' not found under topic '${topic.name}'`
      );
    }

    const count = await Model.countDocuments({ pattern: resolvedPattern });

    return {
      topic: topic.name,
      pattern: resolvedPattern,
      count
    };
  }

  /**
   * Resolve topic and return its Mongoose model
   */
  resolveTopicModel(topicSlug) {
    const topic = topicRegistry.getTopic(topicSlug);
    if (!topic) {
      throw ApiError.notFound(`Topic '${topicSlug}' not found`);
    }

    const Model = getTopicQuestionModel(topic.collectionName);
    return {
      topic,
      model: Model
    };
  }

  /**
   * Resolve a specific pattern within a topic collection
   */
  async resolveTopicAndPattern(topicSlug, patternSlugOrName) {
    const topic = topicRegistry.getTopic(topicSlug);
    if (!topic) {
      throw ApiError.notFound(`Topic '${topicSlug}' not found`);
    }

    const Model = getTopicQuestionModel(topic.collectionName);
    const patterns = await Model.distinct('pattern');

    const target = (patternSlugOrName || '').trim().toLowerCase();
    const resolvedPattern = patterns.find(
      (p) => p.toLowerCase() === target || toSlug(p) === toSlug(target)
    );

    if (!resolvedPattern) {
      throw ApiError.notFound(
        `Pattern '${patternSlugOrName}' does not exist under topic '${topic.name}'`
      );
    }

    return {
      topic,
      model: Model,
      pattern: resolvedPattern
    };
  }
}

module.exports = new TopicService();
