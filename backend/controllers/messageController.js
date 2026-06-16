import Message from '../models/Message.js';
import { getIO } from '../config/socket.js';

/**
 * @desc    Create a message
 * @route   POST /api/messages
 * @access  Public (or semi-private if user logged in)
 */
export const createMessage = async (req, res) => {
  const { name, phone, subject, message } = req.body;

  const newMessage = await Message.create({
    name,
    phone,
    subject,
    message,
    sender: req.user ? req.user._id : undefined
  });

  try {
    getIO().to('admin-room').emit('new-message', newMessage);
  } catch (e) {}

  res.status(201).json(newMessage);
};

/**
 * @desc    Get all messages
 * @route   GET /api/messages
 * @access  Private/Admin
 */
export const getMessages = async (req, res) => {
  const messages = await Message.find().sort({ createdAt: -1 });
  res.json(messages);
};

/**
 * @desc    Update message status
 * @route   PUT /api/messages/:id/status
 * @access  Private/Admin
 */
export const updateMessageStatus = async (req, res) => {
  const { status, replyNotes } = req.body;
  const message = await Message.findById(req.params.id);

  if (message) {
    message.status = status;
    if (replyNotes) message.replyNotes = replyNotes;
    const updatedMessage = await message.save();
    res.json(updatedMessage);
  } else {
    res.status(404);
    throw new Error('Message not found');
  }
};

/**
 * @desc    Delete message
 * @route   DELETE /api/messages/:id
 * @access  Private/Admin
 */
export const deleteMessage = async (req, res) => {
  const message = await Message.findById(req.params.id);

  if (message) {
    await Message.deleteOne({ _id: message._id });
    res.json({ message: 'Message removed' });
  } else {
    res.status(404);
    throw new Error('Message not found');
  }
};
