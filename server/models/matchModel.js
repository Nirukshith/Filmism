const mongoose = require('mongoose');

const sharedClusterSchema = new mongoose.Schema(
  {
    clusterName: {
      type: String,
      required: true,
    },
    userAWeight: {
      type: Number,
      default: 0,
    },
    userBWeight: {
      type: Number,
      default: 0,
    },
    overlapScore: {
      type: Number,
      default: 0,
    },
  },
  { _id: false }
);

const sharedFavoriteSchema = new mongoose.Schema(
  {
    tmdbId: {
      type: Number,
      required: true,
    },
    title: {
      type: String,
      required: true,
    },
    posterPath: {
      type: String,
      default: null,
    },
    year: {
      type: Number,
    },
  },
  { _id: false }
);

const matchSchema = new mongoose.Schema(
  {
    userA: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    userB: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    similarityScore: {
      type: Number,
      required: true,
    },
    sharedClusters: {
      type: [sharedClusterSchema],
      default: [],
    },
    sharedFavorites: {
      type: [sharedFavoriteSchema],
      default: [],
    },
    recommendedFilm: {
      tmdbId: { type: Number },
      title: { type: String },
      posterPath: { type: String },
      year: { type: Number },
      recommendedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    },
  },
  {
    timestamps: true,
  }
);

// Compound index to quickly find match between two users and avoid duplicate/reversed queries
matchSchema.index({ userA: 1, userB: 1 });

// Indexes to quickly retrieve a user's recent match history
matchSchema.index({ userA: 1, createdAt: -1 });
matchSchema.index({ userB: 1, createdAt: -1 });

const Match = mongoose.model('Match', matchSchema);

module.exports = Match;
