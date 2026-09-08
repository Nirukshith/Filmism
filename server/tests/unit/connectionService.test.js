const mongoose = require('mongoose');
const connectionService = require('../../services/connectionService');
const MatchRequest = require('../../models/matchRequestModel');
const Conversation = require('../../models/conversationModel');
const Block = require('../../models/blockModel');
const User = require('../../models/userModel');

// Mock Mongoose models
jest.mock('../../models/matchRequestModel');
jest.mock('../../models/conversationModel');
jest.mock('../../models/blockModel');
jest.mock('../../models/userModel');

describe('Cinephile Pairing V2 - Phase 2 Connection Service Tests', () => {
  const userAId = new mongoose.Types.ObjectId('507f191e810c19729de860ea');
  const userBId = new mongoose.Types.ObjectId('507f1f77bcf86cd799439011');
  const matchId = new mongoose.Types.ObjectId();
  const requestId = new mongoose.Types.ObjectId();
  const conversationId = new mongoose.Types.ObjectId();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('sendConnectRequest', () => {
    it('should throw 400 when attempting to connect with oneself', async () => {
      await expect(
        connectionService.sendConnectRequest({
          fromUserId: userAId,
          toUserId: userAId,
        })
      ).rejects.toMatchObject({ statusCode: 400, message: 'You cannot connect with yourself.' });
    });

    it('should throw 404 if target user does not exist', async () => {
      User.findById.mockReturnValue({
        select: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue(null),
        }),
      });

      await expect(
        connectionService.sendConnectRequest({
          fromUserId: userAId,
          toUserId: userBId,
        })
      ).rejects.toMatchObject({ statusCode: 404, message: 'Target user not found.' });
    });

    it('should silently succeed without creating a request if either user is blocked', async () => {
      User.findById.mockReturnValue({
        select: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue({ _id: userBId, firstName: 'Bob' }),
        }),
      });

      Block.findOne.mockReturnValue({
        lean: jest.fn().mockResolvedValue({ blocker: userBId, blocked: userAId }),
      });

      const result = await connectionService.sendConnectRequest({
        fromUserId: userAId,
        toUserId: userBId,
      });

      expect(result.success).toBe(true);
      expect(result.status).toBe('pending');
      expect(MatchRequest.create).not.toHaveBeenCalled();
    });

    it('should automatically accept and create a conversation if a reciprocal pending request exists', async () => {
      User.findById.mockReturnValue({
        select: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue({ _id: userBId, firstName: 'Bob' }),
        }),
      });
      Block.findOne.mockReturnValue({
        lean: jest.fn().mockResolvedValue(null),
      });

      const mockReciprocal = {
        _id: requestId,
        fromUser: userBId,
        toUser: userAId,
        status: 'pending',
        save: jest.fn().mockResolvedValue(true),
      };
      MatchRequest.findOne.mockResolvedValue(mockReciprocal);

      Conversation.findOneAndUpdate.mockResolvedValue({
        _id: conversationId,
        participants: [userBId, userAId],
        isActive: true,
      });

      const result = await connectionService.sendConnectRequest({
        fromUserId: userAId,
        toUserId: userBId,
      });

      expect(mockReciprocal.status).toBe('accepted');
      expect(mockReciprocal.save).toHaveBeenCalled();
      expect(Conversation.findOneAndUpdate).toHaveBeenCalled();
      expect(result.success).toBe(true);
      expect(result.status).toBe('accepted');
      expect(result.conversationId).toEqual(conversationId);
    });

    it('should create a new MatchRequest when no prior requests exist', async () => {
      User.findById.mockReturnValue({
        select: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue({ _id: userBId, firstName: 'Bob' }),
        }),
      });
      Block.findOne.mockReturnValue({
        lean: jest.fn().mockResolvedValue(null),
      });

      // Reciprocal check: none
      // Existing request check: none
      MatchRequest.findOne
        .mockResolvedValueOnce(null) // reciprocal check
        .mockResolvedValueOnce(null); // existing check

      MatchRequest.create.mockResolvedValue({
        _id: requestId,
        fromUser: userAId,
        toUser: userBId,
        status: 'pending',
        message: 'Hello fellow cinephile!',
      });

      const result = await connectionService.sendConnectRequest({
        fromUserId: userAId,
        toUserId: userBId,
        matchId: matchId.toString(),
        message: 'Hello fellow cinephile!',
      });

      expect(MatchRequest.create).toHaveBeenCalledWith(
        expect.objectContaining({
          fromUser: userAId,
          toUser: userBId,
          message: 'Hello fellow cinephile!',
          status: 'pending',
        })
      );
      expect(result.success).toBe(true);
      expect(result.status).toBe('pending');
      expect(result.requestId).toEqual(requestId);
    });
  });

  describe('getPendingRequests', () => {
    it('should return sanitized incoming and outgoing requests and filter out blocked users', async () => {
      const blockedUserId = new mongoose.Types.ObjectId();
      Block.find.mockReturnValue({
        lean: jest.fn().mockResolvedValue([
          { blocker: userAId, blocked: blockedUserId },
        ]),
      });

      const mockIncoming = [
        {
          _id: requestId,
          fromUser: { _id: userBId, firstName: 'Bob', email: 'bob@private.com' },
          matchId: { similarityScore: 92, sharedClusters: [] },
          message: 'Nice taste!',
          createdAt: new Date(),
        },
      ];

      const mockOutgoing = [
        {
          _id: new mongoose.Types.ObjectId(),
          toUser: { _id: userBId, firstName: 'Bob' },
          message: 'Hey!',
          createdAt: new Date(),
        },
      ];

      MatchRequest.find
        .mockReturnValueOnce({
          populate: jest.fn().mockReturnValue({
            populate: jest.fn().mockReturnValue({
              sort: jest.fn().mockReturnValue({
                lean: jest.fn().mockResolvedValue(mockIncoming),
              }),
            }),
          }),
        })
        .mockReturnValueOnce({
          populate: jest.fn().mockReturnValue({
            sort: jest.fn().mockReturnValue({
              lean: jest.fn().mockResolvedValue(mockOutgoing),
            }),
          }),
        });

      const result = await connectionService.getPendingRequests(userAId);

      expect(result.incoming).toHaveLength(1);
      expect(result.incoming[0].fromUser.firstName).toBe('Bob');
      expect(result.incoming[0].fromUser.email).toBeUndefined(); // Email NEVER leaked
      expect(result.incoming[0].similarityScore).toBe(92);
      expect(result.outgoing).toHaveLength(1);
    });
  });

  describe('respondToRequest', () => {
    it('should throw 404 if pending request not found', async () => {
      MatchRequest.findOne.mockResolvedValue(null);

      await expect(
        connectionService.respondToRequest({
          userId: userBId,
          requestId,
          action: 'accept',
        })
      ).rejects.toMatchObject({
        statusCode: 404,
        message: 'Connection request not found or has already been processed.',
      });
    });

    it('should accept request and create conversation', async () => {
      const mockRequest = {
        _id: requestId,
        fromUser: userAId,
        toUser: userBId,
        status: 'pending',
        save: jest.fn().mockResolvedValue(true),
      };
      MatchRequest.findOne.mockResolvedValue(mockRequest);
      Block.findOne.mockReturnValue({
        lean: jest.fn().mockResolvedValue(null),
      });

      Conversation.findOneAndUpdate.mockResolvedValue({
        _id: conversationId,
        participants: [userAId, userBId],
        isActive: true,
      });

      const result = await connectionService.respondToRequest({
        userId: userBId,
        requestId,
        action: 'accept',
      });

      expect(mockRequest.status).toBe('accepted');
      expect(mockRequest.save).toHaveBeenCalled();
      expect(Conversation.findOneAndUpdate).toHaveBeenCalled();
      expect(result.success).toBe(true);
      expect(result.status).toBe('accepted');
      expect(result.conversationId).toEqual(conversationId);
    });

    it('should decline request without creating conversation', async () => {
      const mockRequest = {
        _id: requestId,
        fromUser: userAId,
        toUser: userBId,
        status: 'pending',
        save: jest.fn().mockResolvedValue(true),
      };
      MatchRequest.findOne.mockResolvedValue(mockRequest);
      Block.findOne.mockReturnValue({
        lean: jest.fn().mockResolvedValue(null),
      });

      const result = await connectionService.respondToRequest({
        userId: userBId,
        requestId,
        action: 'decline',
      });

      expect(mockRequest.status).toBe('declined');
      expect(mockRequest.save).toHaveBeenCalled();
      expect(Conversation.findOneAndUpdate).not.toHaveBeenCalled();
      expect(result.success).toBe(true);
      expect(result.status).toBe('declined');
    });
  });

  describe('cancelRequest', () => {
    it('should cancel an active outgoing request', async () => {
      const mockRequest = {
        _id: requestId,
        fromUser: userAId,
        toUser: userBId,
        status: 'pending',
        save: jest.fn().mockResolvedValue(true),
      };
      MatchRequest.findOne.mockResolvedValue(mockRequest);

      const result = await connectionService.cancelRequest({
        userId: userAId,
        requestId,
      });

      expect(mockRequest.status).toBe('cancelled');
      expect(mockRequest.save).toHaveBeenCalled();
      expect(result.success).toBe(true);
      expect(result.status).toBe('cancelled');
    });
  });
});
