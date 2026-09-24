const { z } = require('zod');

const blockUserSchema = z.object({
  params: z.object({
    id: z
      .string({ required_error: 'User ID is required' })
      .regex(/^[0-9a-fA-F]{24}$/, 'Invalid user ID format'),
  }),
  body: z
    .object({
      reason: z
        .string()
        .max(300, 'Block reason cannot exceed 300 characters')
        .optional(),
    })
    .optional(),
});

const reportUserSchema = z.object({
  params: z.object({
    id: z
      .string({ required_error: 'User ID is required' })
      .regex(/^[0-9a-fA-F]{24}$/, 'Invalid user ID format'),
  }),
  body: z.object({
    conversationId: z
      .string()
      .regex(/^[0-9a-fA-F]{24}$/, 'Invalid conversation ID format')
      .optional(),
    reason: z.enum(
      ['harassment', 'inappropriate_content', 'spam', 'hate_speech', 'other'],
      {
        errorMap: () => ({
          message:
            "Reason must be one of: 'harassment', 'inappropriate_content', 'spam', 'hate_speech', 'other'",
        }),
      }
    ),
    details: z
      .string()
      .max(1000, 'Details cannot exceed 1000 characters')
      .optional(),
  }),
});

const updateReportSchema = z.object({
  params: z.object({
    id: z
      .string({ required_error: 'Report ID is required' })
      .regex(/^[0-9a-fA-F]{24}$/, 'Invalid report ID format'),
  }),
  body: z.object({
    status: z.enum(['open', 'in_review', 'reviewed', 'resolved', 'actioned', 'dismissed'], {
      errorMap: () => ({
        message: "Status must be 'open', 'in_review', 'resolved', or 'dismissed'",
      }),
    }),
    adminNotes: z.string().max(1000).optional().nullable(),
    actionTaken: z.string().max(300).optional().nullable(),
  }),
});

module.exports = {
  blockUserSchema,
  reportUserSchema,
  updateReportSchema,
};
