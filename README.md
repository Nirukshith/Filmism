# 🎬 Filmism — Cinema Taste Profiling, Personalized Discovery & Cinephile Matchmaking Platform

[![Live App](https://img.shields.io/badge/Live%20App-filmism.vercel.app-ff751f?style=for-the-badge&logo=vercel&logoColor=white)](https://filmism.vercel.app)
[![API](https://img.shields.io/badge/API-AWS%20EC2-232f3e?style=for-the-badge&logo=amazon-aws&logoColor=white)](https://filmism-api.duckdns.org)
[![Docker](https://img.shields.io/badge/Docker-Containerized-2496ed?style=for-the-badge&logo=docker&logoColor=white)](https://www.docker.com/)
[![MongoDB](https://img.shields.io/badge/MongoDB-Atlas%20Vector-47a248?style=for-the-badge&logo=mongodb&logoColor=white)](https://www.mongodb.com/)
[![React](https://img.shields.io/badge/React-19-61dafb?style=for-the-badge&logo=react&logoColor=black)](https://react.dev/)

> **"Discover films that feel like you — and the cinephiles who share your taste."**  
> Filmism is a full-stack cinema discovery and social matchmaking platform. It constructs multi-persona taste clusters from your chosen **genres**, **global cinema origins**, and **rated favorite films**, powering vector-ranked movie recommendations alongside **Cinephile Twin matchmaking** and **real-time chat**.

---

## 🌐 Live Deployments

* **Frontend (Production)**: [https://filmism.vercel.app](https://filmism.vercel.app)
* **Backend API (AWS Cloud)**: [https://filmism-api.duckdns.org](https://filmism-api.duckdns.org)
* **Health Check**: [https://filmism-api.duckdns.org/](https://filmism-api.duckdns.org/)

---

## 🌟 Key Features

### 🎯 3-Step Taste Profiling Onboarding
* **Step 1: Genres**: Select your preferred cinematic genres (Drama, Thriller, Sci-Fi, Romance, etc.).
* **Step 2: Cinema Origins**: Choose from global cinematic traditions (Hollywood, French Cinema, Japanese Cinema, Indian Cinema, Scandinavian Cinema, etc.).
* **Step 3: Favorite Films & Ratings**: Dynamically discovers and recommends films tailored to your chosen genres and origins, allowing you to curate and rate your favorite films (1–4 rating scale).
* **Step 4: Semantic Taste Clusters**: The vector engine partitions your selections into distinct mathematical taste personas (e.g. *Atmospheric Neo-Noir & Psychological Tension*, *Intimate Romantic Melancholia*).
* **AI Craftsmanship Synthesis**: Generates personalized natural language rationales evaluating storytelling craftsmanship, directorial signatures, and emotional themes using generative AI.

### ⚡ Hybrid Recommendation Engine
* **Vector Matching (<50ms)**: Fast-path vector similarity matching using normalized centroid embeddings stored directly in MongoDB.
* **Smart Rotation & Refresh**: Rotates cached recommendations across clusters on every session and excludes previously evaluated films on force refresh.
* **Pre-Watch Intent vs. Post-Watch Verdict**: Differentiates between what users want to watch and how they actually felt after viewing with real-time review analytics graphs.

### 🤝 Cinephile Twin Matching & Social Networking
* **Mathematical Twin Pairing**: Computes cosine similarity across multi-cluster centroids to connect film lovers with complementary taste profiles.
* **Privacy & Data Minimization**: Strips sensitive account details, exposing only taste explainability metrics and shared favorites.
* **Direct Messaging & Connection Requests**: Mutual handshake connection requests, live conversations, and read receipt tracking.

### 🛡️ Trust, Safety & Moderation
* **User Safety Controls**: Instant one-click user blocking and multi-category conduct reporting.
* **Admin Triage Dashboard**: Dedicated moderation interface with telemetry statistics, report resolutions, warning dispatch, and account suspension controls.

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
* **Backend**: Containerized with **Docker** and deployed on an **AWS EC2 Ubuntu 24.04 LTS** instance.
* **Reverse Proxy**: **Nginx** handles incoming traffic on Ports 80 & 443 with automated SSL/TLS encryption via **Certbot (Let's Encrypt)**.
* **Dynamic DNS**: Configured with **DuckDNS** (`filmism-api.duckdns.org`).
* **Authentication**: Dual-layer JWT authorization using **httpOnly cookies** and **HTTP `Authorization: Bearer` headers** to bypass cross-domain Safari ITP restrictions.

---

## 💻 Tech Stack

| Layer | Technologies |
| :--- | :--- |
| **Frontend** | React 19, Vite, Tailwind CSS v4, Styled Components, Axios, React Router v7 |
| **Backend** | Node.js 22 LTS, Express.js, Mongoose, Zod, JWT, Nodemailer, Helmet, CORS |
| **Cloud & DevOps**| AWS EC2 (Ubuntu 24.04), Docker, Docker Compose, Nginx, Certbot (SSL), PM2, Vercel |
| **Database** | MongoDB Atlas (Cloud Vector Search & Aggregations) |
| **External APIs** | TMDB API, Google Gemini API, OpenRouter, Gmail SMTP |
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
└── README.md
```

---

## 🚀 Local Development Setup

### Prerequisites
* **Node.js** >= 20.x
* **npm** >= 10.x
* **MongoDB Atlas** account (or local MongoDB instance)
* **TMDB API Key** ([themoviedb.org](https://www.themoviedb.org/documentation/api))

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

# External APIs
TMDB_API_KEY=your_tmdb_api_key
TMDB_READ_TOKEN=your_tmdb_read_token
GEMINI_API_KEY=your_gemini_api_key
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

Filmism includes a comprehensive test suite covering mathematical vector models, privacy guardrails, connection state machines, and recommendation rotation:

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

---

## 📄 License

This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.

---

## 👤 Author

**Nirukshith Premkumar**  
* GitHub: [@Nirukshith](https://github.com/Nirukshith)  
* Project: [Filmism on GitHub](https://github.com/Nirukshith/Filmism)
