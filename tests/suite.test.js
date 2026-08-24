/**
 * Automated System Test Suite for JCAL Ministries Platform
 */

const http = require('http');

function makeRequest(path, method = 'GET', body = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3001,
      path,
      method,
      headers: {
        'Content-Type': 'application/json',
        ...headers
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        let parsed = null;
        try { parsed = JSON.parse(data); } catch (e) {}
        resolve({ statusCode: res.statusCode, headers: res.headers, data: parsed, raw: data });
      });
    });

    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function runTests() {
  console.log('🧪 Starting JCAL Platform Automated Test Suite...\n');
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

  try {
    // Test 1: Health Check Endpoint
    const resHealth = await makeRequest('/api/health');
    assert(resHealth.statusCode === 200 && resHealth.data.status === 'healthy', 'GET /api/health returns 200 OK and status healthy');

    // Test 2: Public Content Endpoint
    const resContent = await makeRequest('/api/content');
    assert(resContent.statusCode === 200 && resContent.data.events !== undefined, 'GET /api/content returns public content without admin password');

    // Test 3: Stream Provider Configuration
    const resProvider = await makeRequest('/api/stream/provider-config');
    assert(resProvider.statusCode === 200 && resProvider.data.provider === 'livepeer', 'GET /api/stream/provider-config returns Livepeer/Mux configuration');

    // Test 4: Auth Login Failure
    const resLoginFail = await makeRequest('/api/login', 'POST', { username: 'admin', password: 'wrongpassword' });
    assert(resLoginFail.statusCode === 401, 'POST /api/login rejects invalid credentials with 401');

    // Test 5: Auth Login Success
    const resLoginPass = await makeRequest('/api/login', 'POST', { username: 'admin', password: 'jcalministries2026!' });
    assert(resLoginPass.statusCode === 200 && resLoginPass.data.token !== undefined, 'POST /api/login accepts valid credentials and returns token');

    const token = resLoginPass.data ? resLoginPass.data.token : '';

    // Test 6: Check Auth Verification
    const resCheckAuth = await makeRequest('/api/check-auth', 'GET', null, { 'Authorization': `Bearer ${token}` });
    assert(resCheckAuth.statusCode === 200 && resCheckAuth.data.authenticated === true, 'GET /api/check-auth verifies session token');

    // Test 7: Stream State Update
    const resStreamState = await makeRequest('/api/stream/state', 'POST', { isLive: true, title: 'Test Anointing Service' }, { 'Authorization': `Bearer ${token}` });
    assert(resStreamState.statusCode === 200 && resStreamState.data.state.isLive === true, 'POST /api/stream/state updates live broadcast state');

    // Test 8: Public Contact Sanitization
    const resContact = await makeRequest('/api/contact', 'POST', { name: '<script>alert(1)</script>Test Believer', email: 'test@example.com', message: 'Hello JCAL!' });
    assert(resContact.statusCode === 200 && resContact.data.success === true, 'POST /api/contact sanitizes input and saves message');

    console.log(`\n==================================================`);
    console.log(`  Test Results: ${passed} / ${total} Passed`);
    console.log(`==================================================\n`);

    if (passed < total) process.exit(1);
  } catch (err) {
    console.error('Test execution error:', err);
    process.exit(1);
  }
}

runTests();
