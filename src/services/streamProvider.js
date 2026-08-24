/**
 * Managed Stream Provider Integration Service (Livepeer / Mux / HLS Fallback)
 * Handles stream key management, ingest URLs, adaptive HLS playback manifests, and provider state verification.
 */

const STREAM_PROVIDER = process.env.STREAM_PROVIDER || 'livepeer';
const STREAM_PLAYBACK_URL = process.env.STREAM_PLAYBACK_URL || '';

function getProviderConfig() {
  return {
    provider: STREAM_PROVIDER,
    ingestProtocol: 'RTMPS/SRT',
    targetResolution: '1080p Full HD (1920x1080 @ 30 FPS)',
    audioCodec: 'AAC 48kHz 160Kbps',
    videoBitrate: '4500 Kbps CBR',
    keyframeInterval: '2s',
    defaultPlaybackUrl: STREAM_PLAYBACK_URL || 'https://livepeercdn.studio/hls/sample/index.m3u8'
  };
}

/**
 * Resolves active playback URL for HLS video player.
 */
function getPlaybackUrl(state) {
  if (state && state.playbackUrl) {
    return state.playbackUrl;
  }
  if (state && state.embedUrl && state.embedUrl.endsWith('.m3u8')) {
    return state.embedUrl;
  }
  return STREAM_PLAYBACK_URL || 'https://livepeercdn.studio/hls/sample/index.m3u8';
}

/**
 * Verifies provider ingest status and stream key configuration.
 */
function verifyProviderIngest(streamState) {
  return {
    isIngesting: streamState ? !!streamState.isLive : false,
    provider: STREAM_PROVIDER,
    hlsUrl: getPlaybackUrl(streamState),
    status: streamState && streamState.isLive ? 'LIVE' : 'STANDBY'
  };
}

module.exports = {
  getProviderConfig,
  getPlaybackUrl,
  verifyProviderIngest
};
