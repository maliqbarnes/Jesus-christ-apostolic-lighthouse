# Production Deployment & Environment Guide

**Project**: Jesus Christ Apostolic Lighthouse Kingdom Ministries International  
**Target Platform**: Vercel Serverless / Node.js Host  
**Database**: MongoDB Atlas  
**Storage**: AWS S3 / Cloudinary / Supabase Storage  
**Streaming Provider**: Livepeer / Mux Video Infrastructure

---

## 1. Environment Variables Specification (`.env.example`)

Copy `.env.example` to `.env` for local development. In production (Vercel), configure these environment variables in the Vercel Dashboard Settings -> Environment Variables.

```ini
# Application Configuration
NODE_ENV=production
PORT=3000
SESSION_SECRET=your_random_64_character_hex_session_secret_here

# Database Configuration (MongoDB Atlas)
MONGO_URI=mongodb+srv://user:password@cluster.mongodb.net/jcal_ministries?retryWrites=true&w=majority

# Live Streaming Provider Configuration (Livepeer / Mux)
STREAM_PROVIDER=livepeer
LIVEPEER_API_KEY=your_livepeer_api_key_here
MUX_TOKEN_ID=your_mux_token_id_here
MUX_TOKEN_SECRET=your_mux_token_secret_here
STREAM_PLAYBACK_URL=https://livepeercdn.studio/hls/sample/index.m3u8

# Media Object Storage Configuration (Cloudinary / AWS S3)
STORAGE_PROVIDER=cloudinary
CLOUDINARY_URL=cloudinary://api_key:api_secret@cloud_name
AWS_S3_BUCKET=jcal-media-uploads
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your_aws_access_key_id
AWS_SECRET_ACCESS_KEY=your_aws_secret_access_key
```

---

## 2. Serverless Deployment Architecture (Vercel)

1. **Static Assets**:
   - `public/styles.css`, `public/images/`, `public/script.js`, `public/stream.js`, `public/admin-studio.js` are served directly via Vercel's high-speed Edge CDN with appropriate cache headers (Cache-Control: `public, max-age=31536000, immutable` for fingerprinted assets).
2. **Dynamic API & Server Logic**:
   - `server.js` executes as a Vercel Serverless Function mapped in `vercel.json` (`@vercel/node`).
3. **Persistent Data**:
   - All content modifications, user accounts, prayer requests, and stream sessions are written directly to **MongoDB Atlas**, eliminating serverless ephemeral filesystem defects.
4. **Media Uploads**:
   - Media uploads use direct signed upload URLs to Cloudinary / AWS S3, bypassing serverless request size limitations.

---

## 3. Database Migration Procedure

Run the database migration script before launching production to import existing content from `data/content.json` into MongoDB Atlas:

```bash
# Run migration script
node scripts/migrate-content.js
```

---

## 4. Rollback & Health Check Procedures

- **Health Check Endpoint**: `GET /api/health`
  Returns HTTP 200 with database connectivity status and streaming provider readiness.
- **Rollback Procedure**:
  If a deployment issue occurs on Vercel:
  1. Open Vercel Dashboard -> Deployments.
  2. Select the previous stable deployment commit.
  3. Click **Instant Rollback**.
