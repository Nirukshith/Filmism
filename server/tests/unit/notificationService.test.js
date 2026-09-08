const mongoose = require('mongoose');
const notificationService = require('../../services/notificationService');
const Notification = require('../../models/notificationModel');

jest.mock('../../models/notificationModel');

describe('Notification Service Unit Tests', () => {
  const recipientId = new mongoose.Types.ObjectId('507f191e810c19729de860ea');
  const senderId = new mongoose.Types.ObjectId('507f1f77bcf86cd799439011');
  const notificationId = new mongoose.Types.ObjectId();
  const convId = new mongoose.Types.ObjectId();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createNotification', () => {
    it('should successfully create a new notification', async () => {
      const mockCreated = {
        _id: notificationId,
        recipient: recipientId,
        sender: senderId,
        type: 'new_message',
        title: 'New message from Bob',
        body: 'Check out this film!',
        data: { conversationId: convId },
        isRead: false,
      };

      Notification.create.mockResolvedValue(mockCreated);

      const result = await notificationService.createNotification({
        recipient: recipientId,
        sender: senderId,
        type: 'new_message',
        title: 'New message from Bob',
        body: 'Check out this film!',
        data: { conversationId: convId },
      });

      expect(result).toBeDefined();
      expect(result.type).toBe('new_message');
      expect(Notification.create).toHaveBeenCalledWith(
        expect.objectContaining({
          recipient: recipientId,
          sender: senderId,
          type: 'new_message',
          title: 'New message from Bob',
          body: 'Check out this film!',
          isRead: false,
        })
      );
    });

    it('should return null without creating if sender is same as recipient', async () => {
      const result = await notificationService.createNotification({
        recipient: recipientId,
        sender: recipientId,
        type: 'new_message',
        title: 'Self message',
        body: 'Testing',
      });

      expect(result).toBeNull();
      expect(Notification.create).not.toHaveBeenCalled();
    });

    it('should return null if recipient is missing', async () => {
      const result = await notificationService.createNotification({
        recipient: null,
        type: 'system',
        title: 'Alert',
        body: 'Hello',
      });

      expect(result).toBeNull();
      expect(Notification.create).not.toHaveBeenCalled();
    });
  });

  describe('getUserNotifications', () => {
    it('should retrieve paginated user notifications with unread count', async () => {
      const mockList = [
        {
          _id: notificationId,
          type: 'new_message',
          title: 'Message from Bob',
          body: 'Hey!',
          data: { conversationId: convId },
          isRead: false,
          readAt: null,
          createdAt: new Date(),
          sender: {
            _id: senderId,
            firstName: 'Bob',
            profilePicture: '/bob.jpg',
          },
        },
      ];

      Notification.find.mockReturnValue({
        populate: jest.fn().mockReturnValue({
          sort: jest.fn().mockReturnValue({
            skip: jest.fn().mockReturnValue({
              limit: jest.fn().mockReturnValue({
                lean: jest.fn().mockResolvedValue(mockList),
              }),
            }),
          }),
        }),
      });

      Notification.countDocuments
        .mockResolvedValueOnce(1) // total
        .mockResolvedValueOnce(1); // unreadCount

      const result = await notificationService.getUserNotifications(recipientId, {
        page: 1,
        limit: 10,
        unreadOnly: false,
      });

      expect(result.notifications).toHaveLength(1);
      expect(result.notifications[0].title).toBe('Message from Bob');
      expect(result.notifications[0].sender.firstName).toBe('Bob');
      expect(result.unreadCount).toBe(1);
      expect(result.pagination.total).toBe(1);
    });
  });

  describe('getUnreadCount', () => {
    it('should return count of unread notifications', async () => {
      Notification.countDocuments.mockResolvedValue(4);

      const count = await notificationService.getUnreadCount(recipientId);

      expect(count).toBe(4);
      expect(Notification.countDocuments).toHaveBeenCalledWith({
        recipient: recipientId,
        isRead: false,
      });
    });
  });

  describe('markAsRead', () => {
    it('should mark single notification as read', async () => {
      Notification.findOneAndUpdate.mockReturnValue({
        lean: jest.fn().mockResolvedValue({ _id: notificationId, isRead: true }),
      });

      const res = await notificationService.markAsRead(recipientId, notificationId);

      expect(res.success).toBe(true);
      expect(res.notificationId).toEqual(notificationId);
      expect(Notification.findOneAndUpdate).toHaveBeenCalledWith(
        { _id: notificationId, recipient: recipientId },
        expect.objectContaining({ $set: expect.objectContaining({ isRead: true }) }),
        { new: true }
      );
    });

    it('should throw 404 if notification not found or owned by another user', async () => {
      Notification.findOneAndUpdate.mockReturnValue({
        lean: jest.fn().mockResolvedValue(null),
      });

      await expect(
        notificationService.markAsRead(recipientId, notificationId)
      ).rejects.toThrow('Notification not found.');
    });
  });

  describe('markAllAsRead', () => {
    it('should mark all notifications as read for recipient', async () => {
      Notification.updateMany.mockResolvedValue({ modifiedCount: 3 });

      const res = await notificationService.markAllAsRead(recipientId);

      expect(res.success).toBe(true);
      expect(Notification.updateMany).toHaveBeenCalledWith(
        { recipient: recipientId, isRead: false },
        expect.objectContaining({ $set: expect.objectContaining({ isRead: true }) })
      );
    });
  });

  describe('markConversationNotificationsAsRead', () => {
    it('should mark all notifications for a specific conversation as read', async () => {
      Notification.updateMany.mockResolvedValue({ modifiedCount: 2 });

      await notificationService.markConversationNotificationsAsRead(recipientId, convId);

      expect(Notification.updateMany).toHaveBeenCalledWith(
        {
          recipient: recipientId,
          'data.conversationId': convId,
          isRead: false,
        },
        expect.objectContaining({ $set: expect.objectContaining({ isRead: true }) })
      );
    });
  });
});
