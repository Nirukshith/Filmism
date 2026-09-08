const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema(
  {
    conversationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Conversation',
      required: [true, 'conversationId is required'],
      index: true,
    },
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'sender is required'],
      index: true,
    },
    text: {
      type: String,
      required: [true, 'Message text is required'],
      trim: true,
      maxlength: [1000, 'Message cannot exceed 1000 characters'],
    },
    readBy: {
      type: [
        {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
        },
      ],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

// Optimize cursor-based and since-timestamp polling within a conversation
messageSchema.index({ conversationId: 1, createdAt: 1 });
messageSchema.index({ conversationId: 1, _id: 1 });

const Message = mongoose.model('Message', messageSchema);

module.exports = Message;
