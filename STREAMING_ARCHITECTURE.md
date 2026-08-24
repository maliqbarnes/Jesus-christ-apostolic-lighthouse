# Streaming Architecture Blueprint & Production Guide

**Project**: Jesus Christ Apostolic Lighthouse Kingdom Ministries International  
**Ingest Protocol**: RTMPS / SRT (OBS Studio, Hardware Encoder)  
**Provider**: Livepeer / Mux Video Infrastructure  
**Delivery Protocol**: Adaptive Bitrate HLS (`.m3u8`) & DASH  
**Target Quality**: 1080p Full HD @ 30 FPS with AAC Audio

---

## 1. Architecture & Protocol Selection

```
┌────────────────────────────────┐
│   OBS Studio / Camera Ingest   │ 1080p 30fps H.264 + AAC Audio
│   RTMPS / SRT Stream Protocol  │ 4.5 Mbps CBR
└───────────────┬────────────────┘
                │ RTMPS / SRT Ingest
                ▼
┌────────────────────────────────┐
│  Livepeer / Mux Streaming API  │ Transcoding & Adaptive Packaging
│   Global CDN Edge Distribution │ (1080p, 720p, 480p, 360p)
└───────────────┬────────────────┘
                │ HLS Playback Manifest (.m3u8)
                ▼
┌────────────────────────────────┐
│   Public Stream Player UI      │ Production Hls.js Player
│ (stream.html / stream.js)      │ Auto & Manual Quality Switching
└────────────────────────────────┘
```

### Protocol Rationale
- **Latency Choice**: Standard-latency HLS/DASH (~2 to 6 seconds latency). This choice maximizes stream stability, enables full 1080p HD quality, ensures synchronized AAC audio, and guarantees universal cross-browser compatibility across mobile Safari (iOS), Chrome, Android, Edge, and Firefox.
- **Transcoding Ladder**:
  - `1080p` (1920x1080 @ 4500 kbps) — High-quality primary renditions
  - `720p` (1280x720 @ 2500 kbps) — Standard HD
  - `480p` (854x480 @ 1200 kbps) — Medium mobile
  - `360p` (640x360 @ 600 kbps) — Low-bandwidth fallback

---

## 2. OBS Studio & Hardware Encoder Configuration Baseline

To broadcast live services from the sanctuary or broadcast booth, configure OBS Studio or your hardware video switcher with the following verified baseline:

| Setting | Recommended Value | Notes |
| :--- | :--- | :--- |
| **Stream Service** | Custom RTMPS | Provided in Admin Studio |
| **Server URL** | `rtmps://live.mux.com/app` or Livepeer Ingest URL | Configured in environment variables |
| **Stream Key** | `[MANAGED_STREAM_KEY]` | Secured in Admin Studio |
| **Base Canvas Resolution** | `1920x1080` | Native camera capture |
| **Output (Scaled) Resolution**| `1920x1080` | 1080p Full HD |
| **Frame Rate** | `30 FPS` | Consistent motion |
| **Rate Control** | `CBR` (Constant Bitrate) | Mandated for stable streaming |
| **Video Bitrate** | `4500 Kbps` to `6000 Kbps` | Requires 10+ Mbps upload speed |
| **Keyframe Interval** | `2 seconds` | Mandated for HLS segment alignment |
| **Video Encoder** | `x264` or `NVENC H.264` | Profile: High, Tune: Film / None |
| **Audio Encoder** | `AAC-LC` | 48 kHz Sample Rate |
| **Audio Bitrate** | `160 Kbps` | High fidelity sanctuary audio |

---

## 3. Player Lifecycle & Fallback Behavior (`stream.js`)

1. **Player Engine**: `Hls.js` integrated with HTML5 `<video id="live-hls-player">`.
2. **Audio Sync**: Native HTML5 audio track playback, replacing the legacy non-audio canvas polling.
3. **Adaptive Bitrate**: Automatically selects the best rendition based on viewer bandwidth, while providing a quality selector menu (`Auto`, `1080p`, `720p`, `480p`, `360p`).
4. **Reconnection & Health Monitoring**:
   - Listens for `Hls.Events.ERROR`.
   - If a network error occurs, attempts automatic segment retry (`hls.startLoad()`).
   - Displays a clean UI state (`📡 Reconnecting to sanctuary feed...`) rather than breaking the UI.
   - If the stream is offline, displays the service schedule and tribute video preview card.
