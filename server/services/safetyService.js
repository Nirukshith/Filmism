const mongoose = require('mongoose');
const Block = require('../models/blockModel');
const Report = require('../models/reportModel');
const Conversation = require('../models/conversationModel');
const MatchRequest = require('../models/matchRequestModel');
const Message = require('../models/messageModel');
const User = require('../models/userModel');
const { sendBanNotificationEmail, sendWarningNotificationEmail } = require('../utils/sendEmail');

/**
 * Chains standard reporter and reportedUser populates onto a report query.
 */
function populateReportUsers(query) {
  return query
    .populate('reporter', 'firstName lastName email profilePicture')
    .populate('reportedUser', 'firstName lastName email profilePicture isBanned bannedReason bannedAt role');
}

/**
 * Updates isActive status on all conversations matching the query.
 */
async function setConversationActiveStatus(query, isActive) {
  return Conversation.updateMany(query, { $set: { isActive } });
}

/**
 * Cancels all pending match requests matching the query.
 */
async function cancelPendingMatchRequests(query) {
  return MatchRequest.updateMany(query, {
    $set: { status: 'cancelled', respondedAt: new Date() },
  });
}

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
  await setConversationActiveStatus(
    {
      $or: [
        { userA: blockerObjId, userB: blockedObjId },
        { userA: blockedObjId, userB: blockerObjId },
      ],
    },
    false
  );

  // 3. Invalidate any pending connection requests in either direction
  await cancelPendingMatchRequests({
    $or: [
      { fromUser: blockerObjId, toUser: blockedObjId, status: 'pending' },
      { fromUser: blockedObjId, toUser: blockerObjId, status: 'pending' },
    ],
  });

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
    await setConversationActiveStatus(
      {
        $or: [
          { userA: blockerObjId, userB: blockedObjId },
          { userA: blockedObjId, userB: blockerObjId },
        ],
      },
      true
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

const UserTasteProfile = require('../models/userTasteProfileModel');

/**
 * Moderation triage: Retrieve all reports (Admin / Moderator).
 */
async function getReports({ status, page = 1, limit = 20 } = {}) {
  const query = {};
  if (status && status !== 'all') {
    if (status === 'in_review') {
      query.status = { $in: ['in_review', 'reviewed'] };
    } else if (status === 'resolved') {
      query.status = { $in: ['resolved', 'actioned'] };
    } else {
      query.status = status;
    }
  }

  const skip = (page - 1) * limit;

  const [reports, total] = await Promise.all([
    populateReportUsers(Report.find(query))
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

  const updateData = {};
  if (status) updateData.status = status;
  if (adminNotes !== undefined) updateData.adminNotes = adminNotes;
  if (actionTaken !== undefined) updateData.actionTaken = actionTaken;

  const report = await populateReportUsers(
    Report.findByIdAndUpdate(
      reportObjId,
      { $set: updateData },
      { new: true }
    )
  ).lean();

  if (!report) {
    const err = new Error('Report not found.');
    err.statusCode = 404;
    throw err;
  }

  // If a warning was issued to the reported user, dispatch the warning notification email
  if (actionTaken === 'warning_issued' && report.reportedUser?.email) {
    sendWarningNotificationEmail(
      report.reportedUser.email,
      report.reportedUser.firstName,
      report.reason,
      adminNotes
    ).catch((err) => console.error('Failed to send warning notification email:', err));
  }

  return {
    success: true,
    report,
    message: 'Report updated successfully.',
  };
}

/**
 * Moderation Action: Ban a user permanently or until unbanned.
 * 1. Sets isBanned: true on User document.
 * 2. Sets matchingEnabled: false on UserTasteProfile.
 * 3. Deactivates any active Conversation involving the banned user.
 * 4. Cancels any pending MatchRequests.
 * 5. If reportId is provided, updates report status to 'resolved' and actionTaken to 'user_banned'.
 */
async function banUser(adminId, userId, reason = 'Violation of community safety guidelines', reportId = null) {
  const userObjId = new mongoose.Types.ObjectId(userId);

  const user = await User.findById(userObjId);
  if (!user) {
    const err = new Error('User not found.');
    err.statusCode = 404;
    throw err;
  }

  user.isBanned = true;
  user.bannedReason = reason;
  user.bannedAt = new Date();
  await user.save();

  // Send account suspension notice email
  if (user.email) {
    sendBanNotificationEmail(user.email, user.firstName, reason).catch((err) =>
      console.error('Failed to send ban notification email:', err)
    );
  }

  // Deactivate taste profile matching
  await UserTasteProfile.updateOne(
    { userId: userObjId },
    { $set: { matchingEnabled: false } }
  );

  // Deactivate active conversations
  await setConversationActiveStatus({ participants: userObjId }, false);

  // Cancel pending match requests
  await cancelPendingMatchRequests({
    $or: [{ fromUser: userObjId }, { toUser: userObjId }],
    status: 'pending',
  });

  // If a reportId is attached, resolve the report
  let updatedReport = null;
  if (reportId) {
    const reportObjId = new mongoose.Types.ObjectId(reportId);
    updatedReport = await populateReportUsers(
      Report.findByIdAndUpdate(
        reportObjId,
        {
          $set: {
            status: 'resolved',
            actionTaken: 'user_banned',
            adminNotes: `User banned by admin on ${new Date().toISOString()}. Reason: ${reason}`,
          },
        },
        { new: true }
      )
    ).lean();
  }

  return {
    success: true,
    message: `User ${user.firstName} ${user.lastName} has been banned.`,
    user: {
      userId: user._id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      isBanned: true,
      bannedReason: user.bannedReason,
      bannedAt: user.bannedAt,
    },
    report: updatedReport,
  };
}

/**
 * Moderation Action: Unban a previously banned user.
 */
async function unbanUser(adminId, userId) {
  const userObjId = new mongoose.Types.ObjectId(userId);

  const user = await User.findById(userObjId);
  if (!user) {
    const err = new Error('User not found.');
    err.statusCode = 404;
    throw err;
  }

  user.isBanned = false;
  user.bannedReason = null;
  user.bannedAt = null;
  await user.save();

  return {
    success: true,
    message: `User ${user.firstName} ${user.lastName} has been unbanned.`,
    user: {
      userId: user._id,
      isBanned: false,
    },
  };
}

/**
 * Moderation Action: List all currently banned users.
 */
async function getBannedUsers() {
  const users = await User.find({ isBanned: true })
    .select('firstName lastName email profilePicture bannedReason bannedAt createdAt')
    .sort({ bannedAt: -1 })
    .lean();

  return users.map((u) => ({
    _id: u._id,
    userId: u._id,
    firstName: u.firstName,
    lastName: u.lastName,
    email: u.email,
    profilePicture: u.profilePicture || null,
    bannedReason: u.bannedReason || 'Terms of Service violation',
    bannedAt: u.bannedAt,
    joinedAt: u.createdAt,
  }));
}

/**
 * Moderation Dashboard: Get overview statistics.
 */
async function getAdminStats() {
  const [
    totalReports,
    openReports,
    inReviewReports,
    resolvedReports,
    dismissedReports,
    bannedUsersCount,
    totalUsersCount,
  ] = await Promise.all([
    Report.countDocuments(),
    Report.countDocuments({ status: 'open' }),
    Report.countDocuments({ status: { $in: ['in_review', 'reviewed'] } }),
    Report.countDocuments({ status: { $in: ['resolved', 'actioned'] } }),
    Report.countDocuments({ status: 'dismissed' }),
    User.countDocuments({ isBanned: true }),
    User.countDocuments(),
  ]);

  return {
    totalReports,
    openReports,
    inReviewReports,
    resolvedReports,
    dismissedReports,
    bannedUsersCount,
    totalUsersCount,
  };
}

module.exports = {
  blockUser,
  unblockUser,
  getBlockedUsers,
  reportUser,
  getReports,
  updateReportStatus,
  banUser,
  unbanUser,
  getBannedUsers,
  getAdminStats,
};
