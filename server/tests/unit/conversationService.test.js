const mongoose = require('mongoose');
const conversationService = require('../../services/conversationService');
const Conversation = require('../../models/conversationModel');
const Message = require('../../models/messageModel');
const Block = require('../../models/blockModel');
const User = require('../../models/userModel');
const notificationService = require('../../services/notificationService');

jest.mock('../../models/conversationModel');
jest.mock('../../models/messageModel');
jest.mock('../../models/blockModel');
jest.mock('../../models/userModel');
jest.mock('../../services/notificationService');

describe('Cinephile Pairing V2 - Phase 3 Conversation & Messaging Service Tests', () => {
  const userAId = new mongoose.Types.ObjectId('507f191e810c19729de860ea');
  const userBId = new mongoose.Types.ObjectId('507f1f77bcf86cd799439011');
  const outsiderId = new mongoose.Types.ObjectId('507f191e810c19729de860ff');
  const convId = new mongoose.Types.ObjectId();

  beforeEach(() => {
    jest.clearAllMocks();
    User.findById.mockReturnValue({
      select: jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue({ _id: userAId, firstName: 'Alice' }),
      }),
    });
    notificationService.createNotification.mockResolvedValue({});
    notificationService.markConversationNotificationsAsRead.mockResolvedValue({});
  });

  describe('getUserConversations', () => {
    it('should retrieve conversations with partner data and compute hasUnread correctly', async () => {
      Block.find.mockReturnValue({
        lean: jest.fn().mockResolvedValue([]),
      });

      const lastSentDate = new Date('2026-09-08T12:00:00Z');
      const lastReadDate = new Date('2026-09-08T11:00:00Z');

      const mockConversations = [
        {
          _id: convId,
          participants: [
            { _id: userAId, firstName: 'Alice' },
            { _id: userBId, firstName: 'Bob', profilePicture: '/avatar.jpg' },
          ],
          lastMessage: {
            text: 'Seen any good films?',
            sender: userBId,
            sentAt: lastSentDate,
          },
          lastMessageAt: lastSentDate,
          readState: [{ user: userAId, lastReadAt: lastReadDate }],
          isActive: true,
          createdAt: new Date(),
        },
      ];

      Conversation.find.mockReturnValue({
        populate: jest.fn().mockReturnValue({
          sort: jest.fn().mockReturnValue({
            lean: jest.fn().mockResolvedValue(mockConversations),
          }),
        }),
      });

      const result = await conversationService.getUserConversations(userAId);

      expect(result).toHaveLength(1);
      expect(result[0].partner.firstName).toBe('Bob');
      expect(result[0].partner.userId).toEqual(userBId);
      expect(result[0].hasUnread).toBe(true);
      expect(result[0].isBlocked).toBe(false);
      expect(result[0].canMessage).toBe(true);
      expect(result[0].lastMessage.text).toBe('Seen any good films?');
    });

    it('should still return conversation in list when user has blocked the partner', async () => {
      Block.find.mockReturnValue({
        lean: jest.fn().mockResolvedValue([
          { blocker: userAId, blocked: userBId },
        ]),
      });

      const mockConversations = [
        {
          _id: convId,
          participants: [
            { _id: userAId, firstName: 'Alice' },
            { _id: userBId, firstName: 'Bob', profilePicture: '/avatar.jpg' },
          ],
          lastMessage: {
            text: 'Hello',
            sender: userBId,
            sentAt: new Date(),
          },
          lastMessageAt: new Date(),
          readState: [],
          isActive: false,
          createdAt: new Date(),
        },
      ];

      Conversation.find.mockReturnValue({
        populate: jest.fn().mockReturnValue({
          sort: jest.fn().mockReturnValue({
            lean: jest.fn().mockResolvedValue(mockConversations),
          }),
        }),
      });

      const result = await conversationService.getUserConversations(userAId);

      expect(result).toHaveLength(1);
      expect(result[0].partner.userId).toEqual(userBId);
      expect(result[0].isBlocked).toBe(true);
      expect(result[0].isBlockedByMe).toBe(true);
      expect(result[0].canMessage).toBe(false);
    });
  });

  describe('getConversationMessages & IDOR Safeguards', () => {
    it('should THROW 403 when a non-participant attempts to access messages (IDOR Protection)', async () => {
      Conversation.findById.mockReturnValue({
        populate: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue({
            _id: convId,
            participants: [{ _id: userAId }, { _id: userBId }],
          }),
        }),
      });

      await expect(
        conversationService.getConversationMessages(outsiderId, convId)
      ).rejects.toMatchObject({
        statusCode: 403,
        message: 'You do not have access to this conversation.',
      });
    });

    it('should THROW 404 if conversation does not exist', async () => {
      Conversation.findById.mockReturnValue({
        populate: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue(null),
        }),
      });

      await expect(
        conversationService.getConversationMessages(userAId, convId)
      ).rejects.toMatchObject({
        statusCode: 404,
        message: 'Conversation not found.',
      });
    });

    it('should return isBlocked: true and canMessage: false when blocked', async () => {
      Conversation.findById.mockReturnValue({
        populate: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue({
            _id: convId,
            participants: [
              { _id: userAId, firstName: 'Alice' },
              { _id: userBId, firstName: 'Bob' },
            ],
          }),
        }),
      });

      Block.findOne.mockReturnValue({
        lean: jest.fn().mockResolvedValue({ blocker: userBId, blocked: userAId }),
      });

      Message.find.mockReturnValue({
        sort: jest.fn().mockReturnValue({
          limit: jest.fn().mockReturnValue({
            lean: jest.fn().mockResolvedValue([]),
          }),
        }),
      });

      const result = await conversationService.getConversationMessages(userAId, convId);

      expect(result.isBlocked).toBe(true);
      expect(result.isBlockedByPartner).toBe(true);
      expect(result.canMessage).toBe(false);
    });

    it('should support cursor-based polling with since or after params', async () => {
      Conversation.findById.mockReturnValue({
        populate: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue({
            _id: convId,
            participants: [
              { _id: userAId, firstName: 'Alice' },
              { _id: userBId, firstName: 'Bob' },
            ],
          }),
        }),
      });

      Block.findOne.mockReturnValue({
        lean: jest.fn().mockResolvedValue(null),
      });

      const messageId = new mongoose.Types.ObjectId();
      const mockMessages = [
        {
          _id: messageId,
          conversationId: convId,
          sender: userBId,
          text: 'New poll message',
          createdAt: new Date(),
        },
      ];

      Message.find.mockReturnValue({
        sort: jest.fn().mockReturnValue({
          limit: jest.fn().mockReturnValue({
            lean: jest.fn().mockResolvedValue(mockMessages),
          }),
        }),
      });

      const result = await conversationService.getConversationMessages(userAId, convId, {
        after: new mongoose.Types.ObjectId().toString(),
      });

      expect(result.isBlocked).toBe(false);
      expect(result.messages).toHaveLength(1);
      expect(result.messages[0].text).toBe('New poll message');
    });
  });

  describe('sendMessage & Security Checks', () => {
    it('should THROW 403 when non-participant attempts to send a message (IDOR Protection)', async () => {
      Conversation.findById.mockResolvedValue({
        _id: convId,
        participants: [userAId, userBId],
      });

      await expect(
        conversationService.sendMessage(outsiderId, convId, 'Malicious injection')
      ).rejects.toMatchObject({
        statusCode: 403,
        message: 'You do not have access to send messages to this conversation.',
      });
    });

    it('should THROW 403 with unblock instruction if sender has blocked recipient', async () => {
      Conversation.findById.mockResolvedValue({
        _id: convId,
        participants: [userAId, userBId],
      });

      Block.findOne.mockReturnValue({
        lean: jest.fn().mockResolvedValue({ blocker: userAId, blocked: userBId }),
      });

      await expect(
        conversationService.sendMessage(userAId, convId, 'Trying to message blocked user')
      ).rejects.toMatchObject({
        statusCode: 403,
        message: 'You have blocked this user. Please unblock them to send a message.',
      });
    });

    it('should THROW 403 if sender is blocked by recipient', async () => {
      Conversation.findById.mockResolvedValue({
        _id: convId,
        participants: [userAId, userBId],
      });

      Block.findOne.mockReturnValue({
        lean: jest.fn().mockResolvedValue({ blocker: userBId, blocked: userAId }),
      });

      await expect(
        conversationService.sendMessage(userAId, convId, 'Blocked attempt')
      ).rejects.toMatchObject({
        statusCode: 403,
        message: 'Cannot send message to this conversation.',
      });
    });

    it('should create message, update conversation lastMessage and readState', async () => {
      const mockConv = {
        _id: convId,
        participants: [userAId, userBId],
        readState: [{ user: userAId, lastReadAt: new Date(0) }],
        archivedBy: [userBId],
        save: jest.fn().mockResolvedValue(true),
      };
      Conversation.findById.mockResolvedValue(mockConv);

      Block.findOne.mockReturnValue({
        lean: jest.fn().mockResolvedValue(null),
      });

      const messageDate = new Date();
      const newMsg = {
        _id: new mongoose.Types.ObjectId(),
        conversationId: convId,
        sender: userAId,
        text: 'Let us watch Stalker',
        createdAt: messageDate,
      };
      Message.create.mockResolvedValue(newMsg);

      const result = await conversationService.sendMessage(
        userAId,
        convId,
        '  Let us watch Stalker  '
      );

      expect(Message.create).toHaveBeenCalledWith(
        expect.objectContaining({
          text: 'Let us watch Stalker',
          sender: userAId,
        })
      );
      expect(mockConv.lastMessage.text).toBe('Let us watch Stalker');
      expect(mockConv.lastMessageAt).toEqual(messageDate);
      expect(mockConv.save).toHaveBeenCalled();
      expect(result.text).toBe('Let us watch Stalker');
    });
  });

  describe('markConversationRead & toggleArchiveConversation', () => {
    it('should mark conversation as read', async () => {
      Conversation.updateOne.mockResolvedValue({ matchedCount: 1 });

      const result = await conversationService.markConversationRead(userAId, convId);
      expect(result.success).toBe(true);
      expect(Conversation.updateOne).toHaveBeenCalled();
    });

    it('should toggle archive state for conversation', async () => {
      Conversation.findOneAndUpdate.mockResolvedValue({
        _id: convId,
        archivedBy: [userAId],
      });

      const result = await conversationService.toggleArchiveConversation(
        userAId,
        convId,
        true
      );
      expect(result.success).toBe(true);
      expect(result.isArchived).toBe(true);
    });
  });
});
