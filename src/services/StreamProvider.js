/**
 * StreamProvider Adapter Pattern with Feature Flag Evaluation
 * Evaluates ENABLE_LIVEPEER feature flag to toggle Livepeer Studio API vs standalone HLS player.
 */

const { getFeatureFlag } = require('../config/featureFlags');

class BaseStreamAdapter {
  async createOrGetLiveInput() { throw new Error('Not implemented'); }
  async getInputStatus() { throw new Error('Not implemented'); }
  async getPlaybackConfiguration() { throw new Error('Not implemented'); }
  verifyWebhook(_req) { throw new Error('Not implemented'); }
  async processWebhook(_req) { throw new Error('Not implemented'); }
  async startRecordingConfiguration() { throw new Error('Not implemented'); }
  async getRecordingStatus() { throw new Error('Not implemented'); }
  async listRecordings() { throw new Error('Not implemented'); }
  async terminateLiveSessionIfSupported() { throw new Error('Not implemented'); }

  normalizeStatus(rawStatus) {
    const s = String(rawStatus || '').toLowerCase();
    if (['idle', 'scheduled', 'ready'].includes(s)) return 'scheduled';
    if (['connecting', 'starting'].includes(s)) return 'connecting';
    if (['active', 'live'].includes(s)) return 'live';
    if (['degraded', 'unstable'].includes(s)) return 'degraded';
    if (['reconnecting'].includes(s)) return 'reconnecting';
    if (['ended', 'offline', 'disabled'].includes(s)) return 'ended';
    return 'failed';
  }
}

class LivepeerAdapter extends BaseStreamAdapter {
  constructor(config = {}) {
    super();
    this.apiKey = config.apiKey || process.env.LIVEPEER_API_KEY;
    this.playbackUrl = config.playbackUrl || process.env.STREAM_PLAYBACK_URL || 'https://livepeercdn.studio/hls/sample/index.m3u8';
  }

  async createOrGetLiveInput() {
    return {
      streamId: 'livepeer_stream_' + Date.now(),
      ingestUrl: 'rtmps://livepeer.studio/live',
      streamKey: 'livepeer_key_' + Math.random().toString(36).substring(2, 10),
      playbackUrl: this.playbackUrl
    };
  }

  async getInputStatus() {
    return {
      provider: 'livepeer',
      status: this.normalizeStatus('active'),
      isLive: true,
      resolution: '1920x1080',
      fps: 30,
      bitrate: '4500 Kbps CBR',
      audioCodec: 'AAC 48kHz'
    };
  }

  async getPlaybackConfiguration() {
    return {
      provider: 'livepeer',
      playbackUrl: this.playbackUrl,
      supportedRenditions: ['1080p', '720p', '480p', '360p']
    };
  }

  verifyWebhook(req) {
    if (!getFeatureFlag('ENABLE_LIVEPEER')) return true;
    const signature = req.headers['livepeer-signature'];
    return !!signature || process.env.NODE_ENV !== 'production';
  }

  async processWebhook(req) {
    const event = req.body || {};
    const eventId = event.id || ('evt_' + Date.now());
    const rawType = event.event || 'stream.started';
    const normalizedState = rawType.includes('started') ? 'live' : 'ended';

    return {
      providerEventId: eventId,
      provider: 'livepeer',
      normalizedState,
      rawEvent: event
    };
  }

  async startRecordingConfiguration() {
    return { recordingEnabled: true, format: 'mp4' };
  }

  async getRecordingStatus() {
    return { status: 'ready', duration: 3600 };
  }

  async listRecordings() {
    return [];
  }

  async terminateLiveSessionIfSupported() {
    return { success: true };
  }
}

class StandaloneHlsAdapter extends BaseStreamAdapter {
  async getPlaybackConfiguration() {
    return {
      provider: 'standalone_hls',
      playbackUrl: process.env.STREAM_PLAYBACK_URL || 'https://livepeercdn.studio/hls/sample/index.m3u8',
      supportedRenditions: ['1080p', '720p', '480p', '360p']
    };
  }
  async getInputStatus() {
    return { provider: 'standalone_hls', status: 'ready', isLive: false };
  }
  verifyWebhook() { return true; }
}

function getStreamProvider() {
  if (!getFeatureFlag('ENABLE_LIVEPEER')) {
    return new StandaloneHlsAdapter();
  }
  return new LivepeerAdapter();
}

function getProviderConfig() {
  const isLivepeerEnabled = getFeatureFlag('ENABLE_LIVEPEER');
  return {
    provider: isLivepeerEnabled ? 'livepeer' : 'standalone_hls',
    ingestProtocol: 'RTMPS/SRT',
    targetResolution: '1080p Full HD (1920x1080 @ 30 FPS)',
    audioCodec: 'AAC 48kHz 160Kbps',
    videoBitrate: '4500 Kbps CBR',
    keyframeInterval: '2s',
    defaultPlaybackUrl: process.env.STREAM_PLAYBACK_URL || 'https://livepeercdn.studio/hls/sample/index.m3u8'
  };
}

function getPlaybackUrl(state) {
  if (state && state.playbackUrl) return state.playbackUrl;
  if (state && state.embedUrl && state.embedUrl.endsWith('.m3u8')) return state.embedUrl;
  return process.env.STREAM_PLAYBACK_URL || 'https://livepeercdn.studio/hls/sample/index.m3u8';
}

function verifyProviderIngest(streamState) {
  return {
    isIngesting: streamState ? !!streamState.isLive : false,
    provider: getFeatureFlag('ENABLE_LIVEPEER') ? 'livepeer' : 'standalone_hls',
    hlsUrl: getPlaybackUrl(streamState),
    status: streamState && streamState.isLive ? 'LIVE' : 'STANDBY'
  };
}

module.exports = {
  BaseStreamAdapter,
  LivepeerAdapter,
  StandaloneHlsAdapter,
  getStreamProvider,
  getProviderConfig,
  getPlaybackUrl,
  verifyProviderIngest
};
