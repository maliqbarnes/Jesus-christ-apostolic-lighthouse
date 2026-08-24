/**
 * Serverless-optimized MongoDB Atlas Connection Pool Helper
 * Caches database connection across warm Vercel serverless function invocations.
 */

const mongoose = require('mongoose');

let cachedConnection = null;

async function connectToDatabase() {
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
    console.error('❌ MongoDB Atlas connection error:', err);
    return null;
  }
}

module.exports = { connectToDatabase };
