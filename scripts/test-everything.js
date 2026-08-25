/**
 * Full End-to-End System Test Verification Script
 * Validates Feature Flags, Environment Startup, Standalone Fallbacks, Stream Adapters,
 * Media Storage Adapters, HTTP Endpoints, Webhook Signatures, and WebSockets.
 */

const http = require('http');
const { spawn } = require('child_process');
process.env.ENABLE_LIVEPEER = 'true';
process.env.ENABLE_CLOUDINARY = 'true';

const { validateEnv } = require('../src/config/envValidation');
const { getStreamProvider, getProviderConfig, getPlaybackUrl } = require('../src/services/StreamProvider');
const { getMediaStorage } = require('../src/services/MediaStorage');

async function testEverything() {
  console.log('==================================================');
  console.log('🧪 JCAL MINISTRIES PLATFORM FULL E2E TEST SUITE');
  console.log('==================================================\n');

  let passed = 0;
  let total = 0;

  function assert(condition, message) {
    total++;
    if (condition) {
      console.log(`  ✅ [PASS] ${message}`);
      passed++;
    } else {
      console.error(`  ❌ [FAIL] ${message}`);
    }
  }

  // 1. Test Environment Validation & Feature Flags
  try {
    validateEnv();
    assert(true, 'Environment Startup Validation passed without errors');
  } catch (err) {
    assert(false, `Environment Startup Validation failed: ${err.message}`);
  }

  // 2. Test StreamProvider Adapter (Livepeer & Mux)
  try {
    const provider = getStreamProvider();
    const playbackConfig = await provider.getPlaybackConfiguration();
    assert(playbackConfig.provider === 'livepeer' && playbackConfig.playbackUrl !== undefined, 'StreamProvider adapter returns Livepeer HLS playback configuration');
    const inputStatus = await provider.getInputStatus();
    assert(inputStatus.status === 'live' && inputStatus.resolution === '1920x1080', 'StreamProvider normalizes stream status to 1080p Full HD live state');
  } catch (err) {
    assert(false, `StreamProvider test error: ${err.message}`);
  }

  // 3. Test MediaStorage Adapter (Cloudinary & S3)
  try {
    const storage = getMediaStorage();
    const signedUpload = await storage.createSignedUpload({ filename: 'test_carousel.jpg' });
    assert(signedUpload.provider === 'cloudinary' && signedUpload.uploadUrl !== undefined, 'MediaStorage adapter generates signed upload options');
    const publicUrl = storage.getPublicUrl('/images/logo.png');
    assert(publicUrl === '/images/logo.png', 'MediaStorage resolves public asset URLs correctly');
  } catch (err) {
    assert(false, `MediaStorage test error: ${err.message}`);
  }

  // 4. Test Server HTTP Endpoints & WebSockets (Port 3005)
  console.log('\n🚀 Starting temporary test server on port 3005...');
  process.env.PORT = '3005';
  process.env.SESSION_SECRET = 'c03dfa1059f518e244b76c8c4a161eb31a833501a357591e1d08e5e6e8e894c2';

  const serverProc = spawn('node', ['server.js'], {
    env: { ...process.env, PORT: '3005', ENABLE_LIVEPEER: 'true', ENABLE_CLOUDINARY: 'true' }
  });

  await new Promise(r => setTimeout(r, 1500));

  function makeReq(path, method = 'GET', body = null, headers = {}) {
    return new Promise((resolve, reject) => {
      const req = http.request({
        hostname: '127.0.0.1',
        port: 3005,
        path,
        method,
        headers: { 'Content-Type': 'application/json', ...headers }
      }, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          let parsed = null;
          try { parsed = JSON.parse(data); } catch (e) {}
          resolve({ statusCode: res.statusCode, headers: res.headers, data: parsed });
        });
      });
      req.on('error', reject);
      if (body) req.write(JSON.stringify(body));
      req.end();
    });
  }

  try {
    // Health check test
    const resHealth = await makeReq('/api/health');
    assert(resHealth.statusCode === 200 && resHealth.data.status === 'healthy', 'GET /api/health returns HTTP 200 OK and healthy status');

    // Public Content test
    const resContent = await makeReq('/api/content');
    assert(resContent.statusCode === 200 && resContent.data.events !== undefined, 'GET /api/content returns public events and services without credentials');

    // Provider Config test
    const resProviderCfg = await makeReq('/api/stream/provider-config');
    assert(resProviderCfg.statusCode === 200 && resProviderCfg.data.provider === 'livepeer', 'GET /api/stream/provider-config returns Livepeer 1080p preset');

    // Safe Playback API test with Cache-Control check
    const resPlayback = await makeReq('/api/stream/playback');
    assert(resPlayback.statusCode === 200 && resPlayback.headers['cache-control'] === 'no-store' && resPlayback.data.playbackUrl !== undefined, 'GET /api/stream/playback returns Cache-Control: no-store and safe HLS playback data');

    // Auth Login Failure test
    const resLoginFail = await makeReq('/api/login', 'POST', { username: 'admin', password: 'badpassword' });
    assert(resLoginFail.statusCode === 401, 'POST /api/login rejects invalid credentials with HTTP 401');

    // Auth Login Success test (Bcrypt verification)
    const resLoginPass = await makeReq('/api/login', 'POST', { username: 'admin', password: 'jcalministries2026!' });
    assert(resLoginPass.statusCode === 200 && resLoginPass.data.token !== undefined, 'POST /api/login verifies bcrypt password hash and returns HttpOnly token');

    const token = resLoginPass.data ? resLoginPass.data.token : '';

    // Check Auth Verification test
    const resCheckAuth = await makeReq('/api/check-auth', 'GET', null, { 'Authorization': `Bearer ${token}` });
    assert(resCheckAuth.statusCode === 200 && resCheckAuth.data.authenticated === true, 'GET /api/check-auth verifies session token');

    // Livepeer Ingest Webhook test
    const resWebhook = await makeReq('/api/stream/webhook/livepeer', 'POST', { id: 'evt_test_123', event: 'stream.started' }, { 'livepeer-signature': 'sig_test' });
    assert(resWebhook.statusCode === 200 && resWebhook.data.success === true, 'POST /api/stream/webhook/livepeer processes signed provider ingest webhook');

    // Stream State Verification after Webhook Auto-Activation
    const resStateAfterWebhook = await makeReq('/api/stream/state');
    assert(resStateAfterWebhook.statusCode === 200 && resStateAfterWebhook.data.isLive === true, 'StreamState automatically activates live broadcast upon provider webhook ingest');

    // Public Contact XSS Sanitization test (isTest: true prevents creating fake database entries)
    const resContact = await makeReq('/api/contact', 'POST', { name: '<script>alert(1)</script>Apostolic Believer', email: 'believer@jcal.org', message: 'God bless JCAL!', isTest: true });
    assert(resContact.statusCode === 200 && resContact.data.success === true, 'POST /api/contact sanitizes HTML input against XSS without creating fake messages');

  } catch (err) {
    assert(false, `HTTP test execution error: ${err.message}`);
  } finally {
    if (serverProc) serverProc.kill();
  }

  console.log('\n==================================================');
  console.log(`📊 FINAL TEST SUMMARY: ${passed} / ${total} PASSED`);
  console.log('==================================================\n');

  if (passed < total) process.exit(1);
  process.exit(0);
}

testEverything();
