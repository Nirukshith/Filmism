const tasteClusterService = require('../services/tasteClusterService');
const UserTasteProfile = require('../models/userTasteProfileModel');
const jwt = require('jsonwebtoken');

/**
 * POST /api/taste-profile/initialize
 * Initialize taste profile from selected genres, origins, and 20-30 favorite films.
 */
const initializeTasteProfile = async (req, res) => {
  try {
    const { genres = [], origins = [], favorites = [], sessionId } = req.body;
    const userId = req.user?._id || req.user?.id;

    if (!Array.isArray(favorites) || favorites.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Please provide at least 1 favorite film (5+ recommended for multi-cluster analysis).',
      });
    }

    const effectiveSessionId = !userId ? (sessionId || `guest_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`) : undefined;

    const result = await tasteClusterService.buildTasteProfileFromFavorites({
      userId,
      sessionId: effectiveSessionId,
      genres,
      origins,
      favorites,
    });

    const updatedToken = userId
      ? jwt.sign({ id: userId, tasteProfileComplete: true }, process.env.JWT_SECRET, { expiresIn: '30d' })
      : undefined;

    res.json({
      success: true,
      sessionId: effectiveSessionId,
      tasteProfile: result.tasteProfile,
      clusters: result.clusters,
      aiSynthesis: result.aiSynthesis,
      tasteProfileComplete: true,
      token: updatedToken,
    });
  } catch (error) {
    console.error('Error initializing taste profile:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * GET /api/taste-profile/me
 * Retrieve the active user or session taste profile.
 */
const getUserTasteProfile = async (req, res) => {
  try {
    const userId = req.user?._id || req.user?.id;
    const sessionId = req.query.sessionId;

    if (!userId && !sessionId) {
      return res.status(400).json({
        success: false,
        message: 'Provide authorization token or sessionId query parameter.',
      });
    }

    const query = userId ? { userId } : { sessionId };
    const profile = await UserTasteProfile.findOne(query);

    if (!profile) {
      return res.status(404).json({
        success: false,
        message: 'No taste profile found. Initialize your profile first.',
      });
    }

    res.json({
      success: true,
      tasteProfile: profile,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * PUT /api/taste-profile/favorite-rating
 * Update a favorite film's 5-tier rating and re-compute cluster weights.
 */
const updateFavoriteRating = async (req, res) => {
  try {
    const { tmdbId, rating, sessionId } = req.body;
    const userId = req.user?._id || req.user?.id;

    if (!tmdbId || rating === undefined) {
      return res.status(400).json({
        success: false,
        message: 'tmdbId and rating (0-4) are required.',
      });
    }

    const query = userId ? { userId } : { sessionId };
    const profile = await UserTasteProfile.findOne(query);

    if (!profile) {
      return res.status(404).json({ success: false, message: 'Taste profile not found.' });
    }

    const labels = { 1: 'not for me', 2: 'okay', 3: 'good', 4: 'great', 0: 'haven\'t watched' };
    const existingFav = profile.favorites.find((f) => f.tmdbId === Number(tmdbId));

    if (existingFav) {
      existingFav.rating = Number(rating);
      existingFav.ratingLabel = labels[rating] || 'good';
    } else {
      profile.favorites.push({
        tmdbId: Number(tmdbId),
        rating: Number(rating),
        ratingLabel: labels[rating] || 'good',
        title: req.body.title || 'Movie',
      });
    }

    // Rebuild clusters with updated weights
    const rebuilt = await tasteClusterService.buildTasteProfileFromFavorites({
      userId,
      sessionId,
      genres: profile.selectedGenres,
      origins: profile.selectedOrigins,
      favorites: profile.favorites,
    });

    res.json({
      success: true,
      tasteProfile: rebuilt.tasteProfile,
      clusters: rebuilt.clusters,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * POST /api/taste-profile/append
 * Incrementally append new favorite films & ratings to active taste profile without resetting.
 */
const appendTasteProfileFavorites = async (req, res) => {
  try {
    const { favorites = [], sessionId } = req.body;
    const userId = req.user?._id || req.user?.id;

    if (!Array.isArray(favorites) || favorites.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Please provide at least 1 new favorite film to append.',
      });
    }

    const effectiveSessionId = !userId ? (sessionId || `guest_${Date.now()}`) : undefined;

    const result = await tasteClusterService.appendFavoritesToTasteProfile({
      userId,
      sessionId: effectiveSessionId,
      newFavorites: favorites,
    });

    res.json({
      success: true,
      sessionId: effectiveSessionId,
      tasteProfile: result.tasteProfile,
      clusters: result.clusters,
      aiSynthesis: result.aiSynthesis,
    });
  } catch (error) {
    console.error('Error appending taste profile favorites:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  initializeTasteProfile,
  appendTasteProfileFavorites,
  getUserTasteProfile,
  updateFavoriteRating,
};
