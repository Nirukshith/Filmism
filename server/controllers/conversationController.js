const conversationService = require('../services/conversationService');

/**
 * GET /api/conversations
 * Retrieve the authenticated user's conversation list.
 */
const getConversations = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const conversations = await conversationService.getUserConversations(userId);

    res.json({
      success: true,
      conversations,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/conversations/:id/messages
 * Retrieve messages for a specific conversation with cursor/since-timestamp polling.
 */
const getMessages = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const { id: conversationId } = req.params;
    const { since, after, limit } = req.query;

    const result = await conversationService.getConversationMessages(
      userId,
      conversationId,
      { since, after, limit }
    );

    res.json({
      success: true,
      ...result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/conversations/:id/messages
 * Send a message in an existing conversation.
 */
const postMessage = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const { id: conversationId } = req.params;
    const { text } = req.body;

    const message = await conversationService.sendMessage(
      userId,
      conversationId,
      text
    );

    res.status(201).json({
      success: true,
      message,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /api/conversations/:id/read
 * Mark conversation as read by the current user.
 */
const markRead = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const { id: conversationId } = req.params;

    const result = await conversationService.markConversationRead(
      userId,
      conversationId
    );

    res.json(result);
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/conversations/:id/archive
 * Toggle archiving for a conversation.
 */
const archiveConversation = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const { id: conversationId } = req.params;
    const { archive = true } = req.body;

    const result = await conversationService.toggleArchiveConversation(
      userId,
      conversationId,
      archive
    );

    res.json(result);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getConversations,
  getMessages,
  postMessage,
  markRead,
  archiveConversation,
};
