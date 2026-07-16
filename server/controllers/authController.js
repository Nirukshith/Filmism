const User = require('../models/userModel')
const jwt  = require('jsonwebtoken')
const bcrypt = require('bcryptjs') 
const sendOtpEmail = require('../utils/sendEmail')         

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

    // Generate OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString()
    const hashedOtp = await bcrypt.hash(otp, 10)

    // Create user as unverified, attach OTP
    const user = await User.create({
      firstName,
      lastName,
      email,
      password,
      otp: hashedOtp,
      otpExpiry: Date.now() + 5 * 60 * 1000, // 5 min
      isVerified: false,
    })

    if (user) {
      await sendOtpEmail(user.email, otp)

      res.status(201).json({
        message: 'Registered successfully. Please verify the OTP sent to your email.',
        email: user.email,
      })
    }
  } catch (error) {
    console.error('REGISTER ERROR:', error.message)
    res.status(500).json({ message: error.message })
  }
}

// ── POST /api/auth/verify-otp ────────────────────────────────────────────────
const verifyOtp = async (req, res) => {
  const { email, otp } = req.body

  try {
    if (!email || !otp) {
      return res.status(400).json({ message: 'Email and OTP are required' })
    }

    const user = await User.findOne({ email })
    if (!user) {
      return res.status(404).json({ message: 'User not found' })
    }

    if (user.isVerified) {
      return res.status(400).json({ message: 'User is already verified' })
    }

    if (!user.otp || !user.otpExpiry || user.otpExpiry < Date.now()) {
      return res.status(400).json({ message: 'OTP has expired. Please request a new one.' })
    }

    const isMatch = await bcrypt.compare(otp, user.otp)
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid OTP' })
    }

    user.isVerified = true
    user.otp = undefined
    user.otpExpiry = undefined
    await user.save()

    res.json({
      _id:       user._id,
      firstName: user.firstName,
      lastName:  user.lastName,
      email:     user.email,
      token:     generateToken(user._id),
    })
  } catch (error) {
    console.error('VERIFY OTP ERROR:', error.message)
    res.status(500).json({ message: error.message })
  }
}

// ── POST /api/auth/resend-otp ────────────────────────────────────────────────
const resendOtp = async (req, res) => {
  const { email } = req.body

  try {
    const user = await User.findOne({ email })
    if (!user) {
      return res.status(404).json({ message: 'User not found' })
    }
    if (user.isVerified) {
      return res.status(400).json({ message: 'User is already verified' })
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString()
    user.otp = await bcrypt.hash(otp, 10)
    user.otpExpiry = Date.now() + 5 * 60 * 1000
    await user.save()

    await sendOtpEmail(user.email, otp)

    res.json({ message: 'A new OTP has been sent to your email.' })
  } catch (error) {
    console.error('RESEND OTP ERROR:', error.message)
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

    if (user && !user.isVerified) {
      return res.status(401).json({ message: 'Please verify your email before logging in' })
    }

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

module.exports = { registerUser, loginUser, updateTasteProfile, verifyOtp, resendOtp}