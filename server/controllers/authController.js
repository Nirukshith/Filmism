const User = require('../models/userModel')
const UserTasteProfile = require('../models/userTasteProfileModel')
const jwt  = require('jsonwebtoken')
const bcrypt = require('bcryptjs') 
const sendOtpEmail = require('../utils/sendEmail')
const { mapNamesToIds, mapIdsToNames } = require('../utils/genreMap')         

// Generate JWT token
const generateToken = (id, tasteProfileComplete = false) => {
  return jwt.sign({ id, tasteProfileComplete: !!tasteProfileComplete }, process.env.JWT_SECRET, { expiresIn: '30d' })
}

// Validate password strength: min 8 chars, 1 uppercase, 1 special char
const validatePasswordStrength = (password) => {
  if (!password || password.length < 8) {
    return 'Password must be at least 8 characters long.'
  }
  if (!/[A-Z]/.test(password)) {
    return 'Password must contain at least one uppercase letter.'
  }
  if (!/[^A-Za-z0-9]/.test(password)) {
    return 'Password must contain at least one special character.'
  }
  return null
}

// ── POST /api/auth/register ──────────────────────────────────────────────────
const registerUser = async (req, res) => {
  const { firstName, lastName, email, password } = req.body

  try {
    // Check all fields are present
    if (!firstName || !lastName || !email || !password) {
      return res.status(400).json({ message: 'All fields are required' })
    }

    const passwordError = validatePasswordStrength(password)
    if (passwordError) {
      return res.status(400).json({ message: passwordError })
    }

    const normalizedEmail = email.toLowerCase().trim()

    // Check if user already exists
    const userExists = await User.findOne({ email: normalizedEmail })
    if (userExists) {
      return res.status(400).json({ message: 'An account with this email already exists' })
    }

    // Generate OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString()
    const hashedOtp = await bcrypt.hash(otp, 10)

    // Create user as unverified, attach OTP
    const user = await User.create({
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      email: normalizedEmail,
      password,
      otp: hashedOtp,
      otpExpiry: Date.now() + 5 * 60 * 1000, // 5 min
      isVerified: false,
      tasteProfileComplete: false,
    })

    if (user) {
      await sendOtpEmail(user.email, otp)

      res.status(201).json({
        message: 'Registered successfully. Please verify the OTP sent to your email.',
        email: user.email,
        tasteProfileComplete: false,
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

    const normalizedEmail = email.toLowerCase().trim()
    const user = await User.findOne({ email: normalizedEmail })
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
      profilePicture: user.profilePicture || null,
      tasteProfileComplete: user.tasteProfileComplete || false,
      token:     generateToken(user._id, user.tasteProfileComplete),
      selectedCinemas: user.selectedCinemas,
      selectedGenres: mapIdsToNames(user.selectedGenres),
      selectedPosters: user.selectedPosters,
      aestheticProfile: user.aestheticProfile,
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
    const normalizedEmail = email?.toLowerCase().trim()
    const user = await User.findOne({ email: normalizedEmail })
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

    const normalizedEmail = email.toLowerCase().trim()
    const user = await User.findOne({ email: normalizedEmail })

    if (user && !user.isVerified) {
      return res.status(401).json({ message: 'Please verify your email before logging in' })
    }

    if (user && (await user.matchPassword(password))) {
      res.json({
        _id:       user._id,
        firstName: user.firstName,
        lastName:  user.lastName,
        email:     user.email,
        profilePicture: user.profilePicture || null,
        tasteProfileComplete: user.tasteProfileComplete || false,
        token:     generateToken(user._id, user.tasteProfileComplete),
        selectedCinemas: user.selectedCinemas,
        selectedGenres: mapIdsToNames(user.selectedGenres),
        selectedPosters: user.selectedPosters,
        aestheticProfile: user.aestheticProfile,
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
      if (req.body.selectedGenres) {
        user.selectedGenres = mapNamesToIds(req.body.selectedGenres)
      }
      user.selectedPosters = req.body.selectedPosters || user.selectedPosters
      user.aestheticProfile = req.body.aestheticProfile || user.aestheticProfile
      if (req.body.tasteProfileComplete !== undefined) {
        user.tasteProfileComplete = req.body.tasteProfileComplete
      }

      const updatedUser = await user.save()

      res.json({
        _id: updatedUser._id,
        firstName: updatedUser.firstName,
        lastName: updatedUser.lastName,
        email: updatedUser.email,
        profilePicture: updatedUser.profilePicture || null,
        tasteProfileComplete: updatedUser.tasteProfileComplete || false,
        token: generateToken(updatedUser._id, updatedUser.tasteProfileComplete),
        selectedCinemas: updatedUser.selectedCinemas,
        selectedGenres: mapIdsToNames(updatedUser.selectedGenres),
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

// ── PATCH /api/auth/profile ──────────────────────────────────────────────────
const updateProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
    if (!user) return res.status(404).json({ message: 'User not found' })

    const { firstName, lastName, email, currentPassword, newPassword, profilePicture } = req.body
    let emailChangePending = false

    // ── Name update ──────────────────────────────────────
    if (firstName) user.firstName = firstName.trim()
    if (lastName)  user.lastName  = lastName.trim()

    // ── Profile picture update ───────────────────────────
    if (profilePicture !== undefined) {
      user.profilePicture = profilePicture
    }

    // ── Email change → stage as pendingEmail + send OTP ──
    const normalizedEmail = email?.toLowerCase().trim()
    if (normalizedEmail && normalizedEmail !== user.email) {
      const taken = await User.findOne({ email: normalizedEmail })
      if (taken) return res.status(400).json({ message: 'That email is already in use.' })

      const otp = Math.floor(100000 + Math.random() * 900000).toString()
      user.pendingEmail = normalizedEmail
      user.otp = await bcrypt.hash(otp, 10)
      user.otpExpiry = Date.now() + 5 * 60 * 1000
      await sendOtpEmail(normalizedEmail, otp)
      emailChangePending = true
    }

    // ── Password change → verify current password first ──
    if (newPassword) {
      if (!currentPassword) {
        return res.status(400).json({ message: 'Current password is required to set a new one.' })
      }
      const match = await bcrypt.compare(currentPassword, user.password)
      if (!match) return res.status(401).json({ message: 'Current password is incorrect.' })
      const passwordError = validatePasswordStrength(newPassword)
      if (passwordError) return res.status(400).json({ message: passwordError })
      user.password = newPassword  // pre-save hook will hash it
    }

    const updated = await user.save()

    // Issue fresh token (important after password change)
    const token = generateToken(updated._id, updated.tasteProfileComplete)
    const userData = {
      _id: updated._id,
      firstName: updated.firstName,
      lastName: updated.lastName,
      email: updated.email,
      profilePicture: updated.profilePicture || null,
      tasteProfileComplete: updated.tasteProfileComplete,
      token,
    }

    res.json({
      ...userData,
      emailChangePending,
      pendingEmail: emailChangePending ? updated.pendingEmail : undefined,
      message: emailChangePending
        ? 'Profile updated. Check your new email for a verification code.'
        : 'Profile updated successfully.',
    })
  } catch (error) {
    console.error('UPDATE PROFILE ERROR:', error.message)
    res.status(500).json({ message: error.message })
  }
}

// ── POST /api/auth/verify-email-change ───────────────────────────────────────
const verifyEmailChange = async (req, res) => {
  try {
    const { otp } = req.body
    const user = await User.findById(req.user._id)
    if (!user) return res.status(404).json({ message: 'User not found' })

    if (!user.pendingEmail || !user.otp || !user.otpExpiry) {
      return res.status(400).json({ message: 'No pending email change found.' })
    }
    if (user.otpExpiry < Date.now()) {
      return res.status(400).json({ message: 'OTP has expired. Please request the change again.' })
    }
    const match = await bcrypt.compare(otp, user.otp)
    if (!match) return res.status(400).json({ message: 'Invalid OTP.' })

    // Commit the email change
    user.email = user.pendingEmail
    user.pendingEmail = null
    user.otp = undefined
    user.otpExpiry = undefined
    const updated = await user.save()

    const token = generateToken(updated._id, updated.tasteProfileComplete)
    const userData = {
      _id: updated._id,
      firstName: updated.firstName,
      lastName: updated.lastName,
      email: updated.email,
      profilePicture: updated.profilePicture || null,
      tasteProfileComplete: updated.tasteProfileComplete,
      token,
    }

    res.json({ ...userData, message: 'Email updated successfully.' })
  } catch (error) {
    console.error('VERIFY EMAIL CHANGE ERROR:', error.message)
    res.status(500).json({ message: error.message })
  }
}

// ── POST /api/auth/reset-taste ──────────────────────────────────────────────
const resetTasteProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
    if (!user) return res.status(404).json({ message: 'User not found' })

    user.tasteProfileComplete = false
    user.selectedCinemas = []
    user.selectedGenres = []
    user.selectedPosters = []
    user.aestheticProfile = undefined
    await user.save()

    // Clear user's calculated taste clusters and cached recommendations
    await UserTasteProfile.deleteMany({ userId: user._id })

    const token = generateToken(user._id, false)
    const userData = {
      _id: user._id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      profilePicture: user.profilePicture || null,
      tasteProfileComplete: false,
      token,
    }

    res.json({
      success: true,
      message: 'Taste profile reset successfully.',
      ...userData,
    })
  } catch (error) {
    console.error('RESET TASTE ERROR:', error.message)
    res.status(500).json({ message: error.message })
  }
}

module.exports = {
  registerUser,
  loginUser,
  updateTasteProfile,
  verifyOtp,
  resendOtp,
  updateProfile,
  verifyEmailChange,
  resetTasteProfile,
}