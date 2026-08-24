// Vercel deployment cache flush build timestamp: 2026-08-24T16:01:00
const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();
const DEFAULT_PORT = parseInt(process.env.PORT, 10) || 3000;
const DATA_FILE = path.join(__dirname, 'data', 'content.json');

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(express.static(path.join(__dirname, 'public'), {
  setHeaders: (res, filePath) => {
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate, max-age=0');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    if (filePath.endsWith('.m4a')) {
      res.setHeader('Content-Type', 'audio/mp4');
    } else if (filePath.endsWith('.mp3')) {
      res.setHeader('Content-Type', 'audio/mpeg');
    } else if (filePath.endsWith('.wav')) {
      res.setHeader('Content-Type', 'audio/wav');
    } else if (filePath.endsWith('.aac')) {
      res.setHeader('Content-Type', 'audio/aac');
    }
  }
}));

const SESSIONS_FILE = path.join(__dirname, 'data', 'sessions.json');
const UPLOADS_DIR = path.join(__dirname, 'public', 'images', 'uploads');
const AUDIO_DIR = path.join(__dirname, 'public', 'audio');

// Helper to read data file
function getData() {
  try {
    if (!fs.existsSync(DATA_FILE)) {
      return null;
    }
    const raw = fs.readFileSync(DATA_FILE, 'utf8');
    return JSON.parse(raw);
  } catch (err) {
    console.error('Error reading content.json:', err);
    return null;
  }
}

// Helper to write data file
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

const crypto = require('crypto');
const JWT_SECRET = process.env.JWT_SECRET || 'jcal_kingdom_ministries_secret_key_2026';

function generateAuthToken(username, password) {
  const payload = `${username}:${password}:${JWT_SECRET}`;
  const hash = crypto.createHmac('sha256', JWT_SECRET).update(payload).digest('hex');
  return `jcal_signed_${hash}`;
}

function verifyAuthToken(token) {
  if (!token) return false;
  const data = getData();
  const adminUser = (data && data.admin && data.admin.username) ? data.admin.username : 'admin';
  const adminPass = (data && data.admin && data.admin.password) ? data.admin.password : 'JCAL2026!';
  const validToken = generateAuthToken(adminUser, adminPass);
  return token === validToken;
}

// Auth Middleware
function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.replace('Bearer ', '').trim();
  if (verifyAuthToken(token)) {
    return next();
  }
  return res.status(401).json({ error: 'Session expired or unauthorized. Please log in again.' });
}

// API Routes
app.post('/api/login', (req, res) => {
  const { username, password } = req.body || {};
  const data = getData();
  const validUser = (data && data.admin && data.admin.username) ? data.admin.username : 'admin';
  const validPass = (data && data.admin && data.admin.password) ? data.admin.password : 'JCAL2026!';

  if (username === validUser && password === validPass) {
    const token = generateAuthToken(username, password);
    return res.json({ success: true, token, username: validUser });
  }

  return res.status(401).json({ error: 'Invalid username or password.' });
});

app.post('/api/logout', (req, res) => {
  return res.json({ success: true });
});

app.get('/api/check-auth', (req, res) => {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.replace('Bearer ', '').trim();
  if (verifyAuthToken(token)) {
    return res.json({ authenticated: true });
  }
  return res.json({ authenticated: false });
});

// Photo Upload Endpoint
app.post('/api/upload/photo', requireAuth, (req, res) => {
  try {
    const { filename, fileData } = req.body || {};
    if (!filename || !fileData) {
      return res.status(400).json({ error: 'Missing filename or image data.' });
    }

    const cleanBase64 = fileData.replace(/^data:[^;]+;base64,/, '');
    const buffer = Buffer.from(cleanBase64, 'base64');

    const baseName = filename.replace(/^\d{13}-/, '').replace(/[^a-zA-Z0-9.-]/g, '_');
    const safeName = Date.now() + '-' + baseName;
    const targetPath = path.join(UPLOADS_DIR, safeName);

    fs.writeFileSync(targetPath, buffer);
    return res.json({ success: true, url: `/images/uploads/${safeName}` });
  } catch (err) {
    console.error('Photo upload error:', err);
    return res.status(500).json({ error: 'Failed to upload photo.' });
  }
});

// Audio Upload Endpoint
app.post('/api/upload/audio', requireAuth, (req, res) => {
  try {
    const { filename, fileData } = req.body || {};
    if (!filename || !fileData) {
      return res.status(400).json({ error: 'Missing filename or audio data.' });
    }

    const cleanBase64 = fileData.replace(/^data:[^;]+;base64,/, '');
    const buffer = Buffer.from(cleanBase64, 'base64');

    const baseName = filename.replace(/^\d{13}-/, '').replace(/[^a-zA-Z0-9.-]/g, '_');
    const safeName = Date.now() + '-' + baseName;
    const targetPath = path.join(AUDIO_DIR, safeName);

    fs.writeFileSync(targetPath, buffer);
    return res.json({ success: true, url: `/audio/${safeName}` });
  } catch (err) {
    console.error('Audio upload error:', err);
    return res.status(500).json({ error: 'Failed to upload audio file.' });
  }
});

// Public Contact & Prayer Request Submission Endpoint
app.post('/api/contact', (req, res) => {
  try {
    const { name, email, phone, subject, message } = req.body || {};
    if (!name || !email || !message) {
      return res.status(400).json({ error: 'Name, email, and message are required.' });
    }

    const currentContent = getData();
    const newSubmission = {
      id: 'msg-' + Date.now(),
      name: name.trim(),
      email: email.trim(),
      phone: (phone || '').trim(),
      subject: subject || 'General Inquiry',
      message: message.trim(),
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

app.get('/api/content', (_req, res) => {
  const data = getData();
  if (!data) {
    return res.status(500).json({ error: 'Unable to load content.' });
  }
  // Sanitize password out of response
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

app.put('/api/admin/password', requireAuth, (req, res) => {
  const { currentPassword, newPassword } = req.body || {};
  const currentData = getData() || {};

  if (!currentData.admin || currentData.admin.password !== currentPassword) {
    return res.status(400).json({ error: 'Current password is incorrect.' });
  }

  if (!newPassword || newPassword.length < 6) {
    return res.status(400).json({ error: 'New password must be at least 6 characters.' });
  }

  currentData.admin.password = newPassword;
  if (saveData(currentData)) {
    return res.json({ success: true, message: 'Password updated successfully.' });
  } else {
    return res.status(500).json({ error: 'Failed to update password.' });
  }
});

// In-Memory Live Stream & Ephemeral Chat Store (Active during live broadcast)
let streamState = {
  isLive: false,
  title: "Sunday Anointing & Prophetic Praise Service",
  speaker: "Apostle Joyce B. Stewart",
  streamType: "webrtc", // 'webrtc' | 'embed' | 'youtube' | 'facebook' | 'zoom'
  embedUrl: "",
  viewerCount: 0,
  startTime: null,
  reactionCount: 0,
  hasFrame: false
};

let liveChatMessages = [];
let currentLiveFrame = null;
const activeViewerHeartbeats = new Map();

const STREAM_STATE_FILE = path.join('/tmp', 'jcal_stream_state.json');
const STREAM_FRAME_FILE = path.join('/tmp', 'jcal_stream_frame.json');

function getStreamState() {
  try {
    if (fs.existsSync(STREAM_STATE_FILE)) {
      const raw = fs.readFileSync(STREAM_STATE_FILE, 'utf8');
      const loaded = JSON.parse(raw);
      return { ...streamState, ...loaded };
    }
  } catch (err) {}
  return streamState;
}

function saveStreamState(state) {
  streamState = { ...streamState, ...state };
  try {
    fs.mkdirSync(path.dirname(STREAM_STATE_FILE), { recursive: true });
    fs.writeFileSync(STREAM_STATE_FILE, JSON.stringify(streamState), 'utf8');
  } catch (err) {}
}

function getLiveFrame() {
  try {
    if (fs.existsSync(STREAM_FRAME_FILE)) {
      const raw = fs.readFileSync(STREAM_FRAME_FILE, 'utf8');
      const parsed = JSON.parse(raw);
      // Ensure frame was saved recently (within last 15 seconds)
      if (parsed.frame && (Date.now() - (parsed.timestamp || 0) < 15000)) {
        return parsed.frame;
      }
    }
  } catch (err) {}
  return currentLiveFrame;
}

function saveLiveFrame(frame) {
  currentLiveFrame = frame;
  try {
    fs.writeFileSync(STREAM_FRAME_FILE, JSON.stringify({ frame, timestamp: Date.now() }), 'utf8');
  } catch (err) {}
}

function clearLiveFrame() {
  currentLiveFrame = null;
  try {
    if (fs.existsSync(STREAM_FRAME_FILE)) {
      fs.unlinkSync(STREAM_FRAME_FILE);
    }
  } catch (err) {}
}

// Helper to prune inactive viewers (haven't polled in 12s) and compute real viewer count
function getRealActiveViewerCount(req) {
  const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'viewer-1';
  activeViewerHeartbeats.set(clientIp, Date.now());

  const now = Date.now();
  for (const [ip, lastSeen] of activeViewerHeartbeats.entries()) {
    if (now - lastSeen > 12000) {
      activeViewerHeartbeats.delete(ip);
    }
  }

  return activeViewerHeartbeats.size;
}

// Live Stream Frame Broadcast Endpoints (Real-time camera video stream)
app.post('/api/stream/frame', (req, res) => {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.replace('Bearer ', '').trim();
  const state = getStreamState();

  if (verifyAuthToken(token) || state.isLive) {
    const { frame } = req.body || {};
    if (frame) {
      saveLiveFrame(frame);
      state.hasFrame = true;
      saveStreamState(state);
      return res.json({ success: true });
    }
    return res.status(400).json({ error: 'No frame provided' });
  }
  return res.status(401).json({ error: 'Unauthorized frame broadcast' });
});

app.get('/api/stream/frame', (_req, res) => {
  const state = getStreamState();
  const frame = getLiveFrame();
  if (frame && state.isLive) {
    res.json({ frame });
  } else {
    res.status(204).end();
  }
});

// Live Stream State Endpoints
app.get('/api/stream/state', (req, res) => {
  const state = getStreamState();
  state.viewerCount = getRealActiveViewerCount(req);
  state.reactionCount = liveChatMessages.filter(m => m.type === 'reaction').length;
  res.json(state);
});

app.post('/api/stream/state', requireAuth, (req, res) => {
  const { isLive, title, speaker, streamType, embedUrl } = req.body || {};
  const state = getStreamState();
  
  if (typeof isLive === 'boolean') {
    if (isLive && !state.isLive) {
      state.startTime = Date.now();
    } else if (!isLive) {
      state.startTime = null;
      liveChatMessages = [];
      clearLiveFrame();
      state.hasFrame = false;
    }
    state.isLive = isLive;
  }

  if (title) state.title = title;
  if (speaker) state.speaker = speaker;
  if (streamType) state.streamType = streamType;
  if (embedUrl !== undefined) state.embedUrl = embedUrl;

  state.viewerCount = getRealActiveViewerCount(req);
  state.reactionCount = liveChatMessages.filter(m => m.type === 'reaction').length;

  saveStreamState(state);
  res.json({ success: true, state });
});

// Ephemeral Live Chat & Praise Reaction Endpoints
app.get('/api/stream/chat', (_req, res) => {
  res.json({ messages: liveChatMessages });
});

app.post('/api/stream/chat', (req, res) => {
  const { author, message, reaction } = req.body || {};
  if (!author && !reaction) {
    return res.status(400).json({ error: 'Author or reaction required.' });
  }

  const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const newMsg = {
    id: 'chat-' + Date.now() + '-' + Math.floor(Math.random() * 1000),
    author: (author || 'Anonymous Believer').trim(),
    message: (message || '').trim(),
    reaction: reaction || null,
    timestamp: timeStr,
    type: reaction ? 'reaction' : 'comment'
  };

  liveChatMessages.push(newMsg);
  if (liveChatMessages.length > 100) {
    liveChatMessages.shift();
  }

  res.json({ success: true, message: newMsg });
});

app.delete('/api/stream/chat/:id', requireAuth, (req, res) => {
  const { id } = req.params;
  liveChatMessages = liveChatMessages.filter(m => m.id !== id);
  res.json({ success: true });
});

// Catch-all route serving index.html
app.get('*', (_req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

function startServer(port) {
  const server = app.listen(port, () => {
    console.log(`\n==================================================`);
    console.log(`  JCAL Ministries website & Admin CMS is running!`);
    console.log(`  URL: http://localhost:${port}`);
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
