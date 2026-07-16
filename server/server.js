const express     = require('express')
const cors        = require('cors')
const dotenv      = require('dotenv')
const path        = require('path')
const connectDB   = require('./config/db')
const { errorHandler } = require('./middleware/errorMiddleware')

dotenv.config({ path: path.resolve(__dirname, '.env') })
connectDB()

const app = express()

// ── Fix: allow all origins in development ──
app.use(cors())
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// Routes
app.use('/api/auth', require('./routes/authRoutes'))

// Error handler
app.use(errorHandler)

app.get('/', (req, res) => {
  res.json({ message: 'Filmism server is running' })
})

const PORT = process.env.PORT || 5001
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`)
})
