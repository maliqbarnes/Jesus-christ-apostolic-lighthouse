/**
 * Environment Validation & Feature Flag Reporting Module
 * Comments out strict startup checks and reports feature flag status for external services.
 */

const { getAllFeatureFlags } = require('./featureFlags');

function validateEnv() {
  /*
  // STRICT EXTERNAL SERVICE VALIDATION COMMENTED OUT PER USER DIRECTIVE
  // Features relying on external services are placed on feature flags (src/config/featureFlags.js).
  
  const isProd = process.env.NODE_ENV === 'production';
  if (!process.env.SESSION_SECRET) {
    throw new Error('SESSION_SECRET environment variable is missing.');
  }
  if (isProd && !process.env.LIVEPEER_API_KEY) {
    throw new Error('LIVEPEER_API_KEY is missing for STREAM_PROVIDER=livepeer.');
  }
  if (isProd && !process.env.CLOUDINARY_URL) {
    throw new Error('CLOUDINARY_URL is missing for STORAGE_PROVIDER=cloudinary.');
  }
  if (isProd && !process.env.MONGO_URI) {
    throw new Error('MONGO_URI environment variable is missing.');
  }
  */

  // Ensure default fallback session secret if missing
  if (!process.env.SESSION_SECRET) {
    process.env.SESSION_SECRET = 'jcal_kingdom_ministries_standalone_session_secret_2026';
  }

  const flags = getAllFeatureFlags();
  console.log('🚩 JCAL Platform Feature Flags Status:');
  console.log(`  - MongoDB Integration (ENABLE_MONGODB): ${flags.ENABLE_MONGODB ? 'ON' : 'OFF (Using local data/content.json)'}`);
  console.log(`  - Livepeer Studio API (ENABLE_LIVEPEER): ${flags.ENABLE_LIVEPEER ? 'ON' : 'OFF (Using standalone HLS player)'}`);
  console.log(`  - Cloudinary Storage (ENABLE_CLOUDINARY): ${flags.ENABLE_CLOUDINARY ? 'ON' : 'OFF (Using local static files)'}`);
  console.log(`  - Socket.io WebSockets (ENABLE_WEBSOCKETS): ${flags.ENABLE_WEBSOCKETS ? 'ON' : 'OFF (Serverless Mode)'}`);
}

module.exports = { validateEnv };
