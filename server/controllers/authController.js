const User = require('../models/userModel')
const UserTasteProfile = require('../models/userTasteProfileModel')
const jwt  = require('jsonwebtoken')
const bcrypt = require('bcryptjs') 
const sendOtpEmail = require('../utils/sendEmail')
const { mapNamesToIds, mapIdsToNames } = require('../utils/genreMap')         

// Generate JWT token (7-day validity)
const generateToken = (id, tasteProfileComplete = false) => {
  return jwt.sign({ id, tasteProfileComplete: !!tasteProfileComplete }, process.env.JWT_SECRET, { expiresIn: '7d' })
}

// Dummy hash for constant-time password comparison to prevent timing attacks
const DUMMY_HASH = '$2a$10$e8wF3Qv1mR0x9wGqjM1G4.K5d1K3k5k5k5k5k5k5k5k5k5k5k5k5k'

// Helper to set secure httpOnly cookie on response
const sendTokenCookie = (res, token) => {
  res.cookie('token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    path: '/',
  })
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
const registerUser = async (req, res, next) => {
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
      if (!userExists.isVerified) {
        // Refresh OTP for unverified user and send email
        const otp = Math.floor(100000 + Math.random() * 900000).toString()
        userExists.firstName = firstName.trim()
        userExists.lastName = lastName.trim()
        userExists.password = password // pre-save will rehash
        userExists.otp = await bcrypt.hash(otp, 10)
        userExists.otpExpiry = Date.now() + 5 * 60 * 1000
        userExists.otpAttempts = 0
        userExists.otpLastSentAt = Date.now()
        await userExists.save()
        await sendOtpEmail(userExists.email, otp)
      }

      // Return uniform message to prevent account enumeration
      return res.status(200).json({
        message: 'If this email is not yet registered, a verification code has been sent to your email.',
        email: normalizedEmail,
        tasteProfileComplete: false,
      })
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
      otpAttempts: 0,
      otpLastSentAt: Date.now(),
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
    next(error)
  }
}

// ── POST /api/auth/verify-otp ────────────────────────────────────────────────
const verifyOtp = async (req, res, next) => {
  const { email, otp } = req.body

  try {
    if (!email || !otp) {
      return res.status(400).json({ message: 'Email and OTP are required' })
    }

    const normalizedEmail = email.toLowerCase().trim()
    const user = await User.findOne({ email: normalizedEmail })
    if (!user || user.isVerified || !user.otp || !user.otpExpiry || user.otpExpiry < Date.now()) {
      return res.status(400).json({ message: 'Invalid or expired OTP. Please request a new one.' })
    }

    if (user.otpAttempts >= 5) {
      user.otp = undefined
      user.otpExpiry = undefined
      user.otpAttempts = 0
      await user.save()
      return res.status(400).json({ message: 'Too many incorrect OTP attempts. Your code has been invalidated. Please request a new one.' })
    }

    const isMatch = await bcrypt.compare(otp, user.otp)
    if (!isMatch) {
      user.otpAttempts = (user.otpAttempts || 0) + 1
      if (user.otpAttempts >= 5) {
        user.otp = undefined
        user.otpExpiry = undefined
        user.otpAttempts = 0
        await user.save()
        return res.status(400).json({ message: 'Too many incorrect OTP attempts. Your code has been invalidated. Please request a new one.' })
      }
      await user.save()
      const remainingAttempts = 5 - user.otpAttempts
      return res.status(400).json({
        message: `Invalid OTP. ${remainingAttempts} attempt${remainingAttempts === 1 ? '' : 's'} remaining.`,
      })
    }

    user.isVerified = true
    user.otp = undefined
    user.otpExpiry = undefined
    user.otpAttempts = 0
    await user.save()

    const token = generateToken(user._id, user.tasteProfileComplete)
    sendTokenCookie(res, token)

    res.json({
      _id:       user._id,
      firstName: user.firstName,
      lastName:  user.lastName,
      email:     user.email,
      profilePicture: user.profilePicture || null,
      tasteProfileComplete: user.tasteProfileComplete || false,
      token,
      selectedCinemas: user.selectedCinemas,
      selectedGenres: mapIdsToNames(user.selectedGenres),
      selectedPosters: user.selectedPosters,
      aestheticProfile: user.aestheticProfile,
    })
  } catch (error) {
    next(error)
  }
}

// ── POST /api/auth/resend-otp ────────────────────────────────────────────────
const resendOtp = async (req, res, next) => {
  const { email } = req.body

  try {
    const normalizedEmail = email?.toLowerCase().trim()
    const user = await User.findOne({ email: normalizedEmail })

    if (user && !user.isVerified) {
      // Check server-side 60s cooldown
      if (user.otpLastSentAt && (Date.now() - new Date(user.otpLastSentAt).getTime() < 60 * 1000)) {
        const remainingSeconds = Math.ceil((60 * 1000 - (Date.now() - new Date(user.otpLastSentAt).getTime())) / 1000)
        return res.status(429).json({ message: `Please wait ${remainingSeconds}s before requesting a new code.` })
      }

      const otp = Math.floor(100000 + Math.random() * 900000).toString()
      user.otp = await bcrypt.hash(otp, 10)
      user.otpExpiry = Date.now() + 5 * 60 * 1000
      user.otpAttempts = 0
      user.otpLastSentAt = Date.now()
      await user.save()

      await sendOtpEmail(user.email, otp)
    }

    // Always return uniform 200 message to prevent account enumeration
    res.json({ message: 'If an unverified account exists with this email, a new OTP has been sent.' })
  } catch (error) {
    next(error)
  }
}

// ── POST /api/auth/login ─────────────────────────────────────────────────────
const loginUser = async (req, res, next) => {
  const { email, password } = req.body

  try {
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' })
    }

    const normalizedEmail = email.toLowerCase().trim()
    const user = await User.findOne({ email: normalizedEmail })

    // Constant-time password comparison to eliminate timing attacks
    const hashToCompare = user ? user.password : DUMMY_HASH
    const isMatch = await bcrypt.compare(password, hashToCompare)

    if (!user || !isMatch) {
      return res.status(401).json({ message: 'Invalid email or password' })
    }

    if (!user.isVerified) {
      return res.status(401).json({ message: 'Please verify your email before logging in' })
    }

    const token = generateToken(user._id, user.tasteProfileComplete)
    sendTokenCookie(res, token)

    res.json({
      _id:       user._id,
      firstName: user.firstName,
      lastName:  user.lastName,
      email:     user.email,
      profilePicture: user.profilePicture || null,
      tasteProfileComplete: user.tasteProfileComplete || false,
      token,
      selectedCinemas: user.selectedCinemas,
      selectedGenres: mapIdsToNames(user.selectedGenres),
      selectedPosters: user.selectedPosters,
      aestheticProfile: user.aestheticProfile,
    })
  } catch (error) {
    next(error)
  }
}

// ── PUT /api/auth/profile ────────────────────────────────────────────────────
const updateTasteProfile = async (req, res, next) => {
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
    next(error)
  }
}

// Validate profile picture format (data URL or http URL) and size (< 1MB)
const validateProfilePicture = (picture) => {
  if (picture === null || picture === '') return null // clearing avatar is allowed
  if (typeof picture !== 'string') return 'Invalid profile picture format.'

  const isDataUrl = /^data:image\/(png|jpe?g|webp|gif);base64,/i.test(picture)
  const isHttpUrl = /^https?:\/\/.+/i.test(picture)

  if (!isDataUrl && !isHttpUrl) {
    return 'Profile picture must be a valid image format (PNG, JPEG, WebP, GIF).'
  }

  // Max 1.5MB character limit for base64 encoded ~1MB image
  if (picture.length > 1.5 * 1024 * 1024) {
    return 'Profile picture exceeds the maximum allowed size of 1MB.'
  }

  return null
}

// ── PATCH /api/auth/profile ──────────────────────────────────────────────────
const updateProfile = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id)
    if (!user) return res.status(404).json({ message: 'User not found' })

    const { firstName, lastName, email, currentPassword, newPassword, profilePicture } = req.body
    let emailChangePending = false

    // ── Name update ──────────────────────────────────────
    if (firstName) user.firstName = firstName.trim()
    if (lastName)  user.lastName  = lastName.trim()

    // ── Profile picture update (validated size & MIME) ───
    if (profilePicture !== undefined) {
      const picError = validateProfilePicture(profilePicture)
      if (picError) {
        return res.status(400).json({ message: picError })
      }
      user.profilePicture = profilePicture || null
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
      user.otpAttempts = 0
      user.otpLastSentAt = Date.now()
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
    sendTokenCookie(res, token)

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
    next(error)
  }
}

// ── POST /api/auth/verify-email-change ───────────────────────────────────────
const verifyEmailChange = async (req, res, next) => {
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

    if (user.otpAttempts >= 5) {
      user.otp = undefined
      user.otpExpiry = undefined
      user.otpAttempts = 0
      await user.save()
      return res.status(400).json({ message: 'Too many incorrect attempts. Code invalidated. Please request the change again.' })
    }

    const match = await bcrypt.compare(otp, user.otp)
    if (!match) {
      user.otpAttempts = (user.otpAttempts || 0) + 1
      if (user.otpAttempts >= 5) {
        user.otp = undefined
        user.otpExpiry = undefined
        user.otpAttempts = 0
        await user.save()
        return res.status(400).json({ message: 'Too many incorrect attempts. Code invalidated. Please request the change again.' })
      }
      await user.save()
      const remainingAttempts = 5 - user.otpAttempts
      return res.status(400).json({
        message: `Invalid OTP. ${remainingAttempts} attempt${remainingAttempts === 1 ? '' : 's'} remaining.`,
      })
    }

    // Commit the email change
    user.email = user.pendingEmail
    user.pendingEmail = null
    user.otp = undefined
    user.otpExpiry = undefined
    user.otpAttempts = 0
    const updated = await user.save()

    const token = generateToken(updated._id, updated.tasteProfileComplete)
    sendTokenCookie(res, token)

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
    next(error)
  }
}

// ── POST /api/auth/reset-taste ──────────────────────────────────────────────
const resetTasteProfile = async (req, res, next) => {
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
    sendTokenCookie(res, token)

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
    next(error)
  }
}

// ── POST /api/auth/logout ───────────────────────────────────────────────────
const logoutUser = (req, res) => {
  res.clearCookie('token', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
  })
  res.json({ success: true, message: 'Logged out successfully' })
}

module.exports = {
  registerUser,
  loginUser,
  logoutUser,
  updateTasteProfile,
  verifyOtp,
  resendOtp,
  updateProfile,
  verifyEmailChange,
  resetTasteProfile,
  sendTokenCookie,
}