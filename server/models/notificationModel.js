const mongoose = require('mongoose');

const notificationDataSchema = new mongoose.Schema(
  {
    conversationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Conversation',
      default: null,
    },
    messageId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Message',
      default: null,
    },
    requestId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'MatchRequest',
      default: null,
    },
    tmdbId: {
      type: Number,
      default: null,
    },
  },
  { _id: false }
);

const notificationSchema = new mongoose.Schema(
  {
    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'recipient is required'],
      index: true,
    },
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    type: {
      type: String,
      enum: [
        'new_message',
        'connection_request',
        'connection_accepted',
        'twin_match',
        'system',
      ],
      required: [true, 'notification type is required'],
    },
    title: {
      type: String,
      required: [true, 'title is required'],
      trim: true,
      maxlength: 120,
    },
    body: {
      type: String,
      required: [true, 'body is required'],
      trim: true,
      maxlength: 500,
    },
    data: {
      type: notificationDataSchema,
      default: () => ({}),
    },
    isRead: {
      type: Boolean,
      default: false,
      index: true,
    },
    readAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Optimize fast querying of unread count and paginated list sorted by most recent
notificationSchema.index({ recipient: 1, isRead: 1, createdAt: -1 });
notificationSchema.index({ recipient: 1, createdAt: -1 });

const Notification = mongoose.model('Notification', notificationSchema);

module.exports = Notification;
