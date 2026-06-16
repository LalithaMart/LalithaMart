import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { useUIStore } from '../../store/uiStore';
import { useSocketStore } from '../../store/socketStore';
import { MessageSquare, CheckCircle, X } from 'lucide-react';

const Messages = () => {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedMessage, setSelectedMessage] = useState(null);
  const [replyNotes, setReplyNotes] = useState('');
  const { showToast } = useUIStore();
  const { socket } = useSocketStore();

  const fetchMessages = async () => {
    try {
      const { data } = await api.get('/messages');
      setMessages(data);
    } catch (error) {
      showToast('Failed to fetch messages', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMessages();
  }, []);

  useEffect(() => {
    if (socket) {
      const handleNewMessage = () => {
        fetchMessages();
      };
      socket.on('new-message', handleNewMessage);
      return () => {
        socket.off('new-message', handleNewMessage);
      };
    }
  }, [socket]);

  const handleStatusUpdate = async (id, status) => {
    try {
      await api.put(`/messages/${id}/status`, { status, replyNotes });
      showToast(`Message marked as ${status}`, 'success');
      setSelectedMessage(null);
      setReplyNotes('');
      fetchMessages();
    } catch (error) {
      showToast('Failed to update message', 'error');
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this message? This action cannot be undone.')) {
      try {
        await api.delete(`/messages/${id}`);
        showToast('Message deleted successfully', 'success');
        setSelectedMessage(null);
        fetchMessages();
      } catch (error) {
        showToast('Failed to delete message', 'error');
      }
    }
  };

  if (loading) {
    return <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div></div>;
  }

  const unreadCount = messages.filter(m => m.status === 'UNREAD').length;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-white dark:bg-dark-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-dark-700">
        <div>
          <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100">Support Messages</h2>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Manage inquiries from customers and partners.</p>
        </div>
        <div className="bg-primary-50 text-primary-700 px-4 py-2 rounded-lg font-bold flex items-center">
          <MessageSquare size={20} className="mr-2" />
          {unreadCount} Unread
        </div>
      </div>

      <div className="bg-white dark:bg-dark-800 rounded-xl shadow-sm border border-gray-100 dark:border-dark-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 dark:bg-dark-900 text-gray-500 dark:text-gray-400 text-sm border-b border-gray-100 dark:border-dark-700">
                <th className="p-4 font-medium">Sender</th>
                <th className="p-4 font-medium">Subject</th>
                <th className="p-4 font-medium">Date</th>
                <th className="p-4 font-medium">Status</th>
                <th className="p-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {messages.map((message) => (
                <tr key={message._id} className="hover:bg-gray-50 dark:bg-dark-900 transition cursor-pointer" onClick={() => setSelectedMessage(message)}>
                  <td className="p-4">
                    <p className="font-bold text-gray-800 dark:text-gray-100">{message.name}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{message.phone}</p>
                  </td>
                  <td className="p-4">
                    <p className={`text-sm ${message.status === 'UNREAD' ? 'font-bold text-gray-900 dark:text-white' : 'text-gray-600 dark:text-gray-400'}`}>{message.subject}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate max-w-[200px]">{message.message}</p>
                  </td>
                  <td className="p-4 text-sm text-gray-600 dark:text-gray-400">{new Date(message.createdAt).toLocaleString()}</td>
                  <td className="p-4">
                    <span className={`px-2 py-1 text-xs font-bold rounded-full ${
                      message.status === 'RESOLVED' ? 'bg-green-100 text-green-700' :
                      message.status === 'UNREAD' ? 'bg-red-100 text-red-700 dark:text-red-400' :
                      'bg-gray-100 text-gray-700 dark:text-gray-300'
                    }`}>
                      {message.status}
                    </span>
                  </td>
                  <td className="p-4 text-right">
                    <button className="text-primary-600 hover:text-primary-800 text-sm font-medium">View</button>
                  </td>
                </tr>
              ))}
              {messages.length === 0 && (
                <tr>
                  <td colSpan="5" className="p-8 text-center text-gray-500 dark:text-gray-400">
                    No messages found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Message Modal */}
      {selectedMessage && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-dark-800 rounded-xl w-full max-w-2xl shadow-2xl overflow-hidden animate-scale-in">
            <div className="p-6 border-b border-gray-100 dark:border-dark-700 flex justify-between items-center bg-gray-50 dark:bg-dark-900">
              <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100">Message Details</h2>
              <div className="flex items-center space-x-2">
                <button 
                  onClick={() => handleDelete(selectedMessage._id)} 
                  className="px-3 py-1 bg-red-50 dark:bg-red-900/20 text-red-600 rounded-lg text-sm font-bold hover:bg-red-100 transition mr-2"
                >
                  Delete
                </button>
                <button onClick={() => setSelectedMessage(null)} className="text-gray-400 hover:text-gray-600 dark:text-gray-400">
                  <X size={24} />
                </button>
              </div>
            </div>
            
            <div className="p-6 space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">From</p>
                  <p className="font-bold text-gray-900 dark:text-white">{selectedMessage.name}</p>
                  <p className="text-gray-600 dark:text-gray-400">{selectedMessage.phone}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">Date & Time</p>
                  <p className="text-gray-900 dark:text-white">{new Date(selectedMessage.createdAt).toLocaleString()}</p>
                  <div className="mt-1">
                    <span className={`px-2 py-1 text-xs font-bold rounded-full ${
                      selectedMessage.status === 'RESOLVED' ? 'bg-green-100 text-green-700' :
                      selectedMessage.status === 'UNREAD' ? 'bg-red-100 text-red-700 dark:text-red-400' :
                      'bg-gray-100 text-gray-700 dark:text-gray-300'
                    }`}>
                      {selectedMessage.status}
                    </span>
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 dark:bg-dark-900 p-4 rounded-lg border border-gray-100 dark:border-dark-700">
                <p className="font-bold text-gray-900 dark:text-white mb-2">{selectedMessage.subject}</p>
                <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{selectedMessage.message}</p>
              </div>

              {selectedMessage.status === 'RESOLVED' && selectedMessage.replyNotes && (
                <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg border dark:border-dark-600 bg-white dark:bg-dark-900 text-gray-900 dark:text-white border-green-100">
                  <p className="font-bold text-green-900 mb-2 flex items-center"><CheckCircle size={16} className="mr-2"/> Resolution Notes</p>
                  <p className="text-green-800 whitespace-pre-wrap">{selectedMessage.replyNotes}</p>
                </div>
              )}

              {selectedMessage.status !== 'RESOLVED' && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Resolution Notes (Internal/Reply)</label>
                    <textarea 
                      value={replyNotes} 
                      onChange={(e) => setReplyNotes(e.target.value)} 
                      rows="3" 
                      className="w-full px-4 py-2 border border-gray-300 dark:border-dark-600 rounded-lg focus:ring-2 focus:ring-primary-500"
                      placeholder="Add notes before resolving..."
                    ></textarea>
                  </div>
                  <div className="flex space-x-4">
                    {selectedMessage.status === 'UNREAD' && (
                      <button 
                        onClick={() => handleStatusUpdate(selectedMessage._id, 'READ')}
                        className="flex-1 bg-gray-100 text-gray-700 dark:text-gray-300 px-4 py-2 rounded-lg font-bold hover:bg-gray-200"
                      >
                        Mark as Read
                      </button>
                    )}
                    <button 
                      onClick={() => handleStatusUpdate(selectedMessage._id, 'RESOLVED')}
                      className="flex-1 bg-green-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-green-700 flex items-center justify-center"
                    >
                      <CheckCircle size={18} className="mr-2" /> Mark as Resolved
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Messages;
