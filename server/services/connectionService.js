const mongoose = require('mongoose');
const MatchRequest = require('../models/matchRequestModel');
const Conversation = require('../models/conversationModel');
const Block = require('../models/blockModel');
const User = require('../models/userModel');

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
  const isBlocked = await Block.findOne({
    $or: [
      { blocker: fromUserObjId, blocked: toUserObjId },
      { blocker: toUserObjId, blocked: fromUserObjId },
    ],
  }).lean();

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
    const conversation = await Conversation.findOneAndUpdate(
      {
        $or: [
          { userA: fromUserObjId, userB: toUserObjId },
          { userA: toUserObjId, userB: fromUserObjId },
        ],
      },
      {
        $setOnInsert: {
          participants: [fromUserObjId, toUserObjId],
          matchRequestId: reciprocalRequest._id,
          isActive: true,
          readState: [
            { user: fromUserObjId, lastReadAt: new Date() },
            { user: toUserObjId, lastReadAt: new Date() },
          ],
        },
      },
      { upsert: true, new: true }
    );

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
  const blocks = await Block.find({
    $or: [{ blocker: userObjId }, { blocked: userObjId }],
  }).lean();

  const blockedUserIds = blocks.map((b) =>
    b.blocker.toString() === userObjId.toString() ? b.blocked : b.blocker
  );

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
  const isBlocked = await Block.findOne({
    $or: [
      { blocker: userObjId, blocked: request.fromUser },
      { blocker: request.fromUser, blocked: userObjId },
    ],
  }).lean();

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
    const conversation = await Conversation.findOneAndUpdate(
      {
        $or: [
          { userA: request.fromUser, userB: userObjId },
          { userA: userObjId, userB: request.fromUser },
        ],
      },
      {
        $setOnInsert: {
          participants: [request.fromUser, userObjId],
          matchRequestId: request._id,
          isActive: true,
          readState: [
            { user: request.fromUser, lastReadAt: new Date() },
            { user: userObjId, lastReadAt: new Date() },
          ],
        },
      },
      { upsert: true, new: true }
    );

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
