const mongoose = require('mongoose');
const { getTopicQuestionModel } = require('../models/questionModel');
const { topicRegistry, toCollectionName, toSlug, DISPLAY_NAMES } = require('../config/topicRegistry');
const ApiError = require('../utils/apiError');

let topicsCache = null;
let lastCacheTime = 0;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes cache

class TopicService {
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
        // Fall back to registry baseline
      }
    }
    return topicRegistry.getAllCollectionNames();
  }

  /**
   * Get all topics with question and pattern counts (cached for performance)
   */
  async getAllTopics() {
    const now = Date.now();
    if (topicsCache && now - lastCacheTime < CACHE_TTL_MS) {
      return topicsCache;
    }

    const collectionNames = await this._getLiveCollectionNames();

    const topicDetails = await Promise.all(
      collectionNames.map(async (collName) => {
        try {
          const Model = getTopicQuestionModel(collName);
          const [count, patterns] = await Promise.all([
            Model.countDocuments().catch(() => 0),
            Model.distinct('pattern').catch(() => [])
          ]);

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

    if (topicDetails.length > 0) {
      topicsCache = topicDetails;
      lastCacheTime = now;
    }

    return topicDetails;
  }

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

  async getPatternCount(topicSlug, patternSlugOrName) {
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
