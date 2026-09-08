const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const {
  getConversations,
  getMessages,
  postMessage,
  markRead,
  archiveConversation,
} = require('../controllers/conversationController');
const { protect } = require('../middleware/authMiddleware');
const { validateRequest } = require('../middleware/validateRequest');
const {
  sendMessageSchema,
  getMessagesQuerySchema,
} = require('../validators/conversationValidators');

// Rate limiter for sending messages to prevent spam or flood attacks
const sendMessageLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute window
  max: 30, // max 30 messages per minute per user
  standardHeaders: true,
  legacyHeaders: false,
  validate: { keyGeneratorIpFallback: false },
  keyGenerator: (req) => req.user?._id?.toString() || req.ip,
  statusCode: 429,
  message: {
    success: false,
    message: 'Message rate limit exceeded. Please wait a moment before sending more messages.',
  },
});

// All conversation routes require authentication
router.use(protect);

// GET /api/conversations — list user's conversations
router.get('/', getConversations);

// GET /api/conversations/:id/messages — fetch messages with cursor / timestamp polling
router.get(
  '/:id/messages',
  validateRequest(getMessagesQuerySchema, 'query'),
  getMessages
);

// POST /api/conversations/:id/messages — send a new message (rate limited & validated)
router.post(
  '/:id/messages',
  sendMessageLimiter,
  validateRequest(sendMessageSchema, 'body'),
  postMessage
);

// PATCH /api/conversations/:id/read — mark conversation as read
router.patch('/:id/read', markRead);

// POST /api/conversations/:id/archive — archive or unarchive conversation
router.post('/:id/archive', archiveConversation);

module.exports = router;
