const notificationService = require('../services/notificationService');

/**
 * GET /api/notifications
 * Retrieve notifications for the authenticated user.
 */
const getNotifications = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 20;
    const unreadOnly = req.query.unreadOnly === 'true';

    const result = await notificationService.getUserNotifications(userId, {
      page,
      limit,
      unreadOnly,
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
 * GET /api/notifications/unread-count
 * Retrieve unread notification count for the authenticated user.
 */
const getUnreadCount = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const unreadCount = await notificationService.getUnreadCount(userId);

    res.json({
      success: true,
      unreadCount,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /api/notifications/:id/read
 * Mark a single notification as read.
 */
const markRead = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const { id: notificationId } = req.params;

    const result = await notificationService.markAsRead(userId, notificationId);

    res.json(result);
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /api/notifications/read-all
 * Mark all notifications as read for the authenticated user.
 */
const markAllRead = async (req, res, next) => {
  try {
    const userId = req.user._id;

    const result = await notificationService.markAllAsRead(userId);

    res.json(result);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getNotifications,
  getUnreadCount,
  markRead,
  markAllRead,
};
