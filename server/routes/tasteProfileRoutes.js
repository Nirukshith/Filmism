const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const {
  initializeTasteProfile,
  appendTasteProfileFavorites,
  getUserTasteProfile,
  updateFavoriteRating,
} = require('../controllers/tasteProfileController');
const { optionalProtect } = require('../middleware/authMiddleware');

// Rate limiter for AI taste profile generation
const tasteProfileLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // max 20 profile builds/updates per window
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many taste profile requests. Please wait a few minutes before trying again.',
  },
});

const { validateRequest } = require('../middleware/validateRequest');
const {
  initializeTasteProfileSchema,
  updateFavoriteRatingSchema,
  appendFavoritesSchema,
} = require('../validators/tasteProfileValidators');

// POST /api/taste-profile/initialize (Guest + Authenticated + Rate limited)
router.post('/initialize', optionalProtect, tasteProfileLimiter, validateRequest(initializeTasteProfileSchema), initializeTasteProfile);

// POST /api/taste-profile/append (Guest + Authenticated + Rate limited)
router.post('/append', optionalProtect, tasteProfileLimiter, validateRequest(appendFavoritesSchema), appendTasteProfileFavorites);

// GET /api/taste-profile/me (Guest + Authenticated)
router.get('/me', optionalProtect, getUserTasteProfile);

// PUT /api/taste-profile/favorite-rating (Guest + Authenticated)
router.put('/favorite-rating', optionalProtect, validateRequest(updateFavoriteRatingSchema), updateFavoriteRating);

module.exports = router;
