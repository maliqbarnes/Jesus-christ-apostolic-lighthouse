/**
 * Serverless-optimized MongoDB Atlas Connection Pool Helper
 * Evaluates ENABLE_MONGODB feature flag before attempting connection.
 */

const mongoose = require('mongoose');
const { getFeatureFlag } = require('../config/featureFlags');

let cachedConnection = null;

async function connectToDatabase() {
  // Feature flag check: If ENABLE_MONGODB is false, use local data/content.json gracefully
  if (!getFeatureFlag('ENABLE_MONGODB')) {
    return null;
  }

  const mongoUri = process.env.MONGO_URI;
  if (!mongoUri) {
    return null;
  }

  if (cachedConnection && mongoose.connection.readyState === 1) {
    return cachedConnection;
  }

  try {
    const opts = {
      bufferCommands: false,
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000
    };

    cachedConnection = await mongoose.connect(mongoUri, opts);
    console.log('✅ Connected to MongoDB Atlas pool.');
    return cachedConnection;
  } catch (err) {
    console.warn('⚠️ MongoDB Atlas connection skipped:', err.message);
    return null;
  }
}

module.exports = { connectToDatabase };
