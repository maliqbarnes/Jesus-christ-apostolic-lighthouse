/**
 * Production MongoDB Schemas & Indexes for JCAL Platform
 */

const mongoose = require('mongoose');

// 1. Users Collection
const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
  email: { type: String, unique: true, sparse: true, lowercase: true, trim: true, index: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['admin', 'broadcaster', 'editor', 'moderator'], default: 'admin' },
  createdAt: { type: Date, default: Date.now }
});

// 2. Sessions Collection with TTL Index
const sessionSchema = new mongoose.Schema({
  sessionId: { type: String, required: true, unique: true, index: true },
  username: { type: String, required: true },
  expiresAt: { type: Date, required: true, index: { expires: 0 } }
});

// 3. Site Content Collection
const siteContentSchema = new mongoose.Schema({
  key: { type: String, default: 'main_content', unique: true },
  services: { type: Object, default: {} },
  giving: { type: Object, default: {} },
  carousel: { type: Object, default: {} },
  updatedAt: { type: Date, default: Date.now }
});

// 4. Events Collection
const eventSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  tag: { type: String, default: 'EVENT' },
  title: { type: String, required: true },
  time: { type: String, required: true },
  startTime: { type: Date, index: true },
  description: { type: String, default: '' }
});

// 5. Contact Messages Collection
const contactMessageSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, trim: true },
  phone: { type: String, default: '', trim: true },
  subject: { type: String, default: 'General Inquiry' },
  message: { type: String, required: true },
  status: { type: String, enum: ['new', 'read', 'archived'], default: 'new', index: true },
  date: { type: String, required: true },
  createdAt: { type: Date, default: Date.now, index: true }
});

// 6. Stream Configuration Collection
const streamConfigSchema = new mongoose.Schema({
  key: { type: String, default: 'active_config', unique: true },
  provider: { type: String, default: 'livepeer' },
  playbackUrl: { type: String, default: '' },
  streamKey: { type: String, default: '' },
  updatedAt: { type: Date, default: Date.now }
});

// 7. Stream Sessions Collection
const streamSessionSchema = new mongoose.Schema({
  sessionId: { type: String, required: true, unique: true },
  title: { type: String, required: true },
  speaker: { type: String, default: '' },
  startedAt: { type: Date, default: Date.now, index: true },
  endedAt: { type: Date, default: null },
  peakViewers: { type: Number, default: 0 }
});

// 8. Chat Messages Collection with Compound Index
const chatMessageSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  streamSessionId: { type: String, default: 'global_live', index: true },
  author: { type: String, required: true, trim: true },
  message: { type: String, required: true, trim: true },
  type: { type: String, enum: ['comment', 'reaction'], default: 'comment' },
  createdAt: { type: Date, default: Date.now }
});
chatMessageSchema.index({ streamSessionId: 1, createdAt: -1 });

// 9. Moderation Actions Collection
const moderationActionSchema = new mongoose.Schema({
  actionId: { type: String, required: true, unique: true },
  moderator: { type: String, required: true },
  actionType: { type: String, enum: ['delete_message', 'mute_user', 'ban_user'], required: true },
  targetId: { type: String, required: true },
  reason: { type: String, default: '' },
  createdAt: { type: Date, default: Date.now }
});

// 10. Media Assets Collection
const mediaAssetSchema = new mongoose.Schema({
  assetId: { type: String, required: true, unique: true },
  filename: { type: String, required: true },
  url: { type: String, required: true },
  provider: { type: String, required: true },
  mimeType: { type: String, default: '' },
  bytes: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now }
});

// 11. Audit Events Collection
const auditEventSchema = new mongoose.Schema({
  eventId: { type: String, required: true, unique: true },
  actor: { type: String, required: true },
  action: { type: String, required: true },
  details: { type: Object, default: {} },
  createdAt: { type: Date, default: Date.now, index: true }
});

// 12. Provider Webhook Events Collection (Idempotency)
const providerWebhookEventSchema = new mongoose.Schema({
  provider: { type: String, required: true },
  providerEventId: { type: String, required: true },
  eventType: { type: String, required: true },
  processedAt: { type: Date, default: Date.now }
});
providerWebhookEventSchema.index({ provider: 1, providerEventId: 1 }, { unique: true });

module.exports = {
  User: mongoose.model('User', userSchema),
  Session: mongoose.model('Session', sessionSchema),
  SiteContent: mongoose.model('SiteContent', siteContentSchema),
  Event: mongoose.model('Event', eventSchema),
  ContactMessage: mongoose.model('ContactMessage', contactMessageSchema),
  StreamConfig: mongoose.model('StreamConfig', streamConfigSchema),
  StreamSession: mongoose.model('StreamSession', streamSessionSchema),
  ChatMessage: mongoose.model('ChatMessage', chatMessageSchema),
  ModerationAction: mongoose.model('ModerationAction', moderationActionSchema),
  MediaAsset: mongoose.model('MediaAsset', mediaAssetSchema),
  AuditEvent: mongoose.model('AuditEvent', auditEventSchema),
  ProviderWebhookEvent: mongoose.model('ProviderWebhookEvent', providerWebhookEventSchema)
};
