const mongoose = require('mongoose');
const MatchRequest = require('../../models/matchRequestModel');
const Conversation = require('../../models/conversationModel');
const Message = require('../../models/messageModel');
const Block = require('../../models/blockModel');
const Report = require('../../models/reportModel');

describe('Cinephile Pairing V2 - Phase 1 Schema & Model Unit Tests', () => {
  describe('MatchRequest Model', () => {
    it('should create a valid MatchRequest with default pending status', () => {
      const fromUser = new mongoose.Types.ObjectId();
      const toUser = new mongoose.Types.ObjectId();

      const request = new MatchRequest({
        fromUser,
        toUser,
        message: 'Loved your noir taste!',
      });

      const err = request.validateSync();
      expect(err).toBeUndefined();
      expect(request.status).toBe('pending');
      expect(request.message).toBe('Loved your noir taste!');
      expect(request.respondedAt).toBeNull();
    });

    it('should fail validation if fromUser or toUser is missing', () => {
      const invalid = new MatchRequest({});
      const err = invalid.validateSync();
      expect(err).toBeDefined();
      expect(err.errors.fromUser).toBeDefined();
      expect(err.errors.toUser).toBeDefined();
    });

    it('should fail validation if status is invalid enum value', () => {
      const invalid = new MatchRequest({
        fromUser: new mongoose.Types.ObjectId(),
        toUser: new mongoose.Types.ObjectId(),
        status: 'unknown_status',
      });
      const err = invalid.validateSync();
      expect(err).toBeDefined();
      expect(err.errors.status).toBeDefined();
    });

    it('should reject message over 200 characters', () => {
      const invalid = new MatchRequest({
        fromUser: new mongoose.Types.ObjectId(),
        toUser: new mongoose.Types.ObjectId(),
        message: 'a'.repeat(201),
      });
      const err = invalid.validateSync();
      expect(err).toBeDefined();
      expect(err.errors.message).toBeDefined();
    });
  });

  describe('Conversation Model', () => {
    it('should automatically assign userA and userB canonically from participants array', () => {
      const id1 = new mongoose.Types.ObjectId('507f1f77bcf86cd799439011');
      const id2 = new mongoose.Types.ObjectId('507f191e810c19729de860ea');

      const conv = new Conversation({
        participants: [id1, id2],
      });

      const err = conv.validateSync();
      expect(err).toBeUndefined();
      // '507f191e810c19729de860ea' < '507f1f77bcf86cd799439011'
      expect(conv.userA.toString()).toBe('507f191e810c19729de860ea');
      expect(conv.userB.toString()).toBe('507f1f77bcf86cd799439011');
      expect(conv.isActive).toBe(true);
    });

    it('should fail validation if participants array does not have exactly 2 elements', () => {
      const conv = new Conversation({
        participants: [new mongoose.Types.ObjectId()],
      });
      const err = conv.validateSync();
      expect(err).toBeDefined();
      expect(err.errors.participants).toBeDefined();
    });

    it('should support subdocuments lastMessage and readState', () => {
      const u1 = new mongoose.Types.ObjectId();
      const u2 = new mongoose.Types.ObjectId();

      const conv = new Conversation({
        participants: [u1, u2],
        lastMessage: {
          text: 'Have you seen Chinatown?',
          sender: u1,
          sentAt: new Date(),
        },
        readState: [
          { user: u1, lastReadAt: new Date() },
          { user: u2, lastReadAt: new Date() },
        ],
      });

      const err = conv.validateSync();
      expect(err).toBeUndefined();
      expect(conv.lastMessage.text).toBe('Have you seen Chinatown?');
      expect(conv.readState).toHaveLength(2);
    });
  });

  describe('Message Model', () => {
    it('should validate a normal message', () => {
      const conversationId = new mongoose.Types.ObjectId();
      const sender = new mongoose.Types.ObjectId();

      const msg = new Message({
        conversationId,
        sender,
        text: 'Hello from Filmism twin!',
      });

      const err = msg.validateSync();
      expect(err).toBeUndefined();
      expect(msg.text).toBe('Hello from Filmism twin!');
    });

    it('should reject message over 1000 characters', () => {
      const msg = new Message({
        conversationId: new mongoose.Types.ObjectId(),
        sender: new mongoose.Types.ObjectId(),
        text: 'x'.repeat(1001),
      });

      const err = msg.validateSync();
      expect(err).toBeDefined();
      expect(err.errors.text).toBeDefined();
    });

    it('should require sender and conversationId', () => {
      const msg = new Message({
        text: 'Lonely message',
      });

      const err = msg.validateSync();
      expect(err).toBeDefined();
      expect(err.errors.sender).toBeDefined();
      expect(err.errors.conversationId).toBeDefined();
    });
  });

  describe('Block Model', () => {
    it('should validate a block record with optional reason', () => {
      const blocker = new mongoose.Types.ObjectId();
      const blocked = new mongoose.Types.ObjectId();

      const block = new Block({
        blocker,
        blocked,
        reason: 'Unwanted messages',
      });

      const err = block.validateSync();
      expect(err).toBeUndefined();
      expect(block.blocker).toEqual(blocker);
      expect(block.blocked).toEqual(blocked);
    });

    it('should fail if blocker or blocked is missing', () => {
      const invalid = new Block({});
      const err = invalid.validateSync();
      expect(err).toBeDefined();
      expect(err.errors.blocker).toBeDefined();
      expect(err.errors.blocked).toBeDefined();
    });
  });

  describe('Report Model', () => {
    it('should validate report with context snapshot and enum reason', () => {
      const reporter = new mongoose.Types.ObjectId();
      const reportedUser = new mongoose.Types.ObjectId();
      const conversationId = new mongoose.Types.ObjectId();

      const report = new Report({
        reporter,
        reportedUser,
        conversationId,
        reason: 'harassment',
        details: 'User sent inappropriate messages',
        contextSnapshot: [
          {
            sender: reportedUser,
            text: 'harassing text content',
            sentAt: new Date(),
          },
        ],
      });

      const err = report.validateSync();
      expect(err).toBeUndefined();
      expect(report.status).toBe('open');
      expect(report.reason).toBe('harassment');
      expect(report.contextSnapshot).toHaveLength(1);
    });

    it('should reject invalid report reason', () => {
      const report = new Report({
        reporter: new mongoose.Types.ObjectId(),
        reportedUser: new mongoose.Types.ObjectId(),
        reason: 'invalid_reason_code',
      });

      const err = report.validateSync();
      expect(err).toBeDefined();
      expect(err.errors.reason).toBeDefined();
    });
  });
});
