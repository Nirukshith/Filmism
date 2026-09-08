const jwt = require('jsonwebtoken')
const User = require('../models/userModel')

const protect = async (req, res, next) => {
  let token = req.cookies?.token

  if (!token && req.headers.authorization?.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1]
  }

  if (!token) {
    return res.status(401).json({ message: 'Not authorized, no token' })
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET)
    req.user = await User.findById(decoded.id).select('-password')
    if (!req.user) {
      return res.status(401).json({ message: 'Not authorized, user not found' })
    }
    if (req.user.isBanned) {
      return res.status(403).json({
        success: false,
        message: 'Your account has been suspended by a moderator.',
        isBanned: true,
      })
    }
    next()
  } catch (error) {
    return res.status(401).json({ message: 'Not authorized, token failed' })
  }
}

const optionalProtect = async (req, res, next) => {
  let token = req.cookies?.token

  if (!token && req.headers.authorization?.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1]
  }

  if (token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET)
      const user = await User.findById(decoded.id).select('-password')
      req.user = user && !user.isBanned ? user : null
    } catch (error) {
      req.user = null
    }
  } else {
    req.user = null
  }
  next()
}

const adminOnly = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    return next()
  }
  return res.status(403).json({
    success: false,
    message: 'Access denied. Administrator privileges required.',
  })
}

module.exports = { protect, optionalProtect, adminOnly }