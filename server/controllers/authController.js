const User = require('../models/userModel')
const jwt  = require('jsonwebtoken')

// Generate JWT token
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '30d' })
}

// ── POST /api/auth/register ──────────────────────────────────────────────────
const registerUser = async (req, res) => {
  const { firstName, lastName, email, password } = req.body

  try {
    // Check all fields are present
    if (!firstName || !lastName || !email || !password) {
      return res.status(400).json({ message: 'All fields are required' })
    }

    // Check if user already exists
    const userExists = await User.findOne({ email })
    if (userExists) {
      return res.status(400).json({ message: 'An account with this email already exists' })
    }

    // Create new user — password is hashed automatically via pre-save hook
    const user = await User.create({ firstName, lastName, email, password })

    if (user) {
      res.status(201).json({
        _id:       user._id,
        firstName: user.firstName,
        lastName:  user.lastName,
        email:     user.email,
        token:     generateToken(user._id),
      })
    }
  } catch (error) {
    console.error('REGISTER ERROR:', error.message)
    res.status(500).json({ message: error.message })
  }
}

// ── POST /api/auth/login ─────────────────────────────────────────────────────
const loginUser = async (req, res) => {
  const { email, password } = req.body

  try {
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' })
    }

    const user = await User.findOne({ email })

    if (user && (await user.matchPassword(password))) {
      res.json({
        _id:       user._id,
        firstName: user.firstName,
        lastName:  user.lastName,
        email:     user.email,
        token:     generateToken(user._id),
      })
    } else {
      res.status(401).json({ message: 'Invalid email or password' })
    }
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

// ── PUT /api/auth/profile ────────────────────────────────────────────────────
const updateTasteProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id)

    if (user) {
      user.selectedCinemas = req.body.selectedCinemas || user.selectedCinemas
      user.selectedGenres = req.body.selectedGenres || user.selectedGenres
      user.selectedPosters = req.body.selectedPosters || user.selectedPosters
      user.aestheticProfile = req.body.aestheticProfile || user.aestheticProfile

      const updatedUser = await user.save()

      res.json({
        _id: updatedUser._id,
        firstName: updatedUser.firstName,
        lastName: updatedUser.lastName,
        email: updatedUser.email,
        selectedCinemas: updatedUser.selectedCinemas,
        selectedGenres: updatedUser.selectedGenres,
        selectedPosters: updatedUser.selectedPosters,
        aestheticProfile: updatedUser.aestheticProfile,
      })
    } else {
      res.status(404).json({ message: 'User not found' })
    }
  } catch (error) {
    console.error('UPDATE PROFILE ERROR:', error.message)
    res.status(500).json({ message: error.message })
  }
}

module.exports = { registerUser, loginUser, updateTasteProfile }