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

// ── Security Headers with Helmet ──
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  })
)

// ── Enable credentials and CORS ──
app.use(
  cors({
    origin: true, // Reflect request origin to allow credentials
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
