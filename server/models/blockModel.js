const mongoose = require('mongoose');

const blockSchema = new mongoose.Schema(
  {
    blocker: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'blocker userId is required'],
    },
    blocked: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'blocked userId is required'],
    },
    reason: {
      type: String,
      trim: true,
      maxlength: 300,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Enforce unique compound constraint so a user cannot block the same user multiple times
blockSchema.index({ blocker: 1, blocked: 1 }, { unique: true });

// Optimize reverse queries when checking if either user has blocked the other
blockSchema.index({ blocked: 1 });

const Block = mongoose.model('Block', blockSchema);

module.exports = Block;
