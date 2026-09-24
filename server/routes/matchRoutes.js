const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const {
  toggleOptIn,
  getCurrentMatch,
  findMatch,
  requestConnect,
  getRequests,
  respondToRequest,
  cancelRequest,
  getNextTwinRecommendation,
} = require('../controllers/matchController');
const { protect } = require('../middleware/authMiddleware');
const { validateRequest } = require('../middleware/validateRequest');
const {
  optInSchema,
  requestConnectSchema,
  respondRequestSchema,
  nextTwinRecommendationSchema,
} = require('../validators/matchingValidators');

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

// Rate limiter for connection requests to prevent mass contact spam
const requestConnectLimiter = rateLimit({
  windowMs: 24 * 60 * 60 * 1000, // 24 hour window
  max: 15, // max 15 connect requests per 24 hours per user
  standardHeaders: true,
  legacyHeaders: false,
  validate: { keyGeneratorIpFallback: false },
  keyGenerator: (req) => req.user?._id?.toString() || req.ip,
  statusCode: 429,
  message: {
    success: false,
    message: 'You have reached the daily connect request limit. Please try again tomorrow.',
  },
});

// PATCH /api/matching/opt-in (Auth required)
router.patch('/opt-in', protect, validateRequest(optInSchema), toggleOptIn);

// GET /api/matching/current (Auth required)
router.get('/current', protect, getCurrentMatch);

// POST /api/matching/find (Auth required + Rate limited)
router.post('/find', protect, findMatchLimiter, findMatch);

// POST /api/matching/request-connect (Auth required + Rate limited + Validated)
router.post(
  '/request-connect',
  protect,
  requestConnectLimiter,
  validateRequest(requestConnectSchema),
  requestConnect
);

// GET /api/matching/requests (Auth required)
router.get('/requests', protect, getRequests);

// POST /api/matching/requests/:id/respond (Auth required + Validated)
router.post(
  '/requests/:id/respond',
  protect,
  validateRequest(respondRequestSchema),
  respondToRequest
);

// POST /api/matching/requests/:id/cancel (Auth required)
router.post('/requests/:id/cancel', protect, cancelRequest);

// POST /api/matching/next-recommendation (Auth required + Validated)
router.post(
  '/next-recommendation',
  protect,
  validateRequest(nextTwinRecommendationSchema),
  getNextTwinRecommendation
);

module.exports = router;
