const path        = require('path')
const dotenv      = require('dotenv')

// Initialize environment variables first so subsequent imports have access to process.env
dotenv.config({ path: path.resolve(__dirname, '.env') })

const express     = require('express')
const cors        = require('cors')
const connectDB   = require('./config/db')
const { errorHandler } = require('./middleware/errorMiddleware')
const movieRoutes = require('./routes/movieRoutes');

const app = express()

// ── Fix: allow all origins in development ──
app.use(cors())
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// Routes
app.use('/api/auth', require('./routes/authRoutes'))
app.use('/api/movies', movieRoutes)

// Error handler
app.use(errorHandler)

app.get('/', (req, res) => {
  res.json({ message: 'Filmism server is running' })
})

const PORT = process.env.PORT || 5001

const startServer = async () => {
  await connectDB()

  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`)
  })
}

startServer().catch((error) => {
  console.error(`Server startup failed: ${error.message}`)
  process.exit(1)
})
