const express = require('express')
const router  = express.Router()
const rateLimit = require('express-rate-limit')
const {
  registerUser,
  loginUser,
  logoutUser,
  updateTasteProfile,
  verifyOtp,
  resendOtp,
  updateProfile,
  verifyEmailChange,
  resetTasteProfile,
} = require('../controllers/authController')
const { validateRequest } = require('../middleware/validateRequest')
const { protect } = require('../middleware/authMiddleware')
const {
  registerSchema,
  loginSchema,
  verifyOtpSchema,
  resendOtpSchema,
  updateTastePreferencesSchema,
  updateProfileSchema,
  verifyEmailChangeSchema,
} = require('../validators/authValidators')

// Rate limiters for authentication endpoints
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 8, // max 8 login attempts per IP per 15 min
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many login attempts from this IP. Please try again after 15 minutes.',
  },
})

const verifyOtpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // max 10 verification requests per IP per 15 min
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many OTP verification attempts. Please request a new code or try again later.',
  },
})

const resendOtpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // max 5 resend requests per IP per 15 min
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many OTP resend requests. Please wait a few minutes.',
  },
})

const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 6, // max 6 registrations per IP per hour
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many accounts created from this IP. Please try again later.',
  },
})

// POST — actual register
router.post('/register', registerLimiter, validateRequest(registerSchema), registerUser)
router.post('/login',    loginLimiter,    validateRequest(loginSchema),    loginUser)
router.post('/logout',   logoutUser)
router.post('/verify-otp', verifyOtpLimiter, validateRequest(verifyOtpSchema), verifyOtp)
router.post('/resend-otp', resendOtpLimiter, validateRequest(resendOtpSchema), resendOtp)

// PUT — update taste profile preferences (protected)
router.put('/profile', protect, validateRequest(updateTastePreferencesSchema), updateTasteProfile)

// PATCH — update account settings (name, email, password)
router.patch('/profile', protect, validateRequest(updateProfileSchema), updateProfile)

// POST — verify OTP for email change (protected + rate limited)
router.post('/verify-email-change', protect, verifyOtpLimiter, validateRequest(verifyEmailChangeSchema), verifyEmailChange)

// POST — reset taste profile (protected)
router.post('/reset-taste', protect, resetTasteProfile)

// GET — friendly message if someone hits it wrong
router.get('/register', (req, res) => {
  res.status(200).json({ message: 'Use POST to register' })
})

module.exports = router