const mongoose = require('mongoose');

const contextSnapshotMessageSchema = new mongoose.Schema(
  {
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    text: {
      type: String,
      required: true,
    },
    sentAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false }
);

const reportSchema = new mongoose.Schema(
  {
    reporter: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'reporter userId is required'],
      index: true,
    },
    reportedUser: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'reportedUser userId is required'],
      index: true,
    },
    conversationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Conversation',
      default: null,
    },
    reason: {
      type: String,
      enum: {
        values: ['harassment', 'inappropriate_content', 'spam', 'hate_speech', 'other'],
        message: '{VALUE} is not a valid report reason',
      },
      required: [true, 'Report reason is required'],
    },
    details: {
      type: String,
      trim: true,
      maxlength: [1000, 'Details cannot exceed 1000 characters'],
      default: null,
    },
    // Immutable snapshot of recent conversation messages at the moment the report is filed
    contextSnapshot: {
      type: [contextSnapshotMessageSchema],
      default: [],
    },
    status: {
      type: String,
      enum: ['open', 'reviewed', 'actioned', 'dismissed'],
      default: 'open',
      index: true,
    },
    adminNotes: {
      type: String,
      default: null,
    },
    actionTaken: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for administrative moderation triage and reporting query performance
reportSchema.index({ reportedUser: 1, status: 1 });
reportSchema.index({ reporter: 1, createdAt: -1 });
reportSchema.index({ status: 1, createdAt: -1 });

const Report = mongoose.model('Report', reportSchema);

module.exports = Report;
