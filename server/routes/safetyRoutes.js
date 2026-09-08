const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const {
  blockUser,
  unblockUser,
  getBlockedUsers,
  reportUser,
  getReports,
  updateReport,
  banUser,
  unbanUser,
  getBannedUsers,
  getAdminStats,
} = require('../controllers/safetyController');
const { protect, adminOnly } = require('../middleware/authMiddleware');
const { validateRequest } = require('../middleware/validateRequest');
const {
  blockUserSchema,
  reportUserSchema,
  updateReportSchema,
} = require('../validators/safetyValidators');

// Rate limiter for reporting users to prevent harassment / griefing report-bombing
const reportLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour window
  max: 5, // max 5 reports per hour per user
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

// Rate limiter for blocking users
const blockLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour window
  max: 30, // max 30 blocks per hour per user
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

// All safety routes require authentication
router.use(protect);

// User-facing Block routes
router.post('/users/:id/block', blockLimiter, validateRequest(blockUserSchema), blockUser);
router.post('/users/:id/unblock', blockLimiter, unblockUser);
router.get('/blocked', getBlockedUsers);

// User-facing Report route
router.post(
  '/users/:id/report',
  reportLimiter,
  validateRequest(reportUserSchema),
  reportUser
);

// ─── Administrator & Moderation Routes (Admin Role Required) ───────────────────
router.get('/stats', adminOnly, getAdminStats);
router.get('/reports', adminOnly, getReports);
router.patch('/reports/:id', adminOnly, validateRequest(updateReportSchema), updateReport);
router.post('/users/:id/ban', adminOnly, banUser);
router.post('/users/:id/unban', adminOnly, unbanUser);
router.get('/users/banned', adminOnly, getBannedUsers);

module.exports = router;
