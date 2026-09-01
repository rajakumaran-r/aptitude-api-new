const mongoose = require('mongoose');
const logger = require('../utils/logger');

let cachedConnection = null;

/**
 * Connect to MongoDB with resilient, non-destructive serverless caching.
 * @param {string} uri - MongoDB connection string
 * @returns {Promise<typeof mongoose>}
 */
const connectDB = async (uri = process.env.MONGODB_URI) => {
  if (cachedConnection && mongoose.connection.readyState === 1) {
    return cachedConnection;
  }

  if (!uri) {
    throw new Error('MONGODB_URI environment variable is not defined.');
  }

  const options = {
    autoIndex: false,
    maxPoolSize: 10,
    serverSelectionTimeoutMS: 8000,
    socketTimeoutMS: 45000,
    bufferCommands: false, // Disable buffering so errors surface immediately instead of hanging 10s
  };

  const cleanUri = String(uri).trim().replace(/\/(\?|$)/, '$1');

  try {
    const conn = await mongoose.connect(cleanUri, options);
    cachedConnection = conn;
    logger.info(`MongoDB Connected successfully: ${conn.connection.host}/${conn.connection.name}`);
    return conn;
  } catch (error) {
    logger.error('Failed to connect to MongoDB:', error);
    throw error;
  }
};

const disconnectDB = async () => {
  try {
    await mongoose.disconnect();
    cachedConnection = null;
    logger.info('MongoDB disconnected gracefully.');
  } catch (error) {
    logger.error('Error disconnecting MongoDB:', error);
    throw error;
  }
};

module.exports = { connectDB, disconnectDB };
