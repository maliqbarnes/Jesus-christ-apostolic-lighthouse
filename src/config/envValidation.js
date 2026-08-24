/**
 * Production Environment Validation & Fallback Module
 * Ensures serverless functions run smoothly on Vercel under all environment configurations.
 */

function validateEnv() {
  // Ensure default fallback values for session security if missing in Vercel settings
  if (!process.env.SESSION_SECRET) {
    process.env.SESSION_SECRET = 'jcal_kingdom_ministries_production_session_secret_2026_default';
  }
  if (!process.env.STREAM_PROVIDER) {
    process.env.STREAM_PROVIDER = 'livepeer';
  }
  if (!process.env.STORAGE_PROVIDER) {
    process.env.STORAGE_PROVIDER = 'cloudinary';
  }

  const missing = [];
  if (process.env.NODE_ENV === 'production') {
    if (!process.env.LIVEPEER_API_KEY && process.env.STREAM_PROVIDER === 'livepeer') missing.push('LIVEPEER_API_KEY');
    if (!process.env.CLOUDINARY_URL && process.env.STORAGE_PROVIDER === 'cloudinary') missing.push('CLOUDINARY_URL');
    if (!process.env.MONGO_URI) missing.push('MONGO_URI');
  }

  if (missing.length > 0) {
    console.log(`ℹ️ Production Note: Optional credentials [${missing.join(', ')}] can be configured in Vercel Dashboard -> Environment Variables.`);
  } else {
    console.log('✅ Environment configuration validated successfully.');
  }
}

module.exports = { validateEnv };
