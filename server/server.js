const path        = require('path')
const dotenv      = require('dotenv')

// Initialize environment variables first so subsequent imports have access to process.env
dotenv.config({ path: path.resolve(__dirname, '.env') })

const express     = require('express')
const cors        = require('cors')
const helmet      = require('helmet')
const cookieParser = require('cookie-parser')
const connectDB   = require('./config/db')
const { errorHandler, notFoundHandler } = require('./middleware/errorMiddleware')
const movieRoutes = require('./routes/movieRoutes');

const app = express()

// Trust reverse proxy (required for secure cookies behind Render, Railway, etc.)
app.set('trust proxy', 1)

// ── Security Headers with Helmet ──
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  })
)

// ── Enable credentials and CORS ──
const allowedOrigins = [
  process.env.CLIENT_URL,
  'http://localhost:5173',
  'http://localhost:3000',
  'http://127.0.0.1:5173',
].filter(Boolean)

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like health checks, mobile apps, or curl)
      if (!origin) return callback(null, true)

      if (
        allowedOrigins.includes(origin) ||
        origin.endsWith('.vercel.app') ||
        process.env.NODE_ENV !== 'production'
      ) {
        return callback(null, true)
      }
      return callback(new Error(`Blocked by CORS for origin: ${origin}`))
    },
    credentials: true,
  })
)
app.use(cookieParser())
app.use(express.json({ limit: '2mb' }))
app.use(express.urlencoded({ limit: '2mb', extended: true }))

// Root health check
app.get('/', (req, res) => {
  res.json({ success: true, message: 'Filmism server is running' })
})

// Routes
app.use('/api/auth', require('./routes/authRoutes'))
app.use('/api/movies', movieRoutes)
app.use('/api/taste-profile', require('./routes/tasteProfileRoutes'))
app.use('/api/recommendations', require('./routes/recommendationRoutes'))
app.use('/api/matching', require('./routes/matchRoutes'))
app.use('/api/conversations', require('./routes/conversationRoutes'))
app.use('/api/notifications', require('./routes/notificationRoutes'))
app.use('/api/users', require('./routes/userRoutes'))
app.use('/api/safety', require('./routes/safetyRoutes'))

// 404 handler for undefined routes
app.use(notFoundHandler)

// Centralized error handler
app.use(errorHandler)

const PORT = process.env.PORT || 5001

const startServer = async () => {
  await connectDB()

  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`)
  })
}

if (require.main === module) {
  startServer().catch((error) => {
    console.error(`Server startup failed: ${error.message}`)
    process.exit(1)
  })
}

module.exports = app;
