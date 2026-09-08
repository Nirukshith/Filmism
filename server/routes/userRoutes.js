const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const {
  blockUser,
  unblockUser,
  getBlockedUsers,
  reportUser,
} = require('../controllers/safetyController');
const { protect } = require('../middleware/authMiddleware');
const { validateRequest } = require('../middleware/validateRequest');
const {
  blockUserSchema,
  reportUserSchema,
} = require('../validators/safetyValidators');

const reportLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  validate: { keyGeneratorIpFallback: false },
  keyGenerator: (req) => req.user?._id?.toString() || req.ip,
  statusCode: 429,
  message: {
    success: false,
    message: 'Report rate limit reached. Please wait before submitting another report.',
  },
});

const blockLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  validate: { keyGeneratorIpFallback: false },
  keyGenerator: (req) => req.user?._id?.toString() || req.ip,
  statusCode: 429,
  message: {
    success: false,
    message: 'Too many block requests. Please try again later.',
  },
});

router.use(protect);

router.get('/blocked', getBlockedUsers);
router.post('/:id/block', blockLimiter, validateRequest(blockUserSchema), blockUser);
router.post('/:id/unblock', blockLimiter, unblockUser);
router.post('/:id/report', reportLimiter, validateRequest(reportUserSchema), reportUser);

module.exports = router;
