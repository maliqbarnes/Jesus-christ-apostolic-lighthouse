/**
 * Production Environment Validation Module
 * Validates required environment variables at server startup based on selected providers.
 * Fails closed in production if configuration is incomplete or contains insecure placeholders.
 */

function validateEnv() {
  const isProd = process.env.NODE_ENV === 'production';
  const errors = [];

  // 1. Session Secret Validation
  const sessionSecret = process.env.SESSION_SECRET;
  if (!sessionSecret) {
    errors.push('SESSION_SECRET environment variable is missing.');
  } else if (sessionSecret.length < 32) {
    errors.push('SESSION_SECRET must be at least 32 characters long.');
  } else if (isProd && (sessionSecret.includes('jcal_kingdom_ministries') || sessionSecret === 'change_this_secret')) {
    errors.push('SESSION_SECRET contains an insecure placeholder value.');
  }

  // 2. Stream Provider Validation
  const streamProvider = (process.env.STREAM_PROVIDER || 'livepeer').toLowerCase();
  if (!['livepeer', 'mux'].includes(streamProvider)) {
    errors.push(`Invalid STREAM_PROVIDER "${streamProvider}". Must be "livepeer" or "mux".`);
  }

  if (streamProvider === 'livepeer') {
    if (!process.env.LIVEPEER_API_KEY && isProd) {
      errors.push('LIVEPEER_API_KEY is missing for STREAM_PROVIDER=livepeer.');
    }
  } else if (streamProvider === 'mux') {
    if ((!process.env.MUX_TOKEN_ID || !process.env.MUX_TOKEN_SECRET) && isProd) {
      errors.push('MUX_TOKEN_ID and MUX_TOKEN_SECRET are required for STREAM_PROVIDER=mux.');
    }
  }

  // Sample playback URL rejection in production
  const playbackUrl = process.env.STREAM_PLAYBACK_URL;
  if (isProd && playbackUrl && playbackUrl.includes('sample/index.m3u8')) {
    errors.push('STREAM_PLAYBACK_URL cannot use sample playback URL in production.');
  }

  // 3. Storage Provider Validation
  const storageProvider = (process.env.STORAGE_PROVIDER || 'cloudinary').toLowerCase();
  if (!['cloudinary', 's3'].includes(storageProvider)) {
    errors.push(`Invalid STORAGE_PROVIDER "${storageProvider}". Must be "cloudinary" or "s3".`);
  }

  if (storageProvider === 'cloudinary') {
    if (!process.env.CLOUDINARY_URL && isProd) {
      errors.push('CLOUDINARY_URL is missing for STORAGE_PROVIDER=cloudinary.');
    }
  } else if (storageProvider === 's3') {
    if ((!process.env.AWS_S3_BUCKET || !process.env.AWS_REGION || !process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY) && isProd) {
      errors.push('AWS S3 credentials (AWS_S3_BUCKET, AWS_REGION, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY) are required for STORAGE_PROVIDER=s3.');
    }
  }

  // 4. MongoDB Validation
  const mongoUri = process.env.MONGO_URI;
  if (!mongoUri && isProd) {
    errors.push('MONGO_URI environment variable is missing.');
  } else if (isProd && mongoUri && (mongoUri.includes('user:password') || mongoUri.includes('localhost'))) {
    errors.push('MONGO_URI contains default sample credentials in production.');
  }

  if (errors.length > 0) {
    console.warn('\n⚠️ ENVIRONMENT CONFIGURATION WARNING:');
    errors.forEach(err => console.warn(`  - ${err}`));
    console.warn('\nPlease configure environment variables in Vercel Settings or .env file.\n');
  } else {
    console.log('✅ Environment configuration validated successfully.');
  }
}

module.exports = { validateEnv };
