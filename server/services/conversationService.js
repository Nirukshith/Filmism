const mongoose = require('mongoose');
const Conversation = require('../models/conversationModel');
const Message = require('../models/messageModel');
const Block = require('../models/blockModel');
const User = require('../models/userModel');

/**
 * Retrieve all active conversations for the authenticated user,
 * populated with partner public profile data and unread status.
 */
async function getUserConversations(userId) {
  const userObjId = new mongoose.Types.ObjectId(userId);

  // 1. Identify all blocked partners for this user
  const blocks = await Block.find({
    $or: [{ blocker: userObjId }, { blocked: userObjId }],
  }).lean();

  const blockedUserIds = blocks.map((b) =>
    b.blocker.toString() === userObjId.toString() ? b.blocked : b.blocker
  );

  // 2. Fetch conversations where user is a participant and not archived by this user
  const conversations = await Conversation.find({
    participants: userObjId,
    archivedBy: { $ne: userObjId },
    userA: { $nin: blockedUserIds },
    userB: { $nin: blockedUserIds },
  })
    .populate('participants', 'firstName lastName profilePicture')
    .sort({ lastMessageAt: -1 })
    .lean();

  // 3. Format conversations with partner details and unread indicator
  return conversations.map((conv) => {
    const partner = conv.participants.find(
      (p) => p._id.toString() !== userObjId.toString()
    );

    const userReadState = (conv.readState || []).find(
      (rs) => rs.user.toString() === userObjId.toString()
    );

    const lastReadAt = userReadState ? new Date(userReadState.lastReadAt).getTime() : 0;
    const lastMessageSentAt = conv.lastMessage?.sentAt
      ? new Date(conv.lastMessage.sentAt).getTime()
      : 0;
    const isLastMessageFromPartner =
      conv.lastMessage?.sender &&
      conv.lastMessage.sender.toString() !== userObjId.toString();

    const hasUnread = isLastMessageFromPartner && lastMessageSentAt > lastReadAt;

    return {
      conversationId: conv._id,
      partner: {
        userId: partner?._id,
        firstName: partner?.firstName || 'Cinephile Twin',
        profilePicture: partner?.profilePicture || null,
      },
      lastMessage: conv.lastMessage
        ? {
            text: conv.lastMessage.text,
            sender: conv.lastMessage.sender,
            sentAt: conv.lastMessage.sentAt,
          }
        : null,
      lastMessageAt: conv.lastMessageAt,
      hasUnread,
      isActive: conv.isActive !== false,
      createdAt: conv.createdAt,
    };
  });
}

/**
 * Retrieve messages for a specific conversation with cursor/since-timestamp polling support.
 * Strictly verifies participant authorization (IDOR safeguard) and block status.
 */
async function getConversationMessages(userId, conversationId, options = {}) {
  const userObjId = new mongoose.Types.ObjectId(userId);
  const convObjId = new mongoose.Types.ObjectId(conversationId);
  const limit = options.limit || 50;

  // 1. Fetch conversation and enforce IDOR check
  const conversation = await Conversation.findById(convObjId)
    .populate('participants', 'firstName lastName profilePicture')
    .lean();

  if (!conversation) {
    const err = new Error('Conversation not found.');
    err.statusCode = 404;
    throw err;
  }

  const isParticipant = conversation.participants.some(
    (p) => p._id.toString() === userObjId.toString()
  );

  if (!isParticipant) {
    const err = new Error('You do not have access to this conversation.');
    err.statusCode = 403;
    throw err;
  }

  const partner = conversation.participants.find(
    (p) => p._id.toString() !== userObjId.toString()
  );

  // 2. Check if either user has blocked the other
  const isBlocked = await Block.findOne({
    $or: [
      { blocker: userObjId, blocked: partner?._id },
      { blocker: partner?._id, blocked: userObjId },
    ],
  }).lean();

  if (isBlocked) {
    return {
      conversationId: conversation._id,
      partner: {
        userId: partner?._id,
        firstName: partner?.firstName || 'Cinephile Twin',
        profilePicture: null,
      },
      isBlocked: true,
      messages: [],
    };
  }

  // 3. Build message query with cursor support
  const query = { conversationId: convObjId };

  if (options.after) {
    query._id = { $gt: new mongoose.Types.ObjectId(options.after) };
  } else if (options.since) {
    query.createdAt = { $gt: new Date(options.since) };
  }

  const messages = await Message.find(query)
    .sort({ createdAt: 1 })
    .limit(limit)
    .lean();

  // 4. Update user's read state
  if (messages.length > 0 || !options.since) {
    await Conversation.updateOne(
      { _id: convObjId, 'readState.user': userObjId },
      { $set: { 'readState.$.lastReadAt': new Date() } }
    );
  }

  return {
    conversationId: conversation._id,
    partner: {
      userId: partner?._id,
      firstName: partner?.firstName || 'Cinephile Twin',
      profilePicture: partner?.profilePicture || null,
    },
    isBlocked: false,
    messages: messages.map((m) => ({
      messageId: m._id,
      conversationId: m.conversationId,
      sender: m.sender,
      text: m.text,
      createdAt: m.createdAt,
    })),
  };
}

/**
 * Send a new message in a conversation.
 * Verifies participant authorization, block status, sanitizes input, and updates conversation metadata.
 */
async function sendMessage(userId, conversationId, text) {
  const userObjId = new mongoose.Types.ObjectId(userId);
  const convObjId = new mongoose.Types.ObjectId(conversationId);

  // 1. Fetch conversation & enforce IDOR check
  const conversation = await Conversation.findById(convObjId);
  if (!conversation) {
    const err = new Error('Conversation not found.');
    err.statusCode = 404;
    throw err;
  }

  const isParticipant = conversation.participants.some(
    (p) => p.toString() === userObjId.toString()
  );

  if (!isParticipant) {
    const err = new Error('You do not have access to send messages to this conversation.');
    err.statusCode = 403;
    throw err;
  }

  const partnerId = conversation.participants.find(
    (p) => p.toString() !== userObjId.toString()
  );

  // 2. Check if either user has blocked the other
  const isBlocked = await Block.findOne({
    $or: [
      { blocker: userObjId, blocked: partnerId },
      { blocker: partnerId, blocked: userObjId },
    ],
  }).lean();

  if (isBlocked) {
    const err = new Error('Cannot send message to this conversation.');
    err.statusCode = 403;
    throw err;
  }

  // 3. Create the message
  const message = await Message.create({
    conversationId: convObjId,
    sender: userObjId,
    text: text.trim(),
    readBy: [userObjId],
  });

  // 4. Update conversation metadata and unarchive for recipient if previously archived
  conversation.lastMessage = {
    text: message.text,
    sender: userObjId,
    sentAt: message.createdAt,
  };
  conversation.lastMessageAt = message.createdAt;
  conversation.archivedBy = (conversation.archivedBy || []).filter(
    (id) => id.toString() === userObjId.toString()
  );

  // Update sender's read state
  const readStateIndex = conversation.readState.findIndex(
    (rs) => rs.user.toString() === userObjId.toString()
  );
  if (readStateIndex !== -1) {
    conversation.readState[readStateIndex].lastReadAt = message.createdAt;
  } else {
    conversation.readState.push({ user: userObjId, lastReadAt: message.createdAt });
  }

  await conversation.save();

  return {
    messageId: message._id,
    conversationId: message.conversationId,
    sender: message.sender,
    text: message.text,
    createdAt: message.createdAt,
  };
}

/**
 * Mark all messages in a conversation as read by the current user.
 */
async function markConversationRead(userId, conversationId) {
  const userObjId = new mongoose.Types.ObjectId(userId);
  const convObjId = new mongoose.Types.ObjectId(conversationId);

  const updated = await Conversation.updateOne(
    { _id: convObjId, participants: userObjId, 'readState.user': userObjId },
    { $set: { 'readState.$.lastReadAt': new Date() } }
  );

  if (updated.matchedCount === 0) {
    // If readState entry doesn't exist yet, push it
    await Conversation.updateOne(
      { _id: convObjId, participants: userObjId },
      { $addToSet: { readState: { user: userObjId, lastReadAt: new Date() } } }
    );
  }

  return { success: true };
}

/**
 * Toggle archiving a conversation for the requesting user.
 */
async function toggleArchiveConversation(userId, conversationId, archive = true) {
  const userObjId = new mongoose.Types.ObjectId(userId);
  const convObjId = new mongoose.Types.ObjectId(conversationId);

  const updateOp = archive
    ? { $addToSet: { archivedBy: userObjId } }
    : { $pull: { archivedBy: userObjId } };

  const conversation = await Conversation.findOneAndUpdate(
    { _id: convObjId, participants: userObjId },
    updateOp,
    { new: true }
  );

  if (!conversation) {
    const err = new Error('Conversation not found.');
    err.statusCode = 404;
    throw err;
  }

  return {
    success: true,
    isArchived: archive,
    conversationId: conversation._id,
  };
}

module.exports = {
  getUserConversations,
  getConversationMessages,
  sendMessage,
  markConversationRead,
  toggleArchiveConversation,
};
