/**
 * Socket.io Realtime Engine for JCAL Livestream Platform
 * Handles instant live chat, floating praise reactions, viewer presence, and live status.
 */

const socketIo = require('socket.io');

let io = null;
let activeViewerCount = 0;
let liveChatHistory = [];

function initSocketServer(server) {
  if (!server) return null;
  try {
    io = socketIo(server, {
      cors: {
        origin: '*',
        methods: ['GET', 'POST']
      }
    });

    io.on('connection', (socket) => {
    activeViewerCount++;
    io.emit('viewerCount', { count: activeViewerCount });

    // Send initial chat history on join
    socket.emit('chatHistory', { messages: liveChatHistory.slice(-50) });

    // Handle Praise Reactions
    socket.on('sendReaction', (data) => {
      const emoji = data && data.reaction ? data.reaction : '🙌';
      io.emit('newReaction', { reaction: emoji, socketId: socket.id });
    });

    // Handle Live Chat Messages with server-side sanitization
    socket.on('sendChatMessage', (data) => {
      const { author, message } = data || {};
      if (!message || message.trim() === '') return;

      // HTML Entity Encoding for XSS Prevention
      const cleanAuthor = String(author || 'Anonymous Believer').replace(/</g, '&lt;').replace(/>/g, '&gt;').trim().slice(0, 40);
      const cleanMessage = String(message).replace(/</g, '&lt;').replace(/>/g, '&gt;').trim().slice(0, 300);
      const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

      const newMsg = {
        id: 'msg-' + Date.now() + '-' + Math.floor(Math.random() * 1000),
        author: cleanAuthor,
        message: cleanMessage,
        timestamp: timeStr,
        type: 'comment'
      };

      liveChatHistory.push(newMsg);
      if (liveChatHistory.length > 100) liveChatHistory.shift();

      io.emit('newChatMessage', newMsg);
    });

    // Handle Admin Chat Moderation (Delete message)
    socket.on('deleteChatMessage', (msgId) => {
      liveChatHistory = liveChatHistory.filter(m => m.id !== msgId);
      io.emit('messageDeleted', { id: msgId });
    });

    socket.on('disconnect', () => {
      activeViewerCount = Math.max(0, activeViewerCount - 1);
      io.emit('viewerCount', { count: activeViewerCount });
    });
  });

  return io;
  } catch (err) {
    console.warn('Socket.io not supported in stateless serverless runtime:', err.message);
    return null;
  }
}

function broadcastStreamState(state) {
  if (io) {
    io.emit('streamStateChanged', state);
  }
}

function getActiveViewerCount() {
  return activeViewerCount;
}

module.exports = {
  initSocketServer,
  broadcastStreamState,
  getActiveViewerCount
};
