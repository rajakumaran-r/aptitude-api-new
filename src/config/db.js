const mongoose = require('mongoose');
const logger = require('../utils/logger');

/**
 * Connect to MongoDB with resilient, non-destructive configuration.
 * autoIndex is disabled to ensure existing collections, indexes, and documents are never modified.
 * @param {string} uri - MongoDB connection string
 * @returns {Promise<typeof mongoose>}
 */
const connectDB = async (uri = process.env.MONGODB_URI) => {
  if (!uri) {
    throw new Error('MONGODB_URI environment variable is not defined.');
  }

  const options = {
    autoIndex: false, // Strictly disable autoIndex to ensure existing database data and indexes are never modified
    maxPoolSize: 20, // Maintain up to 20 socket connections
    serverSelectionTimeoutMS: 5000, // Keep trying to send operations for 5 seconds
    socketTimeoutMS: 45000 // Close sockets after 45 seconds of inactivity
  };

  // Sanitize URI to prevent trailing slashes before query params like /aptitudeDB/?appName=...
  const cleanUri = String(uri).trim().replace(/\/(\?|$)/, '$1');

  try {
    const conn = await mongoose.connect(cleanUri, options);
    logger.info(`MongoDB Connected successfully: ${conn.connection.host}/${conn.connection.name}`);

    mongoose.connection.on('error', (err) => {
      logger.error('MongoDB connection error:', err);
    });

    mongoose.connection.on('disconnected', () => {
      logger.warn('MongoDB disconnected. Attempting reconnection...');
    });

    mongoose.connection.on('reconnected', () => {
      logger.info('MongoDB reconnected successfully.');
    });

    return conn;
  } catch (error) {
    logger.error('Failed to connect to MongoDB:', error);
    throw error;
  }
};

/**
 * Disconnect from MongoDB gracefully
 */
const disconnectDB = async () => {
  try {
    await mongoose.disconnect();
    logger.info('MongoDB disconnected gracefully.');
  } catch (error) {
    logger.error('Error disconnecting MongoDB:', error);
    throw error;
  }
};

module.exports = { connectDB, disconnectDB };
