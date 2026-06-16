/**
 * @module MessageModel
 * @description Mongoose schema and model for Message
 */
import mongoose from 'mongoose';

const messageSchema = mongoose.Schema(
  {
    name: { type: String, required: true },
    phone: { type: String, required: true },
    subject: { type: String, required: true },
    message: { type: String, required: true },
    sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    status: { type: String, enum: ['UNREAD', 'READ', 'RESOLVED'], default: 'UNREAD' },
    replyNotes: { type: String }
  },
  { timestamps: true }
);

const Message = mongoose.model('Message', messageSchema);

export default Message;
