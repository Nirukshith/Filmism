const mongoose = require('mongoose');
const Notification = require('../models/notificationModel');

/**
 * Create a new notification for a recipient.
 */
async function createNotification({ recipient, sender, type, title, body, data = {} }) {
  if (!recipient) return null;

  const recipientObjId = new mongoose.Types.ObjectId(recipient);
  const senderObjId = sender ? new mongoose.Types.ObjectId(sender) : null;

  // Do not send notification to oneself
  if (senderObjId && recipientObjId.equals(senderObjId)) {
    return null;
  }

  const notification = await Notification.create({
    recipient: recipientObjId,
    sender: senderObjId,
    type,
    title: title.trim(),
    body: body.trim(),
    data,
    isRead: false,
  });

  return notification;
}

/**
 * Retrieve notifications for a user with unread count and pagination.
 */
async function getUserNotifications(userId, { page = 1, limit = 20, unreadOnly = false } = {}) {
  const userObjId = new mongoose.Types.ObjectId(userId);
  const query = { recipient: userObjId };

  if (unreadOnly) {
    query.isRead = false;
  }

  const skip = (page - 1) * limit;

  const [notifications, total, unreadCount] = await Promise.all([
    Notification.find(query)
      .populate('sender', 'firstName lastName profilePicture')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Notification.countDocuments(query),
    Notification.countDocuments({ recipient: userObjId, isRead: false }),
  ]);

  return {
    notifications: notifications.map((n) => ({
      notificationId: n._id,
      type: n.type,
      title: n.title,
      body: n.body,
      data: n.data,
      isRead: n.isRead,
      readAt: n.readAt,
      createdAt: n.createdAt,
      sender: n.sender
        ? {
            userId: n.sender._id,
            firstName: n.sender.firstName,
            profilePicture: n.sender.profilePicture || null,
          }
        : null,
    })),
    unreadCount,
    pagination: {
      total,
      page,
      pages: Math.ceil(total / limit) || 1,
    },
  };
}

/**
 * Get count of unread notifications for a user.
 */
async function getUnreadCount(userId) {
  const userObjId = new mongoose.Types.ObjectId(userId);
  return await Notification.countDocuments({ recipient: userObjId, isRead: false });
}

/**
 * Mark a single notification as read.
 */
async function markAsRead(userId, notificationId) {
  const userObjId = new mongoose.Types.ObjectId(userId);
  const notifObjId = new mongoose.Types.ObjectId(notificationId);

  const updated = await Notification.findOneAndUpdate(
    { _id: notifObjId, recipient: userObjId },
    { $set: { isRead: true, readAt: new Date() } },
    { new: true }
  ).lean();

  if (!updated) {
    const err = new Error('Notification not found.');
    err.statusCode = 404;
    throw err;
  }

  return { success: true, notificationId: updated._id };
}

/**
 * Mark all notifications as read for a user.
 */
async function markAllAsRead(userId) {
  const userObjId = new mongoose.Types.ObjectId(userId);

  await Notification.updateMany(
    { recipient: userObjId, isRead: false },
    { $set: { isRead: true, readAt: new Date() } }
  );

  return { success: true, message: 'All notifications marked as read.' };
}

/**
 * Mark all message notifications for a specific conversation as read.
 */
async function markConversationNotificationsAsRead(userId, conversationId) {
  const userObjId = new mongoose.Types.ObjectId(userId);
  const convObjId = new mongoose.Types.ObjectId(conversationId);

  await Notification.updateMany(
    {
      recipient: userObjId,
      'data.conversationId': convObjId,
      isRead: false,
    },
    { $set: { isRead: true, readAt: new Date() } }
  );
}

module.exports = {
  createNotification,
  getUserNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  markConversationNotificationsAsRead,
};
