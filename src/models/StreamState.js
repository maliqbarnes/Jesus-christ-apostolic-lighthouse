const mongoose = require('mongoose');

const streamStateSchema = new mongoose.Schema({
  key: { type: String, default: 'active_stream', unique: true },
  isLive: { type: Boolean, default: false },
  title: { type: String, default: 'Sunday Anointing & Prophetic Praise Service' },
  speaker: { type: String, default: 'Apostle Joyce B. Stewart' },
  streamType: { type: String, default: 'livepeer' }, // 'livepeer' | 'mux' | 'hls' | 'embed'
  embedUrl: { type: String, default: '' },
  playbackUrl: { type: String, default: '' },
  streamKey: { type: String, default: '' },
  startTime: { type: Number, default: null },
  updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('StreamState', streamStateSchema);
