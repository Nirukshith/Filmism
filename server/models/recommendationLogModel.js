const mongoose = require('mongoose');

const recommendationLogSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      index: true,
      sparse: true,
    },
    sessionId: {
      type: String,
      index: true,
      sparse: true,
    },
    tmdbId: {
      type: Number,
      required: true,
      index: true,
    },
    title: {
      type: String,
      default: 'Movie',
    },
    sourceClusterId: {
      type: String,
      default: 'cluster_1',
      index: true,
    },
    sourceClusterName: {
      type: String,
      default: '',
    },
    matchScore: {
      type: Number,
      default: 80,
    },
    // User action on recommendation: 'shown' | 'watchlisted' | 'dismissed' | 'watched'
    action: {
      type: String,
      enum: ['shown', 'watchlisted', 'dismissed', 'watched'],
      default: 'shown',
      index: true,
    },
    // Post-watch outcome rating (1: not for me, 2: okay, 3: good, 4: great, 0: not rated)
    outcomeRating: {
      type: Number,
      default: 0,
      min: 0,
      max: 4,
    },
    outcomeLabel: {
      type: String,
      enum: ['none', 'not for me', 'okay', 'good', 'great'],
      default: 'none',
    },
    timestamp: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

const RecommendationLog = mongoose.model('RecommendationLog', recommendationLogSchema);

module.exports = RecommendationLog;
