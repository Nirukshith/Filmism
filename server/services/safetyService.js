const mongoose = require('mongoose');
const Block = require('../models/blockModel');
const Report = require('../models/reportModel');
const Conversation = require('../models/conversationModel');
const MatchRequest = require('../models/matchRequestModel');
const Message = require('../models/messageModel');
const User = require('../models/userModel');

/**
 * Block a user:
 * 1. Creates/upserts the Block document.
 * 2. Deactivates any active Conversation between the two users.
 * 3. Invalidates/cancels any pending MatchRequests between them.
 */
async function blockUser(blockerId, blockedId, reason = null) {
  const blockerObjId = new mongoose.Types.ObjectId(blockerId);
  const blockedObjId = new mongoose.Types.ObjectId(blockedId);

  if (blockerObjId.equals(blockedObjId)) {
    const err = new Error('You cannot block yourself.');
    err.statusCode = 400;
    throw err;
  }

  const targetUser = await User.findById(blockedObjId).select('_id').lean();
  if (!targetUser) {
    const err = new Error('User not found.');
    err.statusCode = 404;
    throw err;
  }

  // 1. Upsert block record
  await Block.findOneAndUpdate(
    { blocker: blockerObjId, blocked: blockedObjId },
    { blocker: blockerObjId, blocked: blockedObjId, reason },
    { upsert: true, new: true }
  );

  // 2. Deactivate any active conversation between the two users
  await Conversation.updateMany(
    {
      $or: [
        { userA: blockerObjId, userB: blockedObjId },
        { userA: blockedObjId, userB: blockerObjId },
      ],
    },
    { $set: { isActive: false } }
  );

  // 3. Invalidate any pending connection requests in either direction
  await MatchRequest.updateMany(
    {
      $or: [
        { fromUser: blockerObjId, toUser: blockedObjId, status: 'pending' },
        { fromUser: blockedObjId, toUser: blockerObjId, status: 'pending' },
      ],
    },
    { $set: { status: 'cancelled', respondedAt: new Date() } }
  );

  return {
    success: true,
    message: 'User blocked successfully.',
  };
}

/**
 * Unblock a previously blocked user.
 */
async function unblockUser(blockerId, blockedId) {
  const blockerObjId = new mongoose.Types.ObjectId(blockerId);
  const blockedObjId = new mongoose.Types.ObjectId(blockedId);

  const deleted = await Block.findOneAndDelete({
    blocker: blockerObjId,
    blocked: blockedObjId,
  });

  if (!deleted) {
    const err = new Error('Block record not found.');
    err.statusCode = 404;
    throw err;
  }

  // If the other user hasn't blocked this user, reactivate conversation
  const isOppositeBlocked = await Block.findOne({
    blocker: blockedObjId,
    blocked: blockerObjId,
  }).lean();

  if (!isOppositeBlocked) {
    await Conversation.updateMany(
      {
        $or: [
          { userA: blockerObjId, userB: blockedObjId },
          { userA: blockedObjId, userB: blockerObjId },
        ],
      },
      { $set: { isActive: true } }
    );
  }

  return {
    success: true,
    message: 'User unblocked successfully.',
  };
}

/**
 * Retrieve list of users blocked by the current user.
 */
async function getBlockedUsers(blockerId) {
  const blockerObjId = new mongoose.Types.ObjectId(blockerId);

  const blocks = await Block.find({ blocker: blockerObjId })
    .populate('blocked', 'firstName lastName profilePicture')
    .sort({ createdAt: -1 })
    .lean();

  return blocks.map((b) => ({
    blockId: b._id,
    blockedUser: {
      userId: b.blocked?._id,
      firstName: b.blocked?.firstName || 'User',
      profilePicture: b.blocked?.profilePicture || null,
    },
    reason: b.reason,
    blockedAt: b.createdAt,
  }));
}

/**
 * Report a user with evidence context snapshotting:
 * 1. Validates the reporter and reported user.
 * 2. If a conversationId is provided, extracts recent messages to form an immutable evidence snapshot.
 * 3. Creates the Report record with status 'open'.
 */
async function reportUser(reporterId, reportedUserId, { conversationId, reason, details }) {
  const reporterObjId = new mongoose.Types.ObjectId(reporterId);
  const reportedObjId = new mongoose.Types.ObjectId(reportedUserId);

  if (reporterObjId.equals(reportedObjId)) {
    const err = new Error('You cannot report yourself.');
    err.statusCode = 400;
    throw err;
  }

  const targetUser = await User.findById(reportedObjId).select('_id').lean();
  if (!targetUser) {
    const err = new Error('Reported user not found.');
    err.statusCode = 404;
    throw err;
  }

  let contextSnapshot = [];

  // If conversationId is supplied, snapshot the last 10 messages for immutable evidence
  if (conversationId) {
    const convObjId = new mongoose.Types.ObjectId(conversationId);
    const conv = await Conversation.findOne({
      _id: convObjId,
      participants: reporterObjId,
    }).lean();

    if (conv) {
      const recentMessages = await Message.find({ conversationId: convObjId })
        .sort({ createdAt: -1 })
        .limit(10)
        .lean();

      contextSnapshot = recentMessages.reverse().map((m) => ({
        sender: m.sender,
        text: m.text,
        sentAt: m.createdAt,
      }));
    }
  }

  const report = await Report.create({
    reporter: reporterObjId,
    reportedUser: reportedObjId,
    conversationId: conversationId ? new mongoose.Types.ObjectId(conversationId) : null,
    reason,
    details: details?.trim() || null,
    contextSnapshot,
    status: 'open',
  });

  return {
    success: true,
    reportId: report._id,
    status: report.status,
    message: 'Report submitted successfully. Our team will review the details.',
  };
}

/**
 * Moderation triage: Retrieve all reports (Admin / Moderator).
 */
async function getReports({ status, page = 1, limit = 20 } = {}) {
  const query = {};
  if (status) {
    query.status = status;
  }

  const skip = (page - 1) * limit;

  const [reports, total] = await Promise.all([
    Report.find(query)
      .populate('reporter', 'firstName lastName email')
      .populate('reportedUser', 'firstName lastName email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Report.countDocuments(query),
  ]);

  return {
    reports,
    pagination: {
      total,
      page,
      pages: Math.ceil(total / limit) || 1,
    },
  };
}

/**
 * Update report status and moderation notes.
 */
async function updateReportStatus(reportId, { status, adminNotes, actionTaken }) {
  const reportObjId = new mongoose.Types.ObjectId(reportId);

  const updateData = { status };
  if (adminNotes !== undefined) updateData.adminNotes = adminNotes;
  if (actionTaken !== undefined) updateData.actionTaken = actionTaken;

  const report = await Report.findByIdAndUpdate(
    reportObjId,
    { $set: updateData },
    { new: true }
  ).lean();

  if (!report) {
    const err = new Error('Report not found.');
    err.statusCode = 404;
    throw err;
  }

  return {
    success: true,
    report,
    message: 'Report updated successfully.',
  };
}

module.exports = {
  blockUser,
  unblockUser,
  getBlockedUsers,
  reportUser,
  getReports,
  updateReportStatus,
};
