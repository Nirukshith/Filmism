# Filmism Security Hardening & Audit Summary

This document summarizes the comprehensive security fixes, architectural upgrades, and threat mitigations implemented across the Filmism full-stack application.

---

## Table of Contents
1. [AI Endpoint Protection & Rate Limiting](#1-ai-endpoint-protection--rate-limiting)
2. [Authentication Hardening & Brute-Force Defenses](#2-authentication-hardening--brute-force-defenses)
3. [Session Security & IDOR Elimination](#3-session-security--idor-elimination)
4. [JWT Migration to Secure `httpOnly` Cookies](#4-jwt-migration-to-secure-httponly-cookies)
5. [Account & Email Enumeration Defenses](#5-account--email-enumeration-defenses)
6. [Payload Validation & Storage Abuse Prevention](#6-payload-validation--storage-abuse-prevention)
7. [Production Security Headers (Helmet) & Deleted-User Handling](#7-production-security-headers-helmet--deleted-user-handling)

---

## 1. AI Endpoint Protection & Rate Limiting

### Vulnerability Addressed
* Public unauthenticated access to `POST /api/movies/batch-profile`, `POST /api/movies/profile/:tmdbId`, and `POST /api/taste-profile/initialize` allowed anyone to trigger expensive Gemini / OpenAI calls and burn TMDB API rate limits.

### Fixes Implemented
* **JWT Auth Gate (`protect`)**: All mutating AI profiling and cluster initialization endpoints now strictly enforce JWT authentication. Anonymous requests are blocked with `HTTP 401 Unauthorized`.
* **Rate Limiting (`express-rate-limit`)**:
  - `aiProfileLimiter`: Max 30 batch profiling requests per 15 min per IP.
  - `tasteProfileLimiter`: Max 20 taste profile initializations per 15 min per IP.
  - `tmdbProxyLimiter`: Max 150 search/discover requests per 15 min per IP.
* **Frontend Guest Onboarding Gate**:
  - Unauthenticated guests can freely explore genres, origins, and pick films on the frontend.
  - Clicking *"build taste clusters"* caches their selections in `localStorage` (`filmism_pending_onboarding`) and opens `AuthPromptModal`.
  - Upon registration/login, selections are restored and submitted directly with their authenticated token.

---

## 2. Authentication Hardening & Brute-Force Defenses

### Vulnerability Addressed
* Unlimited password guessing on login, 6-digit OTP brute-forcing within its 5-minute window, and automated email bombing loops on resend OTP.

### Fixes Implemented
* **Endpoint Rate Limiters ([authRoutes.js](server/routes/authRoutes.js))**:
  - `loginLimiter`: Max 8 failed login attempts per 15 min per IP.
  - `verifyOtpLimiter`: Max 10 verification requests per 15 min per IP.
  - `resendOtpLimiter`: Max 5 resend requests per 15 min per IP.
  - `registerLimiter`: Max 6 account registrations per hour per IP.
* **Max 5 OTP Guess Lockout ([authController.js](server/controllers/authController.js))**:
  - Tracks `otpAttempts` in `userModel`.
  - Decrements remaining attempts on incorrect guesses (`"Invalid OTP. 3 attempts remaining"`).
  - On the **5th failed guess**, the server **instantly invalidates and wipes the OTP** from MongoDB.
* **Server-Side 60s Resend Cooldown**:
  - Tracked via `otpLastSentAt` in MongoDB. Rejects requests faster than once every 60s with `HTTP 429: "Please wait Xs before requesting a new code."`

---

## 3. Session Security & IDOR Elimination

### Vulnerability Addressed
* Unauthenticated recommendations, watchlists, and diary endpoints relied on predictable client-supplied `sessionId` strings (`guest_${Date.now()}_${random}`), exposing user data to Insecure Direct Object Reference (IDOR) attacks.

### Fixes Implemented
* **Enforced `protect` on Recommendations ([recommendationRoutes.js](server/routes/recommendationRoutes.js))**:
  - Replaced `optionalProtect` with `protect` across all recommendation, candidate rating, telemetry, watchlist, and diary routes.
  - Personal data queries are strictly scoped to the authenticated `req.user._id`.
  - Guest `sessionId` fallback is completely removed from database operations.

---

## 4. JWT Migration to Secure `httpOnly` Cookies

### Vulnerability Addressed
* Storing 30-day JWT tokens in client-side `localStorage` exposed them to exfiltration via any Cross-Site Scripting (XSS) flaw or compromised npm dependency.

### Fixes Implemented
* **`httpOnly` Cookie Transmission ([server.js](server/server.js) & [authController.js](server/controllers/authController.js))**:
  - Installed `cookie-parser` and enabled `credentials: true` in CORS.
  - Tokens are delivered via `Set-Cookie` with `HttpOnly; SameSite=Lax; Path=/; Max-Age=7d; Secure (in prod)`. JavaScript cannot read or steal this cookie.
  - Reduced token lifespan from **30 days to 7 days**.
* **Axios Integration ([api.js](client/src/services/api.js))**:
  - Enabled `withCredentials: true` so the browser automatically handles cookie transmission.
  - Removed manual `localStorage.getItem('token')` header injection.
* **Secure Logout**: Added `POST /api/auth/logout` to clear the `token` cookie on sign-out.

---

## 5. Account & Email Enumeration Defenses

### Vulnerability Addressed
* Detailed error messages (`"An account with this email already exists"`, `"User not found"`, `"Please verify your email"`) and response timing differences (~1ms vs ~80ms) leaked whether specific emails were registered.

### Fixes Implemented
* **Constant-Time Login**: Added `DUMMY_HASH` comparison when an email is not found, ensuring execution time is identical (~80ms) for existing and non-existing accounts.
* **Uniform Error Messages**:
  - `loginUser`: Returns `"Invalid email or password"` for all failed attempts.
  - `registerUser`: Returns generic `"If this email is not yet registered, a verification code has been sent..."` (HTTP 200) for already verified users.
  - `resendOtp`: Always returns `"If an unverified account exists with this email, a new OTP has been sent."` (HTTP 200).
  - `verifyOtp`: Returns uniform `"Invalid or expired OTP. Please request a new one."` (HTTP 400).

---

## 6. Payload Validation & Storage Abuse Prevention

### Vulnerability Addressed
* Unbounded `profilePicture` data-URL uploads allowed arbitrary text strings or massive payloads to be stored directly in MongoDB documents.

### Fixes Implemented
* **MIME & Format Validation ([authController.js](server/controllers/authController.js))**:
  - Enforces that avatars must match `/^data:image\/(png|jpe?g|webp|gif);base64,/i` or valid `http(s)://` URLs.
  - Rejects HTML, scripts, or non-image types with `HTTP 400`.
* **Size Capping**:
  - Limits avatar data URLs to **1.5MB** character length (~1MB binary image).
* **Express Body Parser Limit ([server.js](server/server.js))**:
  - Lowered `express.json` limit from `10mb` down to `2mb`, preventing server RAM exhaustion and Event-Loop blocking.

---

## 7. Production Security Headers (Helmet) & Deleted-User Handling

### Fixes Implemented
* **Helmet Security Headers ([server.js](server/server.js))**:
  - Added `helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } })`.
  - Injects `X-Content-Type-Options: nosniff`, `Strict-Transport-Security` (HSTS), `X-Frame-Options: SAMEORIGIN` (clickjacking defense), `Referrer-Policy`, and `Content-Security-Policy`.
  - Hides `X-Powered-By: Express` to prevent server fingerprinting.
* **Deleted-User Existence Verification ([authMiddleware.js](server/middleware/authMiddleware.js))**:
  - `protect` explicitly checks if `User.findById(decoded.id)` returns `null` (e.g. user was deleted after token was issued).
  - Rejects with `HTTP 401: "Not authorized, user not found"` instead of passing `req.user = null` to downstream controllers.
* **Environment Secret Isolation**:
  - Verified that `.env` is declared across root `.gitignore` and `server/.gitignore`.

---

## Summary Table of Verified Protections

| Security Vector | Before | After |
| :--- | :--- | :--- |
| **AI LLM Endpoints** | Public / Unauthenticated | 🔒 JWT Protected + Rate Limited |
| **TMDB API Proxies** | Open to Scrapers | ⏱️ Rate Limited (150 req / 15 min) |
| **Login Brute-Force** | Unlimited Attempts | 🛡️ Max 8 attempts / 15 min |
| **OTP Brute-Force** | 1M combinations in 5m | 🚫 Max 5 attempts -> Wipes OTP |
| **OTP Resend Spam** | Unlimited Email Loops | ⏳ 60s Server Cooldown + Rate Limited |
| **Session Storage** | `localStorage` (XSS vulnerable) | 🍪 `httpOnly` Cookie (XSS Immune) |
| **Token Validity** | 30 Days | 7 Days |
| **User Data Isolation** | Insecure Guest Session IDOR | 🔒 Strict `req.user._id` Scoping |
| **Email Enumeration** | Leaked on Register / Login | 🎭 Constant-Time & Generic Messages |
| **Avatar Storage** | Unchecked String / 10MB | 🖼️ MIME Validated / 1MB Cap / 2MB JSON |
| **Security Headers** | None (Default Express) | 🛡️ Helmet (HSTS, nosniff, frameguard) |
| **Deleted User Tokens** | Downstream 500 TypeError | 🛑 Clean 401 User Not Found |
