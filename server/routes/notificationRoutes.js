const express = require('express');
const router = express.Router();
const {
  getNotifications,
  getUnreadCount,
  markRead,
  markAllRead,
} = require('../controllers/notificationController');
const { protect } = require('../middleware/authMiddleware');

// All notification routes require authentication
router.use(protect);

// GET /api/notifications — retrieve notifications
router.get('/', getNotifications);

// GET /api/notifications/unread-count — retrieve unread notification count
router.get('/unread-count', getUnreadCount);

// PATCH /api/notifications/read-all — mark all notifications as read
router.patch('/read-all', markAllRead);

// PATCH /api/notifications/:id/read — mark specific notification as read
router.patch('/:id/read', markRead);

module.exports = router;
