const mongoose = require('mongoose');
const MatchRequest = require('../models/matchRequestModel');
const Conversation = require('../models/conversationModel');
const Block = require('../models/blockModel');
const User = require('../models/userModel');
const notificationService = require('./notificationService');

/**
 * Check if a block relationship exists between two users.
 */
async function findBlockBetween(userAId, userBId) {
  return Block.findOne({
    $or: [
      { blocker: userAId, blocked: userBId },
      { blocker: userBId, blocked: userAId },
    ],
  }).lean();
}

/**
 * Get all user IDs that either blocked or were blocked by the given user.
 */
async function getBlockedPartnerUserIds(userObjId) {
  const blocks = await Block.find({
    $or: [{ blocker: userObjId }, { blocked: userObjId }],
  }).lean();

  return blocks.map((b) =>
    b.blocker.toString() === userObjId.toString() ? b.blocked : b.blocker
  );
}

/**
 * Creates or retrieves an active mutual conversation between two users upon connection acceptance.
 */
async function findOrCreateMutualConversation(userAId, userBId, matchRequestId) {
  return Conversation.findOneAndUpdate(
    {
      $or: [
        { userA: userAId, userB: userBId },
        { userA: userBId, userB: userAId },
      ],
    },
    {
      $setOnInsert: {
        participants: [userAId, userBId],
        matchRequestId,
        isActive: true,
        readState: [
          { user: userAId, lastReadAt: new Date() },
          { user: userBId, lastReadAt: new Date() },
        ],
      },
    },
    { upsert: true, new: true }
  );
}

/**
 * Safely dispatches a connection_accepted notification.
 */
async function sendConnectionAcceptedNotification({
  recipientId,
  senderId,
  conversationId,
  requestId,
  actionLabel = 'connected with you',
}) {
  try {
    const senderUser = await User.findById(senderId).select('firstName').lean();
    await notificationService.createNotification({
      recipient: recipientId,
      sender: senderId,
      type: 'connection_accepted',
      title: 'Connection Request Accepted!',
      body: `${senderUser?.firstName || 'Your Cinephile Twin'} ${actionLabel}. You can now chat!`,
      data: {
        conversationId,
        requestId,
      },
    });
  } catch (notifErr) {
    console.error('Failed to create connection accepted notification:', notifErr.message);
  }
}

/**
 * Safely dispatches a new connection request notification.
 */
async function sendConnectionRequestNotification({ recipientId, senderId, requestId }) {
  try {
    const senderUser = await User.findById(senderId).select('firstName').lean();
    await notificationService.createNotification({
      recipient: recipientId,
      sender: senderId,
      type: 'connection_request',
      title: 'New Cinephile Connection Request',
      body: `${senderUser?.firstName || 'A cinephile'} sent you a connection request.`,
      data: {
        requestId,
      },
    });
  } catch (notifErr) {
    console.error('Failed to create connection request notification:', notifErr.message);
  }
}

/**
 * Send a connect request to a matched user.
 * Implements silent block failure, duplicate prevention, and reciprocal auto-acceptance.
 */
async function sendConnectRequest({ fromUserId, toUserId, matchId, message }) {
  const fromUserObjId = new mongoose.Types.ObjectId(fromUserId);
  const toUserObjId = new mongoose.Types.ObjectId(toUserId);

  // 1. Cannot send connect request to oneself
  if (fromUserObjId.equals(toUserObjId)) {
    const err = new Error('You cannot connect with yourself.');
    err.statusCode = 400;
    throw err;
  }

  // 2. Check if target user exists
  const targetUser = await User.findById(toUserObjId).select('_id firstName').lean();
  if (!targetUser) {
    const err = new Error('Target user not found.');
    err.statusCode = 404;
    throw err;
  }

  // 3. Silent block check: if either user has blocked the other, silently succeed to prevent block discovery
  const isBlocked = await findBlockBetween(fromUserObjId, toUserObjId);
  if (isBlocked) {
    return {
      success: true,
      status: 'pending',
      message: 'Connection request sent successfully.',
    };
  }

  // 4. Reciprocal Check: Check if an incoming pending request from toUser to fromUser already exists
  const reciprocalRequest = await MatchRequest.findOne({
    fromUser: toUserObjId,
    toUser: fromUserObjId,
    status: 'pending',
  });

  if (reciprocalRequest) {
    // Both users have opted in! Mark reciprocal request as accepted
    reciprocalRequest.status = 'accepted';
    reciprocalRequest.respondedAt = new Date();
    await reciprocalRequest.save();

    // Create or retrieve existing Conversation
    const conversation = await findOrCreateMutualConversation(
      fromUserObjId,
      toUserObjId,
      reciprocalRequest._id
    );

    // Notify reciprocal sender that connection is now mutual
    await sendConnectionAcceptedNotification({
      recipientId: toUserObjId,
      senderId: fromUserObjId,
      conversationId: conversation._id,
      requestId: reciprocalRequest._id,
      actionLabel: 'connected with you',
    });

    return {
      success: true,
      status: 'accepted',
      conversationId: conversation._id,
      message: "Mutual connection! You are now connected with your Cinephile Twin.",
    };
  }

  // 5. Check if an existing request from fromUser to toUser already exists
  const existingRequest = await MatchRequest.findOne({
    fromUser: fromUserObjId,
    toUser: toUserObjId,
  });

  if (existingRequest) {
    if (existingRequest.status === 'accepted') {
      const conv = await Conversation.findOne({
        participants: { $all: [fromUserObjId, toUserObjId] },
      }).lean();

      return {
        success: true,
        status: 'accepted',
        conversationId: conv?._id,
        message: 'You are already connected with this user.',
      };
    }

    if (existingRequest.status === 'pending') {
      return {
        success: true,
        status: 'pending',
        requestId: existingRequest._id,
        message: 'Connection request is already pending.',
      };
    }

    // Re-open if previously declined or cancelled
    existingRequest.status = 'pending';
    existingRequest.message = message || null;
    existingRequest.matchId = matchId ? new mongoose.Types.ObjectId(matchId) : existingRequest.matchId;
    existingRequest.respondedAt = null;
    await existingRequest.save();

    await sendConnectionRequestNotification({
      recipientId: toUserObjId,
      senderId: fromUserObjId,
      requestId: existingRequest._id,
    });

    return {
      success: true,
      status: 'pending',
      requestId: existingRequest._id,
      message: 'Connection request sent successfully.',
    };
  }

  // 6. Create new MatchRequest
  const newRequest = await MatchRequest.create({
    fromUser: fromUserObjId,
    toUser: toUserObjId,
    matchId: matchId ? new mongoose.Types.ObjectId(matchId) : null,
    message: message || null,
    status: 'pending',
  });

  await sendConnectionRequestNotification({
    recipientId: toUserObjId,
    senderId: fromUserObjId,
    requestId: newRequest._id,
  });

  return {
    success: true,
    status: 'pending',
    requestId: newRequest._id,
    message: 'Connection request sent successfully.',
  };
}

/**
 * Retrieve pending incoming and outgoing connection requests for the authenticated user,
 * filtering out any blocked users and minimizing sensitive identity data.
 */
async function getPendingRequests(userId) {
  const userObjId = new mongoose.Types.ObjectId(userId);

  // 1. Identify all blocked partners
  const blockedUserIds = await getBlockedPartnerUserIds(userObjId);

  // 2. Fetch incoming pending requests
  const incoming = await MatchRequest.find({
    toUser: userObjId,
    status: 'pending',
    fromUser: { $nin: blockedUserIds },
  })
    .populate('fromUser', 'firstName lastName profilePicture')
    .populate('matchId', 'similarityScore sharedClusters')
    .sort({ createdAt: -1 })
    .lean();

  // 3. Fetch outgoing pending requests
  const outgoing = await MatchRequest.find({
    fromUser: userObjId,
    status: 'pending',
    toUser: { $nin: blockedUserIds },
  })
    .populate('toUser', 'firstName lastName profilePicture')
    .sort({ createdAt: -1 })
    .lean();

  // 4. Format data safely (first name and taste overlap only before mutual consent)
  const formattedIncoming = incoming.map((req) => ({
    requestId: req._id,
    fromUser: {
      userId: req.fromUser?._id,
      firstName: req.fromUser?.firstName || 'Cinephile',
      profilePicture: null, // intentionally hidden until accepted
    },
    message: req.message,
    similarityScore: req.matchId?.similarityScore || null,
    sharedClusters: req.matchId?.sharedClusters || [],
    createdAt: req.createdAt,
  }));

  const formattedOutgoing = outgoing.map((req) => ({
    requestId: req._id,
    toUser: {
      userId: req.toUser?._id,
      firstName: req.toUser?.firstName || 'Cinephile',
    },
    message: req.message,
    createdAt: req.createdAt,
  }));

  return {
    incoming: formattedIncoming,
    outgoing: formattedOutgoing,
  };
}

/**
 * Respond to an incoming connection request (accept or decline).
 * Creates a Conversation upon mutual acceptance.
 */
async function respondToRequest({ userId, requestId, action }) {
  const userObjId = new mongoose.Types.ObjectId(userId);
  const requestObjId = new mongoose.Types.ObjectId(requestId);

  const request = await MatchRequest.findOne({
    _id: requestObjId,
    toUser: userObjId,
    status: 'pending',
  });

  if (!request) {
    const err = new Error('Connection request not found or has already been processed.');
    err.statusCode = 404;
    throw err;
  }

  // Check if either user has blocked the other
  const isBlocked = await findBlockBetween(userObjId, request.fromUser);

  if (isBlocked) {
    request.status = 'declined';
    request.respondedAt = new Date();
    await request.save();
    return {
      success: true,
      status: 'declined',
      message: 'Connection request declined.',
    };
  }

  if (action === 'accept') {
    request.status = 'accepted';
    request.respondedAt = new Date();
    await request.save();

    // Create or find active Conversation
    const conversation = await findOrCreateMutualConversation(
      request.fromUser,
      userObjId,
      request._id
    );

    // Notify requester that connection was accepted
    await sendConnectionAcceptedNotification({
      recipientId: request.fromUser,
      senderId: userObjId,
      conversationId: conversation._id,
      requestId: request._id,
      actionLabel: 'accepted your connection request',
    });

    return {
      success: true,
      status: 'accepted',
      conversationId: conversation._id,
      message: 'Connection request accepted. You can now chat.',
    };
  }

  // Action: decline
  request.status = 'declined';
  request.respondedAt = new Date();
  await request.save();

  return {
    success: true,
    status: 'declined',
    message: 'Connection request declined.',
  };
}

/**
 * Cancel an outgoing pending request.
 */
async function cancelRequest({ userId, requestId }) {
  const userObjId = new mongoose.Types.ObjectId(userId);
  const requestObjId = new mongoose.Types.ObjectId(requestId);

  const request = await MatchRequest.findOne({
    _id: requestObjId,
    fromUser: userObjId,
    status: 'pending',
  });

  if (!request) {
    const err = new Error('Pending request not found.');
    err.statusCode = 404;
    throw err;
  }

  request.status = 'cancelled';
  request.respondedAt = new Date();
  await request.save();

  return {
    success: true,
    status: 'cancelled',
    message: 'Connection request cancelled.',
  };
}

module.exports = {
  sendConnectRequest,
  getPendingRequests,
  respondToRequest,
  cancelRequest,
};
