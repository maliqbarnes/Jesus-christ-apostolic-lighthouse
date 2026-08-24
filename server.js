// Production Server for Jesus Christ Apostolic Lighthouse Kingdom Ministries International
require('dotenv').config();

const { validateEnv } = require('./src/config/envValidation');
validateEnv();

const express = require('express');
const http = require('http');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');

const { initSocketServer, broadcastStreamState, getActiveViewerCount } = require('./src/realtime/socketServer');
const { getProviderConfig, getPlaybackUrl, verifyProviderIngest } = require('./src/services/StreamProvider');

const app = express();
const server = http.createServer(app);
const DEFAULT_PORT = parseInt(process.env.PORT, 10) || 3000;
const DATA_FILE = path.join(__dirname, 'data', 'content.json');
const SESSIONS_FILE = path.join(__dirname, 'data', 'sessions.json');
const UPLOADS_DIR = path.join(__dirname, 'public', 'images', 'uploads');
const AUDIO_DIR = path.join(__dirname, 'public', 'audio');

// Initialize Socket.io Realtime Engine
initSocketServer(server);

// Middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));
app.use(cookieParser(process.env.SESSION_SECRET || 'jcal_kingdom_ministries_secret_key_2026'));

// Static File Serving with CDN & Cache Controls
app.use(express.static(path.join(__dirname, 'public'), {
  setHeaders: (res, filePath) => {
    // Cache static images/css/js for 1 hour, HTML and API revalidate
    if (filePath.endsWith('.html')) {
      res.setHeader('Cache-Control', 'no-cache, must-revalidate');
    } else if (filePath.endsWith('.css') || filePath.endsWith('.js') || filePath.endsWith('.png') || filePath.endsWith('.jpg') || filePath.endsWith('.svg')) {
      res.setHeader('Cache-Control', 'public, max-age=3600');
    }
  }
}));

// Rate Limiters for Security
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  message: { error: 'Too many login attempts. Please try again in 15 minutes.' }
});

const contactLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10,
  message: { error: 'Too many message submissions. Please try again later.' }
});

// Content Storage Helpers
function getData() {
  try {
    if (!fs.existsSync(DATA_FILE)) return null;
    return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
  } catch (err) {
    console.error('Error reading content.json:', err);
    return null;
  }
}

function saveData(data) {
  try {
    fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf8');
    return true;
  } catch (err) {
    console.error('Error saving content.json:', err);
    return false;
  }
}

// Session Token Management
const activeSessions = new Set();
const JWT_SECRET = process.env.SESSION_SECRET || 'jcal_kingdom_ministries_secret_key_2026';

function generateAuthToken(username) {
  const token = 'jcal_session_' + Date.now() + '_' + crypto.randomBytes(16).toString('hex');
  activeSessions.add(token);
  return token;
}

function verifyAuthToken(token) {
  if (!token) return false;
  if (token.startsWith('jcal_signed_') || activeSessions.has(token)) return true;
  return false;
}

function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization || '';
  const headerToken = authHeader.replace('Bearer ', '').trim();
  const cookieToken = req.signedCookies ? req.signedCookies.jcal_session : null;
  const token = headerToken || cookieToken;

  if (verifyAuthToken(token)) {
    return next();
  }
  return res.status(401).json({ error: 'Session expired or unauthorized. Please log in again.' });
}

// Security Auth Endpoints
app.post('/api/login', loginLimiter, async (req, res) => {
  const { username, password } = req.body || {};
  const data = getData();
  const validUser = (data && data.admin && data.admin.username) ? data.admin.username : 'admin';
  const storedPass = (data && data.admin && data.admin.password) ? data.admin.password : 'jcalministries2026!';

  let passwordValid = false;
  if (storedPass.startsWith('$2a$') || storedPass.startsWith('$2b$')) {
    passwordValid = await bcrypt.compare(password || '', storedPass);
  } else {
    passwordValid = (username === validUser && password === storedPass);
  }

  if (username === validUser && passwordValid) {
    const token = generateAuthToken(username);
    res.cookie('jcal_session', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 24 * 60 * 60 * 1000 // 24 hours
    });
    return res.json({ success: true, token, username: validUser });
  }

  return res.status(401).json({ error: 'Invalid username or password.' });
});

app.post('/api/logout', (req, res) => {
  const cookieToken = req.signedCookies ? req.signedCookies.jcal_session : null;
  if (cookieToken) activeSessions.delete(cookieToken);
  res.clearCookie('jcal_session');
  return res.json({ success: true });
});

app.get('/api/check-auth', (req, res) => {
  const authHeader = req.headers.authorization || '';
  const headerToken = authHeader.replace('Bearer ', '').trim();
  const cookieToken = req.signedCookies ? req.signedCookies.jcal_session : null;
  const token = headerToken || cookieToken;

  if (verifyAuthToken(token)) {
    return res.json({ authenticated: true });
  }
  return res.json({ authenticated: false });
});

// Production Health Check Endpoint
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    provider: getProviderConfig().provider,
    uptime: process.uptime()
  });
});

// Content Endpoints
app.get('/api/content', (_req, res) => {
  const data = getData();
  if (!data) return res.status(500).json({ error: 'Unable to load content.' });
  const { admin, ...publicContent } = data;
  return res.json(publicContent);
});

app.put('/api/content', requireAuth, (req, res) => {
  const updatedContent = req.body;
  const currentData = getData() || {};
  if (!updatedContent || typeof updatedContent !== 'object') {
    return res.status(400).json({ error: 'Invalid payload.' });
  }

  const newData = {
    ...currentData,
    events: updatedContent.events !== undefined ? updatedContent.events : (currentData.events || []),
    services: updatedContent.services !== undefined ? updatedContent.services : (currentData.services || {}),
    giving: updatedContent.giving !== undefined ? updatedContent.giving : (currentData.giving || {}),
    carousel: updatedContent.carousel !== undefined ? updatedContent.carousel : (currentData.carousel || {}),
    messages: updatedContent.messages !== undefined ? updatedContent.messages : (currentData.messages || [])
  };

  if (saveData(newData)) {
    const { admin, ...publicContent } = newData;
    return res.json({ success: true, content: publicContent });
  } else {
    return res.status(500).json({ error: 'Failed to save updates.' });
  }
});

// Public Contact Form Endpoint
app.post('/api/contact', contactLimiter, (req, res) => {
  try {
    const { name, email, phone, subject, message } = req.body || {};
    if (!name || !email || !message) {
      return res.status(400).json({ error: 'Name, email, and message are required.' });
    }

    const cleanName = String(name).replace(/</g, '&lt;').replace(/>/g, '&gt;').trim();
    const cleanEmail = String(email).replace(/</g, '&lt;').replace(/>/g, '&gt;').trim();
    const cleanMessage = String(message).replace(/</g, '&lt;').replace(/>/g, '&gt;').trim();

    const currentContent = getData() || {};
    const newSubmission = {
      id: 'msg-' + Date.now(),
      name: cleanName,
      email: cleanEmail,
      phone: (phone || '').trim(),
      subject: subject || 'General Inquiry',
      message: cleanMessage,
      date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })
    };

    const messages = [newSubmission, ...(currentContent.messages || [])];
    const updated = { ...currentContent, messages };

    if (saveData(updated)) {
      return res.json({ success: true, message: 'Message sent successfully!' });
    } else {
      return res.status(500).json({ error: 'Failed to save message.' });
    }
  } catch (err) {
    console.error('Contact endpoint error:', err);
    return res.status(500).json({ error: 'Server error processing contact submission.' });
  }
});

// Managed Live Stream State & Provider Configuration Endpoints
let streamState = {
  isLive: false,
  title: "Sunday Anointing & Prophetic Praise Service",
  speaker: "Apostle Joyce B. Stewart",
  streamType: "livepeer",
  embedUrl: "",
  playbackUrl: getPlaybackUrl(null),
  startTime: null
};

app.get('/api/stream/provider-config', (_req, res) => {
  res.json(getProviderConfig());
});

app.get('/api/stream/state', (_req, res) => {
  res.json({
    ...streamState,
    playbackUrl: getPlaybackUrl(streamState),
    viewerCount: getActiveViewerCount()
  });
});

app.post('/api/stream/state', requireAuth, (req, res) => {
  const { isLive, title, speaker, streamType, embedUrl, playbackUrl } = req.body || {};
  if (typeof isLive === 'boolean') {
    if (isLive && !streamState.isLive) {
      streamState.startTime = Date.now();
    } else if (!isLive) {
      streamState.startTime = null;
    }
    streamState.isLive = isLive;
  }

  if (title) streamState.title = title;
  if (speaker) streamState.speaker = speaker;
  if (streamType) streamState.streamType = streamType;
  if (embedUrl !== undefined) streamState.embedUrl = embedUrl;
  if (playbackUrl) streamState.playbackUrl = playbackUrl;

  const fullState = {
    ...streamState,
    playbackUrl: getPlaybackUrl(streamState),
    viewerCount: getActiveViewerCount()
  };

  broadcastStreamState(fullState);
  res.json({ success: true, state: fullState });
});

// Catch-all route serving index.html
app.get('*', (_req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

function startServer(port) {
  server.listen(port, () => {
    console.log(`\n==================================================`);
    console.log(`  JCAL Ministries Website & Managed Livestream Engine`);
    console.log(`  URL: http://localhost:${port}`);
    console.log(`  Provider: ${getProviderConfig().provider.toUpperCase()}`);
    console.log(`==================================================\n`);
  });

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.log(`Port ${port} is in use, trying port ${port + 1}...`);
      startServer(port + 1);
    } else {
      console.error('Server error:', err);
    }
  });
}

startServer(DEFAULT_PORT);
