const express = require('express')
const router  = express.Router()
const { registerUser, loginUser, updateTasteProfile } = require('../controllers/authController')
const { protect } = require('../middleware/authMiddleware')

// POST — actual register
router.post('/register', registerUser)
router.post('/login',    loginUser)

// PUT — update taste profile preferences (protected)
router.put('/profile', protect, updateTasteProfile)

// GET — friendly message if someone hits it wrong
router.get('/register', (req, res) => {
  res.status(200).json({ message: 'Use POST to register' })
})

module.exports = router