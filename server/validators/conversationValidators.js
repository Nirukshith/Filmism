const { z } = require('zod');

const sendMessageSchema = z.object({
  text: z
    .string({ required_error: 'Message text is required' })
    .trim()
    .min(1, 'Message text cannot be empty')
    .max(1000, 'Message cannot exceed 1000 characters'),
});

const getMessagesQuerySchema = z.object({
  since: z
    .string()
    .datetime({ message: 'Invalid ISO timestamp format for since parameter' })
    .optional(),
  after: z
    .string()
    .regex(/^[0-9a-fA-F]{24}$/, 'Invalid message ID format for after parameter')
    .optional(),
  limit: z
    .string()
    .regex(/^\d+$/)
    .transform((val) => Math.min(Math.max(parseInt(val, 10), 1), 100))
    .optional(),
});

module.exports = {
  sendMessageSchema,
  getMessagesQuerySchema,
};
