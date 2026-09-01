const express = require('express');
const router = express.Router();
const {
  initializeTasteProfile,
  getUserTasteProfile,
  updateFavoriteRating,
} = require('../controllers/tasteProfileController');
const { optionalProtect } = require('../middleware/authMiddleware');

// POST /api/taste-profile/initialize
router.post('/initialize', optionalProtect, initializeTasteProfile);

// GET /api/taste-profile/me
router.get('/me', optionalProtect, getUserTasteProfile);

// PUT /api/taste-profile/favorite-rating
router.put('/favorite-rating', optionalProtect, updateFavoriteRating);

module.exports = router;
