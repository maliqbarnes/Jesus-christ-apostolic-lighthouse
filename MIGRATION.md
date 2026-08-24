# System Consolidation & Migration Map

**Project Path**: `/Users/dennismaliqbarnes/Downloads/jcal-node-demo`  
**Date**: August 24, 2026  
**Status**: Migration Blueprint & Responsibility Mapping

---

## 1. Retained Features & Visual Identity Mapping

The existing public website design, branding, typography (Playfair Display, Outfit, Cinzel, Inter), color palette (Gold gradients `#b45309`/`#fef08a`, Slate `#0f172a`, Glassmorphic backdrop filters), responsive layout, and content structures will be strictly preserved.

| Component / Feature | Current Location | Preserved Responsibility | Target Implementation |
| :--- | :--- | :--- | :--- |
| **Main Homepage UI** | `public/index.html` | Public ministry website, service schedules, beliefs, leadership, gallery, giving options | Retained in `public/index.html` |
| **Homepage Logic** | `public/script.js` | Nav drawer, smooth scrolling, VBS gallery slider, audio player, contact form, live preview badge | Retained in `public/script.js` (Refactored to remove broadcaster code) |
| **Main Website Styling** | `public/styles.css` | Global tokens, glassmorphism, responsive grid, hero cards, leadership profiles | Retained in `public/styles.css` |
| **Admin Broadcast Studio** | `public/admin-studio.html` | Canonical broadcast control surface, hardware selection, title/speaker controls, live status toggle, moderation | Retained as Canonical Studio Interface |
| **Studio Scripting** | `public/admin-studio.js` | Hardware device discovery, stream metadata updates, live control, chat moderation, analytics | Retained & refactored to interface with streaming provider API |
| **Studio Styling** | `public/admin-studio.css` | Dedicated studio UI styles, analytics stat cards, monitor section | Retained in `public/admin-studio.css` |
| **Public Livestream Page**| `public/stream.html` | Canonical public livestream view, video theatre, sermon metadata, interactive chat, praise reactions | Retained as Canonical Public Player Interface |
| **Public Stream Styling** | `public/stream.css` | Stream layout, glass panels, chat panel styling, floating emojis overlay | Retained in `public/stream.css` |
| **Public Stream Logic** | `public/stream.js` | Video player lifecycle, realtime WebSocket chat, praise reaction animations, viewer presence | Refactored to production HLS player + WebSocket client |

---

## 2. Live Media Ownership & Consolidation Model

### 2.1 Canonical Studio Interface (`admin-studio.html` / `admin-studio.js` / `admin-studio.css`)
- **Responsibilities Retained**: Device enumeration (camera/mic dropdowns), local video preview for camera framing, sermon title and speaker input, `🔴 GO LIVE` master toggle, broadcast timer, viewer analytics, and chat moderation.
- **Media Responsibility Shift**:
  - **REMOVED**: Base64 JPEG frame canvas encoding and `POST /api/stream/frame` loop.
  - **ADDED**: Managed stream state control (`POST /api/stream/state`), stream key generation, provider ingest status checking, and OBS / hardware encoder setup instructions.

### 2.2 Canonical Public Stream Page (`stream.html` / `stream.js` / `stream.css`)
- **Responsibilities Retained**: Responsive theatre container, live status pill header tag, sermon details, praise reaction buttons, realtime chat thread, viewer counter.
- **Media Responsibility Shift**:
  - **REMOVED**: 150ms HTTP GET polling of `/api/stream/frame` into an `<img>` tag.
  - **ADDED**: Production HLS/DASH video player (`hls.js`) supporting **1080p Full HD video with synchronized audio**, multi-bitrate adaptive fallback (1080p, 720p, 480p, 360p), native fullscreen/PiP, and automatic reconnection.

### 2.3 Homepage Stream Consumer (`script.js`)
- **Responsibilities Retained**: Lightweight live badge update ("LIVE SERVICE IN PROGRESS") and preview card link to `stream.html`.
- **Media Responsibility Shift**:
  - **REMOVED**: All camera capture (`getUserMedia`), canvas element creation, JPEG encoding, frame POST loop (`startCmsFrameBroadcasting`), duplicate live state triggers, and duplicate chat rendering code.

---

## 3. Code Removal & Replacement Mapping

| Legacy Code / Endpoint | Source File(s) | Reason for Removal / Replacement | Replacement Implementation |
| :--- | :--- | :--- | :--- |
| `POST /api/stream/frame` | `server.js` | Inefficient, unscalable HTTP POST frame polling | Removed; replaced by OBS RTMPS/SRT or managed WebRTC ingest |
| `GET /api/stream/frame` | `server.js` | High-latency 150ms frame GET polling without audio | Removed; replaced by CDN-served HLS `.m3u8` manifest stream |
| `currentLiveFrame` | `server.js` | In-memory frame storage vulnerable to instance restarts | Removed |
| `STREAM_FRAME_FILE` | `server.js` | `/tmp/jcal_stream_frame.json` transient file storage | Removed |
| `saveLiveFrame()` / `getLiveFrame()` | `server.js` | Base64 frame serialization helpers | Removed |
| `startFrameBroadcasting()` | `admin-studio.js` | 150ms canvas-to-JPEG `toDataURL` loop | Removed from Studio JS |
| `startCmsFrameBroadcasting()` | `script.js` | Duplicate CMS tab frame broadcast loop | Removed from `script.js` |
| `startFetchingLiveFrames()` | `stream.js` | 150ms `<img>` src update polling loop | Replaced by `Hls.js` player initialization |
| Plaintext password in `data/content.json` | `data/content.json` | Security vulnerability | Migrated to hashed password (Argon2id/bcrypt) in DB |
| Deterministic `jcal_signed_*` token | `server.js` | Security vulnerability (non-expiring tokens) | Replaced by HttpOnly signed session cookies with expiration |

---

## 4. Data Migration & Rollback Strategy

### 4.1 Content Migration Script (`scripts/migrate-content.js`)
1. Create an idempotent database migration script that parses `data/content.json`.
2. Seeds database tables (`users`, `events`, `services`, `giving`, `carousel_slides`, `contact_messages`, `stream_records`).
3. Hashes the initial administrator password using Argon2id/bcrypt.
4. Preserves all existing event IDs (`evt-2`), giving handles (`$JoyInv`, `jcalministriesintl@gmail.com`), carousel slides (`slide-3`, VBS slides 1-13), and audio file URLs (`/audio/8553940285143159747.m4a`).

### 4.2 Rollback Strategy
- Keep `data/content.json` backed up in repository as a fallback snapshot during development.
- If database connection fails during initial boot, fall back to read-only mode from `data/content.json` with an explicit administrative warning.
