/**
 * JCAL Platform Feature Flags Module
 * Controls external service integrations (MongoDB, Livepeer Studio, Cloudinary, WebSockets).
 * Ensures 100% standalone execution when external credentials are absent.
 */

const FEATURE_FLAGS = {
  // Database Feature Flag: Uses MongoDB Atlas if MONGO_URI is set or ENABLE_MONGODB=true, else uses local data/content.json
  ENABLE_MONGODB: process.env.ENABLE_MONGODB === 'true' || (!!process.env.MONGO_URI && !process.env.MONGO_URI.includes('user:password')),

  // Streaming Provider Feature Flag: Uses Livepeer Studio API if LIVEPEER_API_KEY is set or ENABLE_LIVEPEER=true, else uses standalone HLS player
  ENABLE_LIVEPEER: process.env.ENABLE_LIVEPEER === 'true' || !!process.env.LIVEPEER_API_KEY,

  // Storage Provider Feature Flag: Uses Cloudinary API if CLOUDINARY_URL is set or ENABLE_CLOUDINARY=true, else uses local static files
  ENABLE_CLOUDINARY: process.env.ENABLE_CLOUDINARY === 'true' || !!process.env.CLOUDINARY_URL,

  // Realtime WebSockets Feature Flag: Active when not in stateless Vercel lambda environment
  ENABLE_WEBSOCKETS: process.env.ENABLE_WEBSOCKETS !== 'false' && !process.env.VERCEL
};

function getFeatureFlag(flagName) {
  return !!FEATURE_FLAGS[flagName];
}

function getAllFeatureFlags() {
  return { ...FEATURE_FLAGS };
}

module.exports = {
  FEATURE_FLAGS,
  getFeatureFlag,
  getAllFeatureFlags
};
