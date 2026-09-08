const mongoose = require('mongoose');

const lastMessageSchema = new mongoose.Schema(
  {
    text: {
      type: String,
      maxlength: 1000,
    },
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    sentAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false }
);

const readStateSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    lastReadAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false }
);

const conversationSchema = new mongoose.Schema(
  {
    participants: {
      type: [
        {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
        },
      ],
      validate: {
        validator: function (val) {
          return Array.isArray(val) && val.length === 2;
        },
        message: 'Conversation must have exactly 2 participants',
      },
      required: true,
      index: true,
    },
    // Canonical sorted user IDs to guarantee database-level uniqueness
    userA: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: function () {
        if (this.participants && this.participants.length === 2) {
          const sorted = [...this.participants].sort((a, b) =>
            a.toString().localeCompare(b.toString())
          );
          return sorted[0];
        }
        return undefined;
      },
      required: true,
    },
    userB: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: function () {
        if (this.participants && this.participants.length === 2) {
          const sorted = [...this.participants].sort((a, b) =>
            a.toString().localeCompare(b.toString())
          );
          return sorted[1];
        }
        return undefined;
      },
      required: true,
    },
    matchRequestId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'MatchRequest',
      default: null,
    },
    lastMessage: {
      type: lastMessageSchema,
      default: null,
    },
    lastMessageAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
    readState: {
      type: [readStateSchema],
      default: [],
    },
    archivedBy: {
      type: [
        {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
        },
      ],
      default: [],
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// Populate userA and userB canonically from participants if not provided
conversationSchema.pre('validate', function () {
  if (this.participants && this.participants.length === 2) {
    const sorted = [...this.participants].sort((a, b) =>
      a.toString().localeCompare(b.toString())
    );
    this.userA = sorted[0];
    this.userB = sorted[1];
  }
});

// Guarantee that at most one conversation can exist between any pair of users
conversationSchema.index({ userA: 1, userB: 1 }, { unique: true });

// Optimize conversation listing queries sorted by recent activity
conversationSchema.index({ participants: 1, lastMessageAt: -1 });

const Conversation = mongoose.model('Conversation', conversationSchema);

module.exports = Conversation;
