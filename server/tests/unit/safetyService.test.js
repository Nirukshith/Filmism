const mongoose = require('mongoose');
const safetyService = require('../../services/safetyService');
const Block = require('../../models/blockModel');
const Report = require('../../models/reportModel');
const Conversation = require('../../models/conversationModel');
const MatchRequest = require('../../models/matchRequestModel');
const Message = require('../../models/messageModel');
const User = require('../../models/userModel');
const UserTasteProfile = require('../../models/userTasteProfileModel');

jest.mock('../../models/blockModel');
jest.mock('../../models/reportModel');
jest.mock('../../models/conversationModel');
jest.mock('../../models/matchRequestModel');
jest.mock('../../models/messageModel');
jest.mock('../../models/userModel');
jest.mock('../../models/userTasteProfileModel');
jest.mock('../../utils/sendEmail', () => ({
  sendOtpEmail: jest.fn().mockResolvedValue(true),
  sendBanNotificationEmail: jest.fn().mockResolvedValue(true),
  sendWarningNotificationEmail: jest.fn().mockResolvedValue(true),
}));

describe('Cinephile Pairing V2 - Phase 4 Safety Service Tests', () => {
  const userAId = new mongoose.Types.ObjectId('507f191e810c19729de860ea');
  const userBId = new mongoose.Types.ObjectId('507f1f77bcf86cd799439011');
  const convId = new mongoose.Types.ObjectId();
  const reportId = new mongoose.Types.ObjectId();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('blockUser', () => {
    it('should throw 400 when attempting to block oneself', async () => {
      await expect(
        safetyService.blockUser(userAId, userAId)
      ).rejects.toMatchObject({ statusCode: 400, message: 'You cannot block yourself.' });
    });

    it('should throw 404 if target user does not exist', async () => {
      User.findById.mockReturnValue({
        select: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue(null),
        }),
      });

      await expect(
        safetyService.blockUser(userAId, userBId)
      ).rejects.toMatchObject({ statusCode: 404, message: 'User not found.' });
    });

    it('should upsert block, deactivate conversations, and cancel pending match requests', async () => {
      User.findById.mockReturnValue({
        select: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue({ _id: userBId }),
        }),
      });

      Block.findOneAndUpdate.mockResolvedValue({
        blocker: userAId,
        blocked: userBId,
      });

      Conversation.updateMany.mockResolvedValue({ modifiedCount: 1 });
      MatchRequest.updateMany.mockResolvedValue({ modifiedCount: 1 });

      const result = await safetyService.blockUser(userAId, userBId, 'Inappropriate behavior');

      expect(Block.findOneAndUpdate).toHaveBeenCalled();
      expect(Conversation.updateMany).toHaveBeenCalledWith(
        expect.any(Object),
        { $set: { isActive: false } }
      );
      expect(MatchRequest.updateMany).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({ $set: expect.objectContaining({ status: 'cancelled' }) })
      );
      expect(result.success).toBe(true);
    });
  });

  describe('unblockUser', () => {
    it('should throw 404 if block does not exist', async () => {
      Block.findOneAndDelete.mockResolvedValue(null);

      await expect(
        safetyService.unblockUser(userAId, userBId)
      ).rejects.toMatchObject({ statusCode: 404, message: 'Block record not found.' });
    });

    it('should remove block and reactivate conversation if opposite block does not exist', async () => {
      Block.findOneAndDelete.mockResolvedValue({
        blocker: userAId,
        blocked: userBId,
      });

      Block.findOne.mockReturnValue({
        lean: jest.fn().mockResolvedValue(null),
      });

      Conversation.updateMany.mockResolvedValue({ modifiedCount: 1 });

      const result = await safetyService.unblockUser(userAId, userBId);

      expect(Block.findOneAndDelete).toHaveBeenCalled();
      expect(Conversation.updateMany).toHaveBeenCalledWith(
        expect.any(Object),
        { $set: { isActive: true } }
      );
      expect(result.success).toBe(true);
    });
  });

  describe('reportUser & Evidence Snapshotting', () => {
    it('should throw 400 when attempting to report oneself', async () => {
      await expect(
        safetyService.reportUser(userAId, userAId, { reason: 'harassment' })
      ).rejects.toMatchObject({ statusCode: 400, message: 'You cannot report yourself.' });
    });

    it('should create report with message evidence snapshot when conversationId is provided', async () => {
      User.findById.mockReturnValue({
        select: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue({ _id: userBId }),
        }),
      });

      Conversation.findOne.mockReturnValue({
        lean: jest.fn().mockResolvedValue({
          _id: convId,
          participants: [userAId, userBId],
        }),
      });

      const messageList = [
        { sender: userBId, text: 'Rude message 2', createdAt: new Date() },
        { sender: userBId, text: 'Rude message 1', createdAt: new Date() },
      ];

      Message.find.mockReturnValue({
        sort: jest.fn().mockReturnValue({
          limit: jest.fn().mockReturnValue({
            lean: jest.fn().mockResolvedValue(messageList),
          }),
        }),
      });

      Report.create.mockResolvedValue({
        _id: reportId,
        reporter: userAId,
        reportedUser: userBId,
        status: 'open',
        reason: 'harassment',
      });

      const result = await safetyService.reportUser(userAId, userBId, {
        conversationId: convId.toString(),
        reason: 'harassment',
        details: 'Harassing language',
      });

      expect(Report.create).toHaveBeenCalledWith(
        expect.objectContaining({
          reporter: userAId,
          reportedUser: userBId,
          reason: 'harassment',
          status: 'open',
          contextSnapshot: expect.arrayContaining([
            expect.objectContaining({ text: 'Rude message 1' }),
            expect.objectContaining({ text: 'Rude message 2' }),
          ]),
        })
      );
      expect(result.success).toBe(true);
      expect(result.status).toBe('open');
    });
  });

  describe('Moderation triage (getReports & updateReportStatus)', () => {
    it('should return paginated reports for moderation view', async () => {
      const mockReports = [
        {
          _id: reportId,
          reporter: { firstName: 'Alice', email: 'alice@film.com' },
          reportedUser: { firstName: 'BadActor', email: 'bad@film.com' },
          status: 'open',
          reason: 'spam',
        },
      ];

      Report.find.mockReturnValue({
        populate: jest.fn().mockReturnValue({
          populate: jest.fn().mockReturnValue({
            sort: jest.fn().mockReturnValue({
              skip: jest.fn().mockReturnValue({
                limit: jest.fn().mockReturnValue({
                  lean: jest.fn().mockResolvedValue(mockReports),
                }),
              }),
            }),
          }),
        }),
      });

      Report.countDocuments.mockResolvedValue(1);

      const result = await safetyService.getReports({ status: 'open' });

      expect(result.reports).toHaveLength(1);
      expect(result.pagination.total).toBe(1);
    });

    it('should update report status and admin notes', async () => {
      const updatedReport = {
        _id: reportId,
        status: 'actioned',
        adminNotes: 'Warned user',
        actionTaken: 'warning_issued',
      };

      Report.findByIdAndUpdate.mockReturnValue({
        populate: jest.fn().mockReturnValue({
          populate: jest.fn().mockReturnValue({
            lean: jest.fn().mockResolvedValue(updatedReport),
          }),
        }),
      });

      const result = await safetyService.updateReportStatus(reportId, {
        status: 'actioned',
        adminNotes: 'Warned user',
        actionTaken: 'warning_issued',
      });

      expect(result.success).toBe(true);
      expect(result.report.status).toBe('actioned');
    });
  });

  describe('Admin Moderation Actions: banUser, unbanUser, getAdminStats', () => {
    it('banUser should set isBanned=true, disable matching, deactivate conversations, cancel match requests, and resolve report', async () => {
      const mockUserDoc = {
        _id: userBId,
        firstName: 'Bad',
        lastName: 'Actor',
        email: 'bad@actor.com',
        isBanned: false,
        save: jest.fn().mockResolvedValue(true),
      };

      User.findById.mockResolvedValue(mockUserDoc);
      UserTasteProfile.updateOne.mockResolvedValue({ modifiedCount: 1 });
      Conversation.updateMany.mockResolvedValue({ modifiedCount: 1 });
      MatchRequest.updateMany.mockResolvedValue({ modifiedCount: 1 });

      const mockResolvedReport = {
        _id: reportId,
        status: 'resolved',
        actionTaken: 'user_banned',
      };
      Report.findByIdAndUpdate.mockReturnValue({
        populate: jest.fn().mockReturnValue({
          populate: jest.fn().mockReturnValue({
            lean: jest.fn().mockResolvedValue(mockResolvedReport),
          }),
        }),
      });

      const result = await safetyService.banUser(userAId, userBId, 'Toxic behavior', reportId);

      expect(mockUserDoc.isBanned).toBe(true);
      expect(mockUserDoc.save).toHaveBeenCalled();
      expect(UserTasteProfile.updateOne).toHaveBeenCalledWith(
        { userId: userBId },
        { $set: { matchingEnabled: false } }
      );
      expect(Conversation.updateMany).toHaveBeenCalledWith(
        { participants: userBId },
        { $set: { isActive: false } }
      );
      expect(MatchRequest.updateMany).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({ $set: expect.objectContaining({ status: 'cancelled' }) })
      );
      expect(result.success).toBe(true);
      expect(result.user.isBanned).toBe(true);
    });

    it('unbanUser should set isBanned=false', async () => {
      const mockUserDoc = {
        _id: userBId,
        firstName: 'Good',
        lastName: 'Actor',
        isBanned: true,
        save: jest.fn().mockResolvedValue(true),
      };

      User.findById.mockResolvedValue(mockUserDoc);

      const result = await safetyService.unbanUser(userAId, userBId);

      expect(mockUserDoc.isBanned).toBe(false);
      expect(mockUserDoc.save).toHaveBeenCalled();
      expect(result.success).toBe(true);
      expect(result.user.isBanned).toBe(false);
    });

    it('getAdminStats should aggregate report and user counts', async () => {
      Report.countDocuments
        .mockResolvedValueOnce(10) // total
        .mockResolvedValueOnce(3)  // open
        .mockResolvedValueOnce(2)  // in_review
        .mockResolvedValueOnce(4)  // resolved
        .mockResolvedValueOnce(1); // dismissed

      User.countDocuments
        .mockResolvedValueOnce(2)  // isBanned: true
        .mockResolvedValueOnce(50); // totalUsers

      const stats = await safetyService.getAdminStats();

      expect(stats.totalReports).toBe(10);
      expect(stats.openReports).toBe(3);
      expect(stats.inReviewReports).toBe(2);
      expect(stats.resolvedReports).toBe(4);
      expect(stats.dismissedReports).toBe(1);
      expect(stats.bannedUsersCount).toBe(2);
      expect(stats.totalUsersCount).toBe(50);
    });
  });
});

