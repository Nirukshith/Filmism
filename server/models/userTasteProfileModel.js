const mongoose = require('mongoose');

const favoriteFilmSchema = new mongoose.Schema(
  {
    tmdbId: { type: Number, required: true },
    title: { type: String, required: true },
    year: { type: Number },
    posterPath: { type: String },
    // 5-tier rating: 1: 'not for me', 2: 'okay', 3: 'good', 4: 'great', 0: 'haven\'t watched' / unrated
    rating: { type: Number, default: 3, min: 0, max: 4 },
    ratingLabel: {
      type: String,
      enum: ['not for me', 'okay', 'good', 'great', 'haven\'t watched'],
      default: 'good',
    },
    addedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const tasteClusterSchema = new mongoose.Schema(
  {
    clusterId: { type: String, required: true },
    name: { type: String, required: true }, // e.g. "Dark Psychological & Neo-Noir Cinema"
    description: { type: String, default: '' },
    weight: { type: Number, default: 1.0, min: 0, max: 1 }, // Share of taste (0.0 to 1.0)
    centroidEmbedding: { type: [Number], default: [] }, // Dense centroid vector for this cluster
    topThemes: [
      {
        tag: { type: String },
        weight: { type: Number, default: 1.0 },
      },
    ],
    topMoods: [
      {
        tag: { type: String },
        weight: { type: Number, default: 1.0 },
      },
    ],
    topVisuals: [
      {
        tag: { type: String },
        weight: { type: Number, default: 1.0 },
      },
    ],
    dominantPacing: { type: String, default: 'moderate' },
    sourceFavoriteIds: { type: [Number], default: [] }, // TMDB movie IDs contributing to this cluster
    sourceFavorites: [
      {
        tmdbId: { type: Number },
        title: { type: String },
        year: { type: Number },
        posterPath: { type: String },
      },
    ],
  },
  { _id: false }
);

const userTasteProfileSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      index: true,
      sparse: true,
    },
    // Anonymous session ID for guests
    sessionId: {
      type: String,
      index: true,
      sparse: true,
    },
    selectedGenres: {
      type: [String],
      default: [],
    },
    selectedOrigins: {
      type: [String],
      default: [],
    },
    favorites: [favoriteFilmSchema],
    tasteClusters: [tasteClusterSchema],
    globalCentroid: {
      type: [Number],
      default: [],
    },
    onboardingStage: {
      type: String,
      enum: ['genres_origins', 'favorites_selected', 'candidates_rated', 'complete'],
      default: 'favorites_selected',
    },
    aiSynthesis: {
      type: String,
      default: '',
    },
    cachedRecommendations: {
      type: Array,
      default: [],
    },
    cachedRecommendationsAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

// 30-Day TTL cleanup: Automatically delete inactive guest profiles (where userId does not exist) after 30 days
userTasteProfileSchema.index(
  { updatedAt: 1 },
  {
    expireAfterSeconds: 30 * 24 * 60 * 60, // 30 days
    partialFilterExpression: { userId: { $exists: false } },
  }
);

const UserTasteProfile = mongoose.model('UserTasteProfile', userTasteProfileSchema);

module.exports = UserTasteProfile;
