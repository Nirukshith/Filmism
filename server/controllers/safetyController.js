const safetyService = require('../services/safetyService');

/**
 * POST /api/safety/users/:id/block
 * Block a user.
 */
const blockUser = async (req, res, next) => {
  try {
    const blockerId = req.user._id;
    const { id: blockedId } = req.params;
    const { reason } = req.body || {};

    const result = await safetyService.blockUser(blockerId, blockedId, reason);
    res.json(result);
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/safety/users/:id/unblock
 * Unblock a user.
 */
const unblockUser = async (req, res, next) => {
  try {
    const blockerId = req.user._id;
    const { id: blockedId } = req.params;

    const result = await safetyService.unblockUser(blockerId, blockedId);
    res.json(result);
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/safety/blocked
 * Get list of users blocked by current user.
 */
const getBlockedUsers = async (req, res, next) => {
  try {
    const blockerId = req.user._id;
    const blockedUsers = await safetyService.getBlockedUsers(blockerId);

    res.json({
      success: true,
      blockedUsers,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/safety/users/:id/report
 * Report a user with evidence context snapshotting.
 */
const reportUser = async (req, res, next) => {
  try {
    const reporterId = req.user._id;
    const { id: reportedUserId } = req.params;
    const { conversationId, reason, details } = req.body;

    const result = await safetyService.reportUser(reporterId, reportedUserId, {
      conversationId,
      reason,
      details,
    });

    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/safety/reports
 * Moderation triage list for administrators.
 */
const getReports = async (req, res, next) => {
  try {
    const { status, page, limit } = req.query;

    const result = await safetyService.getReports({
      status,
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 20,
    });

    res.json({
      success: true,
      ...result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /api/safety/reports/:id
 * Update report status, administrative notes, and action taken.
 */
const updateReport = async (req, res, next) => {
  try {
    const { id: reportId } = req.params;
    const { status, adminNotes, actionTaken } = req.body;

    const result = await safetyService.updateReportStatus(reportId, {
      status,
      adminNotes,
      actionTaken,
    });

    res.json(result);
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/safety/users/:id/ban
 * Ban a user with optional reason and report association.
 */
const banUser = async (req, res, next) => {
  try {
    const adminId = req.user._id;
    const { id: userId } = req.params;
    const { reason, reportId } = req.body || {};

    const result = await safetyService.banUser(adminId, userId, reason, reportId);
    res.json(result);
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/safety/users/:id/unban
 * Unban a previously banned user.
 */
const unbanUser = async (req, res, next) => {
  try {
    const adminId = req.user._id;
    const { id: userId } = req.params;

    const result = await safetyService.unbanUser(adminId, userId);
    res.json(result);
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/safety/users/banned
 * List all currently banned users.
 */
const getBannedUsers = async (req, res, next) => {
  try {
    const bannedUsers = await safetyService.getBannedUsers();
    res.json({
      success: true,
      bannedUsers,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/safety/stats
 * Moderation Dashboard overview metrics.
 */
const getAdminStats = async (req, res, next) => {
  try {
    const stats = await safetyService.getAdminStats();
    res.json({
      success: true,
      stats,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
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
};
