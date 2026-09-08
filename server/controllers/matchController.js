const matchingService = require('../services/matchingService');
const UserTasteProfile = require('../models/userTasteProfileModel');

/**
 * PATCH /api/matching/opt-in
 * Toggle Cinephile Twin matching on/off for the authenticated user.
 */
const toggleOptIn = async (req, res, next) => {
  try {
    const { matchingEnabled } = req.body;
    const userId = req.user._id;

    const profile = await UserTasteProfile.findOneAndUpdate(
      { userId },
      {
        matchingEnabled,
        matchingOptedInAt: matchingEnabled ? new Date() : null,
      },
      { new: true }
    );

    if (!profile) {
      return res.status(404).json({
        success: false,
        message: 'Taste profile not found. Please complete taste onboarding first.',
      });
    }

    res.json({
      success: true,
      matchingEnabled: profile.matchingEnabled,
      matchingOptedInAt: profile.matchingOptedInAt,
      message: profile.matchingEnabled
        ? 'Opted into Cinephile Twin matching successfully.'
        : 'Opted out of Cinephile Twin matching.',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/matching/current
 * Retrieve the authenticated user's current/latest Cinephile Twin match.
 */
const getCurrentMatch = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const profile = await UserTasteProfile.findOne({ userId }).lean();

    if (!profile) {
      return res.status(404).json({
        success: false,
        message: 'Taste profile not found.',
      });
    }

    if (!profile.matchingEnabled) {
      return res.json({
        success: true,
        matchingEnabled: false,
        match: null,
        message: 'Cinephile Twin matching is currently disabled in your settings.',
      });
    }

    const match = await matchingService.getCurrentMatch(userId);

    res.json({
      success: true,
      matchingEnabled: true,
      match,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/matching/find
 * Trigger computation to find a new Cinephile Twin match.
 */
const findMatch = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const match = await matchingService.findCinephileTwin(userId);

    res.json({
      success: true,
      match,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  toggleOptIn,
  getCurrentMatch,
  findMatch,
};
