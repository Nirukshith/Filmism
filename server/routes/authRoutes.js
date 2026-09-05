const express = require('express')
const router  = express.Router()
const { registerUser, loginUser, updateTasteProfile, verifyOtp, resendOtp, updateProfile, verifyEmailChange, resetTasteProfile } = require('../controllers/authController')
const { protect } = require('../middleware/authMiddleware') 

// POST — actual register
router.post('/register', registerUser)
router.post('/login',    loginUser)
router.post('/verify-otp', verifyOtp)
router.post('/resend-otp', resendOtp) 

// PUT — update taste profile preferences (protected)
router.put('/profile', protect, updateTasteProfile)

// PATCH — update account settings (name, email, password)
router.patch('/profile', protect, updateProfile)

// POST — verify OTP for email change (protected)
router.post('/verify-email-change', protect, verifyEmailChange)

// POST — reset taste profile (protected)
router.post('/reset-taste', protect, resetTasteProfile)

// GET — friendly message if someone hits it wrong
router.get('/register', (req, res) => {
  res.status(200).json({ message: 'Use POST to register' })
})

module.exports = router