const { z } = require('zod');

const optInSchema = z.object({
  matchingEnabled: z.boolean({
    required_error: 'matchingEnabled boolean is required',
  }),
});

const requestConnectSchema = z.object({
  toUserId: z
    .string({ required_error: 'toUserId is required' })
    .regex(/^[0-9a-fA-F]{24}$/, 'Invalid toUserId format'),
  matchId: z
    .string()
    .regex(/^[0-9a-fA-F]{24}$/, 'Invalid matchId format')
    .optional(),
  message: z
    .string()
    .max(200, 'Connection message cannot exceed 200 characters')
    .optional(),
});

const respondRequestSchema = z.object({
  action: z.enum(['accept', 'decline'], {
    errorMap: () => ({ message: "Action must be either 'accept' or 'decline'" }),
  }),
});

const nextTwinRecommendationSchema = z.object({
  twinUserId: z
    .string({ required_error: 'twinUserId is required' })
    .regex(/^[0-9a-fA-F]{24}$/, 'Invalid twinUserId format'),
  excludedTmdbIds: z.array(z.number()).optional(),
  watchedFilm: z
    .object({
      tmdbId: z.number(),
      title: z.string().optional(),
    })
    .optional(),
});

module.exports = {
  optInSchema,
  requestConnectSchema,
  respondRequestSchema,
  nextTwinRecommendationSchema,
};
