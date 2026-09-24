# 🎬 Filmism — Cinema Taste Profiling, Personalized Discovery & Cinephile Matchmaking Platform

[![Live App](https://img.shields.io/badge/Live%20App-filmism.vercel.app-ff751f?style=for-the-badge&logo=vercel&logoColor=white)](https://filmism.vercel.app)
[![API](https://img.shields.io/badge/API-AWS%20EC2-232f3e?style=for-the-badge&logo=amazon-aws&logoColor=white)](https://filmism-api.duckdns.org)
[![Docker](https://img.shields.io/badge/Docker-Containerized-2496ed?style=for-the-badge&logo=docker&logoColor=white)](https://www.docker.com/)
[![MongoDB](https://img.shields.io/badge/MongoDB-Atlas%20Vector-47a248?style=for-the-badge&logo=mongodb&logoColor=white)](https://www.mongodb.com/)
[![React](https://img.shields.io/badge/React-19-61dafb?style=for-the-badge&logo=react&logoColor=black)](https://react.dev/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow?style=for-the-badge)](LICENSE)

> **"Discover films that feel like you — and the cinephiles who share your taste."**  
> Filmism is a full-stack cinema discovery and social matchmaking platform. It constructs multi-persona taste clusters from your chosen **genres**, **global cinema origins**, and **rated favorite films**, powering vector-ranked movie recommendations alongside **Cinephile Twin matchmaking** and **direct messaging**.

---

## 🌐 Live Deployments

* **Frontend (Production)**: [https://filmism.vercel.app](https://filmism.vercel.app)
* **Backend API (AWS Cloud)**: [https://filmism-api.duckdns.org](https://filmism-api.duckdns.org)
* **Health Check**: [https://filmism-api.duckdns.org/](https://filmism-api.duckdns.org/)

---

## 🌟 Key Features

### 🎯 4-Step Taste Profiling Onboarding
* **Step 1: Genres**: Select your preferred cinematic genres (Drama, Thriller, Sci-Fi, Romance, etc.).
* **Step 2: Cinema Origins**: Choose from global cinematic traditions (Hollywood, French Cinema, Japanese Cinema, Indian Cinema, Scandinavian Cinema, etc.).
* **Step 3: Favorite Films & Ratings**: Dynamically discovers and recommends films tailored to your chosen genres and origins, allowing you to curate and rate your favorite films on a **0–4 scale**.
* **Step 4: Semantic Taste Clusters**: The vector engine partitions your selections into distinct mathematical taste personas (e.g. *Atmospheric Neo-Noir & Psychological Tension*, *Intimate Romantic Melancholia*), then generates an **AI Craftsmanship Synthesis** — a personalized natural-language rationale evaluating storytelling craftsmanship, directorial signatures, and emotional themes.

### ⚡ Hybrid Recommendation Engine
* **Vector Matching (<50ms)**: Fast-path vector similarity matching using normalized centroid embeddings stored directly in MongoDB.
* **Smart Rotation & Refresh**: Rotates cached recommendations across clusters on every session and excludes previously evaluated films on force refresh.
* **Pre-Watch Intent vs. Post-Watch Verdict**: Differentiates between what users want to watch and how they actually felt after viewing, with review analytics graphs.
* **Multi-Provider AI Fallback**: Cluster naming and craftsmanship synthesis try Gemini, then fall back to OpenAI, OpenRouter, or DeepSeek — with a deterministic heuristic clustering path if every AI provider is unavailable.

### 🤝 Cinephile Twin Matching & Social Networking
* **Mathematical Twin Pairing**: Computes cosine similarity across multi-cluster centroids to connect film lovers with complementary taste profiles.
* **Privacy & Data Minimization**: Strips sensitive account details, exposing only taste explainability metrics and shared favorites.
* **Direct Messaging & Connection Requests**: Mutual handshake connection requests, near real-time conversations (polling-based), and read receipt tracking.

### 🛡️ Trust, Safety & Moderation
* **User Safety Controls**: Instant one-click user blocking and multi-category conduct reporting.
* **Admin Triage Dashboard**: Dedicated moderation interface with telemetry statistics, report resolutions, warning dispatch, and account suspension controls. See [SECURITY_SUMMARY.md](SECURITY_SUMMARY.md) for the full hardening write-up (rate limiting, brute-force defenses, IDOR fixes, and JWT/cookie handling).

---

## 🏗️ Architecture & Cloud Infrastructure

Filmism utilizes a modern decoupled cloud architecture designed for high availability, zero cold starts, and strict cross-origin security:

```
                               ┌────────────────────────────────────────────────────────┐
                               │                    AWS Cloud (EC2)                     │
                               │                                                        │
┌─────────────────────────┐    │  ┌──────────────┐     ┌─────────────────────────────┐  │    ┌────────────────────────┐
│     Vercel Frontend     │───►│  │ Nginx Proxy  │────►│      Docker Container       │  │───►│  MongoDB Atlas Cluster │
│  (filmism.vercel.app)   │    │  │ (Port 80/443)│     │  Node.js 22 LTS (Port 5001) │  │    │  (Vector Embeddings)   │
│  React 19 + Tailwind v4 │    │  │ Certbot SSL  │     │      filmism-backend        │  │    └────────────────────────┘
└─────────────────────────┘    │  └──────────────┘     └─────────────────────────────┘  │
                               └────────────────────────────────────────────────────────┘
```

* **Frontend**: Hosted on **Vercel** with SPA rewrites (`vercel.json` and `_redirects`).
* **Backend**: Containerized with **Docker** and deployed on an **AWS EC2 Ubuntu 24.04 LTS** instance, supervised by Docker's own `restart: unless-stopped` policy.
* **Reverse Proxy**: **Nginx** handles incoming traffic on Ports 80 & 443 with automated SSL/TLS encryption via **Certbot (Let's Encrypt)**.
* **Dynamic DNS**: Configured with **DuckDNS** (`filmism-api.duckdns.org`).
* **Authentication**: Dual-layer JWT authorization using **httpOnly cookies** and **HTTP `Authorization: Bearer` headers** to bypass cross-domain Safari ITP restrictions.

---

## 💻 Tech Stack

| Layer | Technologies |
| :--- | :--- |
| **Frontend** | React 19, Vite, Tailwind CSS v4, Styled Components, Axios, React Router v7 |
| **Backend** | Node.js 22 LTS, Express.js, Mongoose, Zod, JWT, Nodemailer, Helmet, CORS |
| **Cloud & DevOps**| AWS EC2 (Ubuntu 24.04), Docker, Docker Compose, Nginx, Certbot (SSL), Vercel |
| **Database** | MongoDB Atlas (Cloud Vector Search & Aggregations) |
| **External APIs** | TMDB API, Google Gemini, OpenAI, OpenRouter, DeepSeek, Gmail SMTP |
| **Testing** | Jest, Supertest (14 Test Suites, 125 Unit & Integration Tests) |

---

## 📁 Repository Structure

```text
filmism/
├── client/                         # Vite + React Frontend
│   ├── public/                     # Static icons, fonts & _redirects
│   ├── src/
│   │   ├── assets/                 # Brand imagery and typography
│   │   ├── components/             # Reusable UI components & modals
│   │   ├── context/                # React State (TasteContext)
│   │   ├── hooks/                  # Custom hooks (useTasteProfile)
│   │   ├── pages/                  # Routed application views
│   │   ├── services/               # Axios instance with request/response interceptors
│   │   └── utils/                  # Helper utilities and genre mapping
│   ├── package.json
│   ├── vercel.json                 # Vercel SPA routing rewrites
│   └── vite.config.js
│
├── server/                         # Express Backend
│   ├── config/                     # Database & service configurations
│   ├── controllers/                # Request & response controllers
│   ├── middleware/                 # Auth, rate-limiting & error middleware
│   ├── models/                     # Mongoose schemas (User, Profile, Match, Chat)
│   ├── routes/                     # REST API route endpoints
│   ├── scripts/                    # Seeding & profiling smoke scripts
│   ├── services/                   # Recommendation engine & vector math
│   ├── tests/                      # Jest unit & integration test suites
│   ├── validators/                 # Zod payload validation schemas
│   ├── Dockerfile                  # Production container definition
│   ├── docker-compose.yml          # Container orchestration & port bindings
│   ├── package.json
│   └── server.js                   # Application entry point
│
├── .gitignore
├── package.json                    # Root concurrently dev runner
├── SECURITY_SUMMARY.md             # Security hardening & audit write-up
├── LICENSE                         # MIT License
└── README.md
```

---

## 🚀 Local Development Setup

### Prerequisites
* **Node.js** >= 20.x
* **npm** >= 10.x
* **MongoDB Atlas** account (or local MongoDB instance)
* **TMDB API Read Access Token** ([themoviedb.org](https://www.themoviedb.org/documentation/api))
* At least one AI provider key (Gemini, OpenAI, OpenRouter, or DeepSeek) — the app falls back to heuristic clustering if none are configured

### 1. Clone the Repository
```bash
git clone https://github.com/Nirukshith/Filmism.git
cd Filmism
```

### 2. Install Root, Client, and Server Dependencies
```bash
# Install root dependencies
npm install

# Install client dependencies
cd client && npm install

# Install server dependencies
cd ../server && npm install
```

### 3. Configure Environment Variables

Create a `.env` file inside `server/.env`:
```env
PORT=5001
NODE_ENV=development
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret_key
CLIENT_URL=http://localhost:5173

# Email Credentials (for OTP verification)
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_16_char_gmail_app_password

# TMDB (only the read token is required)
TMDB_READ_TOKEN=your_tmdb_read_token
TMDB_TIMEOUT_MS=8000

# AI Providers — Gemini is tried first, then OpenAI, then OpenRouter, then DeepSeek.
# Configure at least one; unset providers are skipped automatically.
GEMINI_API_KEY=your_gemini_api_key
# GOOGLE_API_KEY=            # alternate name accepted for GEMINI_API_KEY
# OPENAI_API_KEY=
# OPENROUTER_API_KEY=
# OPENROUTER_MODEL=          # optional, defaults to the service's built-in model
# DEEPSEEK_API_KEY=
# DEEPSEEK_MODEL=            # optional, defaults to the service's built-in model
AI_TIMEOUT_MS=10000

# Admin seed account (used by `npm run seed:admin`)
DEFAULT_ADMIN_EMAIL=admin@example.com
DEFAULT_ADMIN_PASSWORD=change_me
```

Create a `.env` file inside `client/.env`:
```env
VITE_API_BASE_URL=http://localhost:5001/api
```

### 4. Run Locally
From the root directory, start both frontend and backend concurrently:
```bash
npm run dev
```
* **Frontend**: `http://localhost:5173`
* **Backend API**: `http://localhost:5001`

---

## 🛠️ Utility Scripts

Run these from inside `server/`:

| Command | Purpose |
| :--- | :--- |
| `npm run seed:admin` | Creates the first admin account, using `DEFAULT_ADMIN_EMAIL` / `DEFAULT_ADMIN_PASSWORD` from `.env`, for access to the moderation dashboard. |
| `npm run test:profiling` | Smoke-tests the AI film profiling pipeline against live provider APIs. |
| `npm run test:clustering` | Smoke-tests taste cluster generation end-to-end, including AI and heuristic fallback paths. |
| `npm run test:recommendations` | Smoke-tests the hybrid recommendation engine against real data. |
| `npm run test:telemetry` | Smoke-tests admin dashboard telemetry aggregation. |

These scripts hit live external services (TMDB, AI providers, MongoDB) rather than mocks, so they're meant for manual verification during development, not CI.

---

## 🐳 Docker Deployment

The backend can be built and run using Docker:

### 1. Build and Run with Docker Compose
```bash
cd server
docker compose up -d --build
```

### 2. Verify Container Health
```bash
# View active container
docker ps

# Inspect live application logs
docker logs -f filmism-backend
```

### 3. Stop Container
```bash
docker compose down
```

---

## 🧪 Testing Suite

Filmism includes a test suite covering mathematical vector models, privacy guardrails, connection state machines, and recommendation rotation:

```bash
cd server
npm test
```

### Test Coverage Highlights:
* ✅ **Candidate Pool Service**: Local MongoDB vector similarity vs. TMDB fallback.
* ✅ **Recommendation Refresh Logic**: Force refresh exclusions & cache rotation.
* ✅ **Cinephile Twin Guardrails**: Data minimization & sensitive field leak prevention.
* ✅ **Pairing & Connections**: State transitions (request, accept, decline, block).
* ✅ **Payload Validators**: Strict Zod schema enforcement across all endpoints.

Core matching, safety, and validation logic is covered by the Jest unit/integration suite above. The AI-integration paths (clustering, craftsmanship synthesis, recommendation engine) are verified separately via the live smoke scripts in [Utility Scripts](#️-utility-scripts), since they depend on external provider responses rather than deterministic mocks.

---

## 📄 License

This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.

---

## 👤 Author

**Nirukshith Premkumar**  
* GitHub: [@Nirukshith](https://github.com/Nirukshith)  
* Project: [Filmism on GitHub](https://github.com/Nirukshith/Filmism)
