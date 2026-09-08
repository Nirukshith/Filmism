const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const {
  toggleOptIn,
  getCurrentMatch,
  findMatch,
} = require('../controllers/matchController');
const { protect } = require('../middleware/authMiddleware');
const { validateRequest } = require('../middleware/validateRequest');
const { optInSchema } = require('../validators/matchingValidators');

// Rate limiter for finding matches to prevent brute-force probing and vector computation spam
const findMatchLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour window
  max: 15, // max 15 match requests per hour per user/IP
  standardHeaders: true,
  legacyHeaders: false,
  validate: { keyGeneratorIpFallback: false },
  keyGenerator: (req) => req.user?._id?.toString() || req.ip,
  statusCode: 429,
  message: {
    success: false,
    message: 'You have reached the hourly match request limit. Please wait before finding another twin.',
  },
});

// PATCH /api/matching/opt-in (Auth required)
router.patch('/opt-in', protect, validateRequest(optInSchema), toggleOptIn);

// GET /api/matching/current (Auth required)
router.get('/current', protect, getCurrentMatch);

// POST /api/matching/find (Auth required + Rate limited)
router.post('/find', protect, findMatchLimiter, findMatch);

module.exports = router;
