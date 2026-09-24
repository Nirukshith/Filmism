const mongoose = require('mongoose');

const matchRequestSchema = new mongoose.Schema(
  {
    fromUser: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'fromUser is required'],
      index: true,
    },
    toUser: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'toUser is required'],
      index: true,
    },
    matchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Match',
      default: null,
    },
    status: {
      type: String,
      enum: ['pending', 'accepted', 'declined', 'cancelled'],
      default: 'pending',
    },
    message: {
      type: String,
      trim: true,
      maxlength: [200, 'Connection message cannot exceed 200 characters'],
      default: null,
    },
    respondedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Prevent duplicate active/existing connection requests between the exact same pair
matchRequestSchema.index({ fromUser: 1, toUser: 1 }, { unique: true });

// Optimizes querying incoming and outgoing requests by status
matchRequestSchema.index({ toUser: 1, status: 1 });
matchRequestSchema.index({ fromUser: 1, status: 1 });

const MatchRequest = mongoose.model('MatchRequest', matchRequestSchema);

module.exports = MatchRequest;
