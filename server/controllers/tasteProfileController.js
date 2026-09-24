const tasteClusterService = require('../services/tasteClusterService');
const UserTasteProfile = require('../models/userTasteProfileModel');
const RecommendationLog = require('../models/recommendationLogModel');
const jwt = require('jsonwebtoken');

/**
 * POST /api/taste-profile/initialize
 * Initialize taste profile from selected genres, origins, and 20-30 favorite films.
 */
const initializeTasteProfile = async (req, res, next) => {
  try {
    const { genres = [], origins = [], favorites = [], sessionId } = req.body;
    const userId = req.user?._id || req.user?.id;

    // Validation check
    if (!Array.isArray(favorites) || favorites.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Please provide at least 1 favorite film (5+ recommended for multi-cluster analysis).',
      });
    }
    // Determine Guest vs Registered User
    const effectiveSessionId = !userId ? (sessionId || `guest_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`) : undefined;

    // Build taste profile from favorites
    const result = await tasteClusterService.buildTasteProfileFromFavorites({
      userId,
      sessionId: effectiveSessionId,
      genres,
      origins,
      favorites,
    });

    // Update JWT Token for logged-in users (marks tasteProfileComplete: true)
    const updatedToken = userId
      ? jwt.sign({ id: userId, tasteProfileComplete: true }, process.env.JWT_SECRET, { expiresIn: '7d' })
      : undefined;

    // Set cookie for guest users (for state preservation across requests)
    if (updatedToken) {
      const isProduction = process.env.NODE_ENV === 'production'
      res.cookie('token', updatedToken, {
        httpOnly: true,
        secure: isProduction,
        sameSite: isProduction ? 'none' : 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000,
        path: '/',
      });
    }

    // Return the newly created profile, clusters, and AI explanation
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
    next(error);
  }
};

/**
 * GET /api/taste-profile/me
 * Retrieve the active user or session taste profile.
 */
const getUserTasteProfile = async (req, res, next) => {
  try {
    const userId = req.user?._id || req.user?.id;
    const sessionId = req.query.sessionId;

    // Checks whether the request comes from an authenticated user (userId) or guest (sessionId).
    if (!userId && !sessionId) {
      return res.status(400).json({
        success: false,
        message: 'Provide authorization token or sessionId query parameter.',
      });
    }

    // Finds the corresponding UserTasteProfile document in MongoDB.
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
    next(error);
  }
};

/**
 * PUT /api/taste-profile/favorite-rating
 * Update a favorite film's 5-tier rating and re-compute cluster weights.
 */
const updateFavoriteRating = async (req, res, next) => {
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

    // Also sync RecommendationLog if exists
    try {
      await RecommendationLog.updateMany(
        { ...query, tmdbId: Number(tmdbId) },
        { $set: { outcomeRating: Number(rating), outcomeLabel: labels[rating] || 'good' } }
      );
    } catch (e) {
      console.warn('RecommendationLog sync on rating edit warning:', e.message);
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
      aiSynthesis: rebuilt.aiSynthesis,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/taste-profile/append
 * Incrementally append new favorite films & ratings to active taste profile without resetting.
 */
const appendTasteProfileFavorites = async (req, res, next) => {
  try {
    const { favorites = [], sessionId } = req.body;
    const userId = req.user?._id || req.user?.id;

    //Input validation
    if (!Array.isArray(favorites) || favorites.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Please provide at least 1 new favorite film to append.',
      });
    }


    // Determine Guest vs Registered User
    const effectiveSessionId = !userId ? (sessionId || `guest_${Date.now()}`) : undefined;

    // Updates the existing taste profile by incorporating the new favorite films.
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
    next(error);
  }
};

module.exports = {
  initializeTasteProfile,
  appendTasteProfileFavorites,
  getUserTasteProfile,
  updateFavoriteRating,
};
