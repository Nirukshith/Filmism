const mongoose = require('mongoose');

const movieProfileSchema = new mongoose.Schema(
  {
    tmdbId: {
      type: Number,
      required: true,
      unique: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
    },
    releaseYear: {
      type: Number,
    },
    posterPath: {
      type: String,
    },
    backdropPath: {
      type: String,
    },
    overview: {
      type: String,
    },
    genres: {
      type: [String],
      default: [],
    },
    originCountries: {
      type: [String],
      default: [],
    },
    director: {
      type: String,
      default: 'Unknown',
    },
    cast: {
      type: [String],
      default: [],
    },
    keywords: {
      type: [String],
      default: [],
    },
    profile: {
      themes: {
        type: [String],
        default: [],
        index: true,
      },
      mood: {
        type: [String],
        default: [],
        index: true,
      },
      narrativeStyle: {
        type: [String],
        default: [],
      },
      visualAesthetic: {
        type: [String],
        default: [],
      },
      pacing: {
        type: String,
        enum: ['slow-burn', 'moderate', 'fast-paced', 'frenetic', 'unspecified'],
        default: 'unspecified',
      },
      emotionalTone: {
        type: [String],
        default: [],
      },
      characterArchetypes: {
        type: [String],
        default: [],
      },
      culturalTradition: {
        type: String,
        default: 'General',
      },
    },
    aiSummary: {
      type: String,
      default: '',
    },
    // Dense float vector for semantic search (e.g. 768-dim from Gemini or 1536-dim from OpenAI)
    embedding: {
      type: [Number],
      default: [],
    },
    embeddingModel: {
      type: String,
      default: 'gemini-text-embedding-004',
    },
    isProfiled: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// Helpful index on genres for fast lookup
movieProfileSchema.index({ genres: 1 });

const MovieProfile = mongoose.model('MovieProfile', movieProfileSchema);

module.exports = MovieProfile;
