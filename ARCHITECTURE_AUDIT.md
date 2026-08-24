# Architecture Audit & System Inventory

**Project Path**: `/Users/dennismaliqbarnes/Downloads/jcal-node-demo`  
**Date**: August 24, 2026  
**Auditor**: Lead Software Architect & AGY Autonomous System Agent

---

## 1. System Overview & Feature Inventory

### 1.1 Public Website Features
- **Header & Navigation**: Fixed glassmorphic navigation header (`.site-header`) with mobile drawer menu.
- **Hero & Ministry Overview**: Vision statement, service time quick-card ("Gather With Us"), and main calls-to-action ("Plan Your Visit", "Join Livestream").
- **Gather With Us Info Card**: Clean service schedules (Sunday 11:00 AM, Tuesday Bible Study 7:00 PM), physical address (1001 Victory Dr, Westwego, LA), and telephone contact.
- **Doctrinal Beliefs**: Apostolic Pentecostal core doctrines grid.
- **Founding Legacy Tribute**: Video memorial for Apostle Dr. Ronnie Ray Stewart, Sr., featuring an autostarting/looping MP4 video player and text tribute.
- **Servant Leadership Directory**: Profile cards for ministry leadership.
- **Ministry Branches & Outreach**: Descriptions of youth, family, and community outreach ministries.
- **Upcoming Events**: Dynamic event cards (e.g. Mid-Week Bible Study).
- **Interactive Photo Gallery**: Carousel slider showcasing Vacation Bible School (VBS) and church events, with background audio playback options.
- **Giving Portal**: QR codes and links for Givelify, Cash App (`$JoyInv`), and Zelle (`jcalministriesintl@gmail.com`).
- **Contact & Prayer Form**: Submission form for general inquiries and prayer requests.
- **Location Map**: Google Maps iframe pointing to Westwego, LA.

### 1.2 CMS Features (Admin Portal)
- **Modal Login**: Embedded login overlay in `index.html#admin`.
- **Content Editor Dashboard**: Editable fields for events, service announcements, giving handles, and carousel slides.
- **Prayer & Contact Inbox**: View submissions sent from the public website.
- **Password Reset**: Admin password update modal.
- **Media Uploaders**: Base64 JSON upload modal for carousel photos and background audio.

### 1.3 Broadcast Studio Features (`admin-studio.html`, `admin-studio.js`, `admin-studio.css`)
- **Hardware Device Selection**: Enumeration and selection of camera (`<select id="select-camera">`) and microphone (`<select id="select-mic">`) inputs.
- **Local Preview & Controls**: Start/stop camera toggle, microphone mute/unmute, and CSS color filters (Normal, Warm, Soft, Black & White).
- **Metadata Management**: Sermon Title and Speaker input fields.
- **Master Live Toggle**: `🔴 GO LIVE BROADCAST` / `⏹ END BROADCAST` button with confirmation prompt.
- **Studio Analytics**: Realtime counter cards for Live Viewers, Broadcast Duration Timer (`00:00:00`), Hardware Stream Resolution & FPS, and Praise Reactions.
- **Chat Moderation Panel**: Realtime incoming viewer chat list with admin delete action buttons (`🗑 Delete`).
- **Studio Action Bar**: Quick navigation buttons for `← Back to CMS Admin Portal` and `Preview Public Stream ↗`.

### 1.4 Viewer / Player Features (`stream.html`, `stream.js`, `stream.css`)
- **Live Stream Header**: Floating glass header with brand logo and dynamic status pill (`🔴 LIVE SERVICE IN PROGRESS` or `⏳ SERVICE STANDBY`).
- **Video Theatre Container**: Primary display viewport for the broadcast feed with standby screen overlay (`.standby-screen`).
- **Metadata Card**: Displays current Sermon Title, Speaker, and Service Details.
- **Interactive Praise Reactions**: Reaction bar with floating emoji animations (`🙌`, `❤️`, `🔥`, `🙏`, `👏`).
- **Live Viewer Chat**: Realtime public chat submission form and message thread with anonymous or custom author display names.
- **Quick Links**: Direct navigation to Main Website and Giving Portal.

---

## 2. Verification of Current Streaming Behavior

### 2.1 Empirical Verification of Codebase Implementation
Inspecting `public/admin-studio.js`, `public/script.js`, `public/stream.js`, and `server.js` confirms the following current streaming mechanics:

| Component / Property | Code Implementation | Status / Finding |
| :--- | :--- | :--- |
| **Camera & Microphone Capture** | `navigator.mediaDevices.getUserMedia({ video: { ideal: 1920, max: 1920 }, audio: true })` | ✅ Captured locally in browser |
| **Canvas Drawing & Scaling** | Draws video element into a `1280x720` canvas | ✅ Executed locally in JS |
| **Frame Encoding** | `hiddenCanvas.toDataURL('image/jpeg', 0.65)` | ⚠️ Converts canvas frame to Base64 JPEG data URL |
| **Frame Transport Protocol** | `POST /api/stream/frame` with `{ frame: dataUrl }` every 150ms | ❌ HTTP POST JSON polling (NOT streaming) |
| **Viewer Delivery Protocol** | `GET /api/stream/frame` polled every 150ms by each viewer | ❌ HTTP GET JSON polling into `<img id="live-camera-img">` |
| **Audio Transmission** | Microphone captured via `getUserMedia` but **never transmitted** | ❌ **No audio delivered to public viewers** |
| **Server State & Storage** | Frames written to `/tmp/jcal_stream_frame.json` and in-memory variable `currentLiveFrame` | ❌ Ephemeral, unscalable file/memory buffer |
| **Protocol Labeling** | Labeled as `streamType: "webrtc"` in JSON payloads and comments | ❌ **Misleading label**: Zero RTCPeerConnection, SDP, ICE, or SFU usage |

### 2.2 Terminology & Architectural Correction
The current transport is **JPEG-over-HTTP polling**, which incurs massive bandwidth overhead, high server CPU usage, zero audio delivery, and complete lack of adaptive streaming (HLS/DASH). **It must not be described as WebRTC.**

---

## 3. Comprehensive Technical Audit & Vulnerabilities

### 3.1 Security Vulnerabilities
1. **Plaintext Password Storage**: `data/content.json` stores administrator password in plaintext (`"password": "jcalministries2026!"`).
2. **Hard-coded Fallback Credentials**: `server.js` contains hard-coded fallback credentials (`admin` / `JCAL2026!`).
3. **Deterministic & Non-Expiring Session Tokens**: `generateAuthToken()` uses an HMAC hash of `username:password:JWT_SECRET` which never expires, enabling permanent replay attacks if intercepted.
4. **Indefinite LocalStorage Token Persistence**: Client-side JS stores tokens indefinitely in `localStorage.getItem('jcal_admin_token')` with no session rotation or server-side revocation lookup.
5. **Raw `innerHTML` XSS Exposure**: In `stream.js` and `admin-studio.js`, chat messages and praise reactions are appended via `innerHTML` without HTML entity encoding, creating severe stored XSS vulnerabilities if malicious script tags are submitted.
6. **Unrestricted Frame POST Access**: `POST /api/stream/frame` accepts frames if `state.isLive === true`, allowing unauthorized external clients to overwrite live broadcast frames.
7. **Missing Rate Limiting**: Zero rate limiting on `/api/login`, `/api/contact`, `/api/stream/chat`, or file upload routes, opening the app to brute force, spam, and DoS attacks.
8. **Unsanitized File Uploads**: Base64 photo and audio upload endpoints (`/api/upload/photo`, `/api/upload/audio`) do not validate MIME types, magic bytes, file extensions, or image dimensions.
9. **Sensitive Contact/Prayer Submissions in Plaintext File**: Prayer requests containing confidential user contact details are written to unencrypted `data/content.json`.

### 3.2 Duplicate & Conflicting Implementations
1. **Multiple Broadcast Implementations**: Broadcast camera capture, frame encoding, and live state triggers exist in BOTH `public/admin-studio.js` AND `public/script.js` (CMS tab).
2. **Duplicate Chat Rendering & State Loops**: Chat message fetching and rendering loops are duplicated across `public/stream.js`, `public/admin-studio.js`, and `public/script.js`.
3. **Overlapping Login Modals**: `public/index.html` and `public/script.js` contain duplicate CMS login modal state handlers.

### 3.3 Accessibility (a11y) Defects
1. **Missing Form Field Labels**: Form controls in `index.html#admin` and `stream.html` lack explicit `<label>` or `aria-label` bindings.
2. **Keyboard Navigation Trap**: Custom modal dialogs lack focus traps and keyboard `Escape` closing event listeners.
3. **Insufficient Color Contrast**: Gold-on-white text in secondary badges falls below WCAG 2.1 AA 4.5:1 ratio recommendations.
4. **Heading Hierarchy Gaps**: Non-semantic `<h3>` and `<h4>` elements are used without logical `<h1>` -> `<h2>` sequence.

### 3.4 Performance & Caching Deficiencies
1. **Global No-Cache Headers**: `server.js` and `vercel.json` currently serve `Cache-Control: no-cache, no-store, max-age=0` for ALL requests, completely disabling browser caching for immutable static assets (images, logos, fonts).
2. **Excessive Base64 Payload Overhead**: Base64 JSON frame transport inflates payload sizes by ~33%, causing unnecessary network serialization latency.
3. **Unoptimized Repository Assets**: Oversized PNG images (`public/images/lighthouse.png` = 2.8 MB) and duplicate M4A audio files (`public/audio/` = 13.7 MB total) reside directly inside the Git repository.

### 3.5 Deployment Blockers
1. **Vercel Ephemeral Filesystem (`EROFS`)**: Vercel serverless functions have a read-only filesystem outside `/tmp`.
2. **Loss of Shared State across Serverless Lambdas**: Memory variables (`streamState`, `liveChatMessages`, `activeViewerHeartbeats`) are reset whenever Vercel spins up new function instances or cold-starts.
3. **File-Based Writes at Runtime**: `saveData()` attempts to write to `data/content.json`, which fails in production serverless environments.

### 3.6 Automated Testing Deficiencies
- **Zero Automated Tests**: The repository contains 0 unit tests, 0 integration tests, and 0 end-to-end browser test suites.

---

## 4. Proposed Target Architecture

```
                                  ┌───────────────────────────┐
                                  │   OBS / Hardware Encoder  │
                                  │    RTMPS / SRT Ingest     │
                                  └─────────────┬─────────────┘
                                                │
                                                ▼
                                  ┌───────────────────────────┐
                                  │  Livepeer / Mux Streaming │
                                  │ HLS/DASH Adaptive Bitrate │
                                  └─────────────┬─────────────┘
                                                │ HLS Stream URL (.m3u8)
                                                ▼
 ┌───────────────────────────┐    ┌───────────────────────────┐
 │   Broadcaster Studio UI   │    │  Public Stream Player UI  │
 │ (admin-studio.html/js/css)│    │   (stream.html/js/css)    │
 └─────────────┬─────────────┘    └─────────────┬─────────────┘
               │                                │
               │ HTTP API / WebSockets          │ HTTP HLS / WebSockets
               ▼                                ▼
 ┌────────────────────────────────────────────────────────────┐
 │                  Node.js / Express Server                  │
 │   - Auth & Session Management (Argon2id + Signed Cookies)  │
 │   - CMS Content & Metadata API                             │
 │   - Realtime WebSocket Server (Chat, Reactions, Status)    │
 └──────────────┬───────────────────────────────┬─────────────┘
                │                               │
                ▼                               ▼
 ┌───────────────────────────┐    ┌───────────────────────────┐
 │   MongoDB Atlas Database  │    │ Cloudinary / S3 Storage   │
 │   (Mongoose ODM Schemas)  │    │ (Signed Direct Uploads)   │
 └───────────────────────────┘    └───────────────────────────┘
```

1. **Live Media Architecture**:
   - **Ingest**: OBS Studio or hardware encoder broadcasting RTMPS/SRT at 1080p 30fps (H.264 video + AAC audio).
   - **Distribution**: Livepeer / Mux managed video provider supplying multi-bitrate HLS/DASH transcoding (1080p, 720p, 480p, 360p).
   - **Player**: Production HLS player (`hls.js`) in `public/stream.js` with full audio, adaptive bitrate, quality selector, and automatic reconnection.
2. **Durable Data Store**:
   - MongoDB database with Mongoose ODM schemas (`User`, `Event`, `ServiceSchedule`, `GivingConfig`, `CarouselSlide`, `ContactMessage`, `StreamSession`) replacing `data/content.json`.
3. **Media & Asset Storage**:
   - Cloudinary / AWS S3 object storage for user uploads (photos, audio files, VBS carousels, tribute video) with signed upload URLs.
4. **Realtime Communication**:
   - WebSocket / Server-Sent Events engine for instant chat, praise reactions, and live status updates without HTTP polling.
5. **Security & Auth**:
   - Argon2id/bcrypt password hashing, HttpOnly SameSite secure cookies, role-based authorization, rate limiting, and HTML output encoding.
