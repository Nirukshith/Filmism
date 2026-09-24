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
  const query = {
    recipient: userObjId,
    $nor: [{ type: 'new_message', isRead: true }],
  };

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

  // Once read, dismiss message notification so it does not linger in tray
  if (updated.type === 'new_message' && typeof Notification.deleteOne === 'function') {
    try {
      const p = Notification.deleteOne({ _id: notifObjId });
      if (p && typeof p.catch === 'function') p.catch(() => {});
    } catch (e) {}
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

  // Clean up read message notifications
  if (typeof Notification.deleteMany === 'function') {
    try {
      const p = Notification.deleteMany({
        recipient: userObjId,
        type: 'new_message',
        isRead: true,
      });
      if (p && typeof p.catch === 'function') p.catch(() => {});
    } catch (e) {}
  }

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

  // Clean up read message notifications for this conversation
  if (typeof Notification.deleteMany === 'function') {
    try {
      const p = Notification.deleteMany({
        recipient: userObjId,
        type: 'new_message',
        'data.conversationId': convObjId,
        isRead: true,
      });
      if (p && typeof p.catch === 'function') p.catch(() => {});
    } catch (e) {}
  }
}

module.exports = {
  createNotification,
  getUserNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  markConversationNotificationsAsRead,
};
