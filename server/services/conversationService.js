const mongoose = require('mongoose');
const Conversation = require('../models/conversationModel');
const Message = require('../models/messageModel');
const Block = require('../models/blockModel');
const User = require('../models/userModel');
const notificationService = require('./notificationService');

/**
 * Safely extracts a string ID from a participant whether populated or ObjectId.
 */
function getParticipantId(participant) {
  return (participant?._id || participant)?.toString();
}

/**
 * Finds the other participant in a conversation.
 */
function getConversationPartner(participants, currentUserId) {
  const currentUserIdStr = currentUserId.toString();
  return (participants || []).find(
    (p) => getParticipantId(p) !== currentUserIdStr
  );
}

/**
 * Validates that the conversation exists and that the user is an active participant (IDOR safeguard).
 */
function validateConversationParticipant(
  conversation,
  userObjId,
  forbiddenMessage = 'You do not have access to this conversation.'
) {
  if (!conversation) {
    const err = new Error('Conversation not found.');
    err.statusCode = 404;
    throw err;
  }

  const userObjIdStr = userObjId.toString();
  const isParticipant = (conversation.participants || []).some(
    (p) => getParticipantId(p) === userObjIdStr
  );

  if (!isParticipant) {
    const err = new Error(forbiddenMessage);
    err.statusCode = 403;
    throw err;
  }
}

/**
 * Queries for any existing block relationship between two users.
 */
async function findBlockBetween(userAId, userBId) {
  const partnerId = userBId?._id || userBId;
  if (!partnerId) return null;

  return Block.findOne({
    $or: [
      { blocker: userAId, blocked: partnerId },
      { blocker: partnerId, blocked: userAId },
    ],
  }).lean();
}

/**
 * Resolves boolean flags for block state from a block record.
 */
function resolveBlockStatus(blockRecord, currentUserId, partnerIdStr) {
  const currentUserIdStr = currentUserId.toString();
  const isBlockedByMe = Boolean(blockRecord && blockRecord.blocker.toString() === currentUserIdStr);
  const isBlockedByPartner = Boolean(blockRecord && blockRecord.blocker.toString() === partnerIdStr);
  const isBlocked = Boolean(blockRecord);

  return {
    isBlocked,
    isBlockedByMe,
    isBlockedByPartner,
    canMessage: !isBlocked,
  };
}

/**
 * Verifies that the sender has not blocked or been blocked before sending a message.
 */
function assertCanSendMessage(blockRecord, userObjId) {
  if (blockRecord) {
    if (blockRecord.blocker.toString() === userObjId.toString()) {
      const err = new Error('You have blocked this user. Please unblock them to send a message.');
      err.statusCode = 403;
      throw err;
    }
    const err = new Error('Cannot send message to this conversation.');
    err.statusCode = 403;
    throw err;
  }
}

/**
 * Retrieve all active conversations for the authenticated user,
 * populated with partner public profile data, unread status, and block status.
 */
async function getUserConversations(userId) {
  const userObjId = new mongoose.Types.ObjectId(userId);

  // 1. Identify all block relations involving this user
  const blocks = await Block.find({
    $or: [{ blocker: userObjId }, { blocked: userObjId }],
  }).lean();

  // 2. Fetch conversations where user is a participant and not archived by this user
  const conversations = await Conversation.find({
    participants: userObjId,
    archivedBy: { $ne: userObjId },
  })
    .populate('participants', 'firstName lastName profilePicture')
    .sort({ lastMessageAt: -1 })
    .lean();

  // 3. Format conversations with partner details, block status, and unread indicator
  return conversations.map((conv) => {
    const partner = getConversationPartner(conv.participants, userObjId);
    const partnerIdStr = getParticipantId(partner);

    const isBlockedByMe = blocks.some(
      (b) => b.blocker.toString() === userObjId.toString() && b.blocked.toString() === partnerIdStr
    );
    const isBlockedByPartner = blocks.some(
      (b) => b.blocker.toString() === partnerIdStr && b.blocked.toString() === userObjId.toString()
    );
    const isBlocked = isBlockedByMe || isBlockedByPartner;

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

    const hasUnread = !isBlocked && isLastMessageFromPartner && lastMessageSentAt > lastReadAt;

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
      isBlocked,
      isBlockedByMe,
      isBlockedByPartner,
      canMessage: !isBlocked,
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

  validateConversationParticipant(conversation, userObjId);

  const partner = getConversationPartner(conversation.participants, userObjId);
  const partnerIdStr = getParticipantId(partner);

  // 2. Check if either user has blocked the other
  const blockRecord = await findBlockBetween(userObjId, partner?._id);
  const { isBlocked, isBlockedByMe, isBlockedByPartner, canMessage } = resolveBlockStatus(
    blockRecord,
    userObjId,
    partnerIdStr
  );

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
  if ((messages.length > 0 || !options.since) && !isBlocked) {
    await Conversation.updateOne(
      { _id: convObjId, 'readState.user': userObjId },
      { $set: { 'readState.$.lastReadAt': new Date() } }
    );
    try {
      await notificationService.markConversationNotificationsAsRead(userObjId, convObjId);
    } catch (notifErr) {
      console.error('Failed to mark conversation notifications as read:', notifErr.message);
    }
  }

  return {
    conversationId: conversation._id,
    partner: {
      userId: partner?._id,
      firstName: partner?.firstName || 'Cinephile Twin',
      profilePicture: partner?.profilePicture || null,
    },
    isBlocked,
    isBlockedByMe,
    isBlockedByPartner,
    canMessage,
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
  validateConversationParticipant(
    conversation,
    userObjId,
    'You do not have access to send messages to this conversation.'
  );

  const partnerId = getConversationPartner(conversation.participants, userObjId);

  // 2. Check if either user has blocked the other
  const blockRecord = await findBlockBetween(userObjId, partnerId);
  assertCanSendMessage(blockRecord, userObjId);

  // 3. Create the message
  const message = await Message.create({
    conversationId: convObjId,
    sender: userObjId,
    text: text.trim(),
    readBy: [userObjId],
  });

  // 4. Unarchive conversation for recipient when a new message arrives if it was previously archived 
  conversation.lastMessage = {
    text: message.text,
    sender: userObjId,
    sentAt: message.createdAt,
  };
  conversation.lastMessageAt = message.createdAt;
  conversation.archivedBy = (conversation.archivedBy || []).filter(
    (id) => id.toString() === userObjId.toString()
  );

  // Update sender's read state when receipent reads the message

  /* Because you just wrote and sent the message, you have obviously already "seen" it. By setting your lastReadAt equal to the message creation time:
  Your inbox won't show "1 new message" for a message you typed yourself.
  Only the recipient (whose lastReadAt is older than this new message) will see the bold/unread indicator and unread badge. */

  const readStateIndex = conversation.readState.findIndex(
    (rs) => rs.user.toString() === userObjId.toString()
  );
  if (readStateIndex !== -1) {
    conversation.readState[readStateIndex].lastReadAt = message.createdAt;
  } else {
    conversation.readState.push({ user: userObjId, lastReadAt: message.createdAt });
  }

  await conversation.save();

  // 5. Trigger non-blocking notification for recipient
  try {
    const senderUser = await User.findById(userObjId).select('firstName lastName').lean();
    const senderName = senderUser?.firstName || 'Your Cinephile Twin';
    const previewText = message.text.length > 80 ? message.text.substring(0, 77) + '...' : message.text;

    await notificationService.createNotification({
      recipient: partnerId,
      sender: userObjId,
      type: 'new_message',
      title: `Message from ${senderName}`,
      body: previewText,
      data: {
        conversationId: convObjId,
        messageId: message._id,
      },
    });
  } catch (notifErr) {
    console.error('Failed to create message notification:', notifErr.message);
  }

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

  try {
    await notificationService.markConversationNotificationsAsRead(userObjId, convObjId);
  } catch (notifErr) {
    console.error('Failed to mark conversation notifications as read:', notifErr.message);
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
