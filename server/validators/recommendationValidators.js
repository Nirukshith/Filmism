const { z } = require('zod');

const rateCandidateSchema = z.object({
  tmdbId: z.coerce.number().int().positive('TMDB ID must be a positive integer'),
  rating: z.coerce
    .number()
    .int('Rating must be an integer')
    .min(0, 'Rating must be between 0 and 4')
    .max(4, 'Rating must be between 0 and 4'),
  sourceClusterId: z.string().max(100).optional(),
  sessionId: z.string().max(100).optional(),
});

const rankedRecommendationsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1).optional(),
  limit: z.coerce.number().int().min(1).max(50).default(12).optional(),
  refresh: z.preprocess((val) => val === 'true' || val === true, z.boolean()).optional(),
  forceRefresh: z.preprocess((val) => val === 'true' || val === true, z.boolean()).optional(),
  sessionId: z.string().max(100).optional(),
});

const recordActionSchema = z.object({
  tmdbId: z.coerce.number().int().positive('TMDB ID must be a positive integer'),
  action: z.enum(['shown', 'watchlisted', 'dismissed', 'watched'], {
    errorMap: () => ({ message: "Action must be one of: 'shown', 'watchlisted', 'dismissed', 'watched'" }),
  }),
  title: z.string().max(250).optional(),
  sourceClusterId: z.string().max(100).optional(),
  sourceClusterName: z.string().max(200).optional(),
  matchScore: z.coerce.number().min(0).max(1).optional(),
  sessionId: z.string().max(100).optional(),
});

const recordOutcomeSchema = z.object({
  tmdbId: z.coerce.number().int().positive('TMDB ID must be a positive integer'),
  outcomeRating: z.coerce
    .number()
    .int('Outcome rating must be an integer')
    .min(1, 'Outcome rating must be between 1 and 4')
    .max(4, 'Outcome rating must be between 1 and 4'),
  sourceClusterId: z.string().max(100).optional(),
  sessionId: z.string().max(100).optional(),
});

module.exports = {
  rateCandidateSchema,
  rankedRecommendationsQuerySchema,
  recordActionSchema,
  recordOutcomeSchema,
};
