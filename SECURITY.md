# Security Architecture & Threat Model

**Project**: Jesus Christ Apostolic Lighthouse Kingdom Ministries International  
**Scope**: Authentication, Authorization, Input Validation, XSS Prevention, Secret Management, Rate Limiting

---

## 1. Threat Model & Mitigation Strategy

| Vulnerability / Threat Area | Legacy Defect | Mitigated Architecture |
| :--- | :--- | :--- |
| **Password Storage** | Plaintext password in `data/content.json` | Hashed with `bcrypt` / `argon2` with salt rounds = 12 |
| **Hard-coded Fallbacks** | Default fallback passwords (`JCAL2026!`) in code | Server initialization halts if `ADMIN_PASSWORD` or `SESSION_SECRET` is unset in production |
| **Session Management** | Deterministic HMAC hash stored in `localStorage` | Encrypted, HttpOnly, SameSite `lax`/`strict` secure session cookies with explicit expiration and server-side invalidation |
| **Stored XSS** | Untrusted chat messages rendered via `innerHTML` | Context-appropriate HTML entity encoding (`escapeHTML()`) applied to all user input before DOM insertion |
| **Unauthorized Ingest** | `POST /api/stream/frame` open during live broadcasts | Live stream ingest controlled via secure provider webhook signatures & authenticated studio endpoints |
| **Brute Force & Spam** | Zero rate limits on login and forms | `express-rate-limit` middleware applied to `/api/login` (5 req / 15 min), `/api/contact` (3 req / hour), and `/api/stream/chat` (1 msg / 2 sec) |
| **File Upload Vulnerability** | Base64 uploads without type/size validation | MIME type, magic byte, extension, and 5MB size limit validation + random filename generation |
| **Data Protection** | Prayer requests stored in unencrypted JSON | Stored in secured MongoDB cluster with restricted role access |

---

## 2. Role-Based Access Control (RBAC) Matrix

| Role | Access Permissions |
| :--- | :--- |
| **Public Viewer** | View homepage, watch livestream, participate in live chat & praise reactions, submit prayer requests/contact form, view giving links |
| **Moderator** | View live chat, delete inappropriate chat messages, mute/timeout chat users, toggle slow mode |
| **Broadcaster** | Access Broadcaster Studio (`admin-studio.html`), manage sermon title/speaker metadata, trigger stream state (`LIVE`/`OFFLINE`), view ingest health analytics |
| **Administrator** | Full system access: edit CMS content (events, announcements, schedules, carousel slides, giving options), manage user accounts, change password, export messages |

---

## 3. Rate Limiting Specifications

- **Admin Login (`POST /api/login`)**: Max 5 attempts per 15 minutes per IP address.
- **Public Contact Form (`POST /api/contact`)**: Max 3 submissions per hour per IP address.
- **Live Chat Submissions (`POST /api/stream/chat`)**: Max 1 message per 2 seconds per IP/WebSocket connection.
- **Praise Reactions (`POST /api/stream/reactions`)**: Max 5 reactions per 5 seconds per connection.

---

## 4. Secret Management & Credential Rotation

1. **Environment Variables**: All sensitive keys (`MONGO_URI`, `SESSION_SECRET`, `LIVEPEER_API_KEY`, `MUX_TOKEN_ID`, `MUX_TOKEN_SECRET`, `CLOUDINARY_URL`, `S3_BUCKET`) must be passed strictly via environment variables (`.env`).
2. **Repository Hygiene**: No secrets, tokens, or private user data shall ever be committed to Git. `.env` and `data/` runtime files are explicitly listed in `.gitignore`.
3. **Exposed Legacy Credentials Note**: Historical commits containing plaintext passwords (`jcalministries2026!`) must be rotated immediately upon production deployment.
