import { useState, useEffect } from 'react';
import api from '../../services/api';
import { Plus, CheckCircle, XCircle, Package, X } from 'lucide-react';
import { useUIStore } from '../../store/uiStore';

import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { useSocketStore } from '../../store/socketStore';

const Partners = () => {
  const [partners, setPartners] = useState([]);
  const [allOrders, setAllOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [formData, setFormData] = useState({ name: '', phone: '', password: '' });
  const [searchTerm, setSearchTerm] = useState('');
  
  const [selectedPartner, setSelectedPartner] = useState(null);
  const [partnerDeliveries, setPartnerDeliveries] = useState([]);
  const [loadingDeliveries, setLoadingDeliveries] = useState(false);
  
  const { showToast } = useUIStore();
  const navigate = useNavigate();
  const { user, token, startImpersonating } = useAuthStore();
  const { socket } = useSocketStore();

  const fetchData = async () => {
    try {
      const [usersRes, ordersRes] = await Promise.all([
        api.get('/users?role=delivery'),
        api.get('/orders')
      ]);
      setPartners(usersRes.data);
      setAllOrders(ordersRes.data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (socket) {
      const handlePartnerUpdate = (updatedPartner) => {
        setPartners(prev => prev.map(p => p._id === updatedPartner._id ? updatedPartner : p));
        if (selectedPartner && selectedPartner._id === updatedPartner._id) {
          setSelectedPartner(updatedPartner);
        }
      };
      socket.on('partner-status-updated', handlePartnerUpdate);
      return () => socket.off('partner-status-updated', handlePartnerUpdate);
    }
  }, [socket, selectedPartner]);

  const handleAddPartner = async (e) => {
    e.preventDefault();
    try {
      await api.post('/auth/register', { ...formData, role: 'delivery' });
      setShowForm(false);
      setFormData({ name: '', phone: '', password: '' });
      fetchData();
      showToast('Delivery partner added (Pending Approval)', 'success');
    } catch (error) {
      console.error(error);
      showToast(error.response?.data?.message || 'Failed to add delivery partner', 'error');
    }
  };

  const handleApprovePartner = async (e, id) => {
    e.stopPropagation();
    try {
      await api.put(`/users/${id}/approve`);
      fetchData();
      showToast('Delivery partner approved', 'success');
    } catch (error) {
      showToast('Failed to approve partner', 'error');
    }
  };

  const handlePartnerClick = (partner) => {
    setSelectedPartner(partner);
    setLoadingDeliveries(true);
    const filteredOrders = allOrders.filter(order => order.deliveryPartner?._id === partner._id);
    setPartnerDeliveries(filteredOrders);
    setLoadingDeliveries(false);
  };

  const handleDeletePartner = async (e, id) => {
    e.stopPropagation();
    if (window.confirm('Are you sure you want to delete/reject this delivery partner?')) {
      try {
        await api.delete(`/users/${id}`);
        setPartners(partners.filter(p => p._id !== id));
        showToast('Delivery partner removed', 'success');
      } catch (error) {
        showToast('Failed to remove partner', 'error');
      }
    }
  };

  const handleImpersonate = async () => {
    try {
      const { data } = await api.post(`/auth/impersonate/${selectedPartner._id}`);
      startImpersonating(data, data.token, user, token);
      showToast('Impersonating Delivery Partner', 'success');
      navigate('/delivery');
    } catch (error) {
      console.error(error);
      showToast(error.response?.data?.message || 'Failed to impersonate', 'error');
    }
  };

  const [filterStatus, setFilterStatus] = useState('all');

  const filteredPartners = partners.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()) || p.phone.includes(searchTerm));
  const sortedPartners = [...filteredPartners].sort((a, b) => {
    const idA = a.partnerId || '';
    const idB = b.partnerId || '';
    return idA.localeCompare(idB);
  });
  
  const pendingPartners = sortedPartners.filter(p => !p.isApproved);
  const activePartners = sortedPartners.filter(p => p.isApproved && !p.isSuspended && p.isAvailable && (filterStatus === 'all' || filterStatus === 'active'));
  const inactivePartners = sortedPartners.filter(p => p.isApproved && (p.isSuspended || !p.isAvailable) && (filterStatus === 'all' || filterStatus === 'inactive'));

  return (
    <div className="space-y-6 relative">
      <div className="flex flex-col md:flex-row justify-between md:items-center bg-white dark:bg-dark-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-dark-700 gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100">Delivery Partners</h2>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Manage delivery personnel and requests.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <input
            type="text"
            placeholder="Search partners..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="px-4 py-2 border border-gray-300 dark:border-dark-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none w-full md:w-64"
          />
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-4 py-2 border border-gray-300 dark:border-dark-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none bg-white dark:bg-dark-800"
          >
            <option value="all">All Partners</option>
            <option value="active">Active/Online</option>
            <option value="inactive">Inactive/Offline</option>
          </select>
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition w-full md:w-auto justify-center"
          >
            <Plus size={20} className="mr-2" /> Add Partner
          </button>
        </div>
      </div>

      {pendingPartners.length > 0 && (
        <div>
          <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100 mb-4">Pending Requests</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {pendingPartners.map(partner => (
              <div 
                key={partner._id}
                className="bg-yellow-50 dark:bg-yellow-900/20 border dark:border-dark-600 bg-white dark:bg-dark-900 text-gray-900 dark:text-white border-yellow-200 dark:border-yellow-900/30 rounded-xl p-6 hover:shadow-md transition"
              >
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="font-bold text-lg text-gray-800 dark:text-gray-100">{partner.name}</h3>
                    {partner.partnerId && <p className="text-xs text-gray-400 font-mono mt-0.5">{partner.partnerId}</p>}
                    <p className="text-gray-500 dark:text-gray-400 text-sm">{partner.phone}</p>
                  </div>
                  <span className="bg-yellow-100 text-yellow-800 dark:text-yellow-400 text-xs px-2 py-1 rounded-full font-medium">Pending Approval</span>
                </div>
                
                <div className="flex gap-2 mt-4 pt-4 border-t border-yellow-200 dark:border-yellow-900/30">
                  <button 
                    onClick={(e) => handleApprovePartner(e, partner._id)}
                    className="flex-1 bg-green-600 hover:bg-green-700 text-white py-1.5 rounded-lg text-sm font-medium transition"
                  >
                    Accept
                  </button>
                  <button 
                    onClick={(e) => handleDeletePartner(e, partner._id)}
                    className="flex-1 bg-red-100 hover:bg-red-200 text-red-700 dark:text-red-400 py-1.5 rounded-lg text-sm font-medium transition"
                  >
                    Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {(filterStatus === 'all' || filterStatus === 'active') && (
        <div>
          <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100 mb-4 mt-8">Active Partners</h3>
          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
            </div>
          ) : activePartners.length === 0 ? (
            <div className="bg-white dark:bg-dark-800 rounded-xl shadow-sm border border-gray-100 dark:border-dark-700 p-12 text-center">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">No active delivery partners</h3>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {activePartners.map((partner) => {
                const completedDeliveries = allOrders.filter(o => o.deliveryPartner?._id === partner._id && o.status === 'Completed').length;
                return (
                <div 
                  key={partner._id} 
                  className="bg-white dark:bg-dark-800 rounded-xl shadow-sm border border-gray-100 dark:border-dark-700 overflow-hidden cursor-pointer hover:border-primary-300 transition"
                  onClick={() => handlePartnerClick(partner)}
                >
                  <div className="p-6">
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex items-center space-x-3 min-w-0 flex-1 mr-2">
                        <div className="h-10 w-10 shrink-0 rounded-full bg-green-100 text-green-600 flex items-center justify-center font-bold">
                          {partner.name.charAt(0)}
                        </div>
                        <div className="min-w-0 flex-1">
                          <h3 className="font-bold text-gray-800 dark:text-gray-100 truncate">{partner.name}</h3>
                          {partner.partnerId && <p className="text-xs text-gray-400 font-mono mt-0.5">{partner.partnerId}</p>}
                          <p className="text-sm text-gray-500 dark:text-gray-400 truncate">{partner.phone}</p>
                        </div>
                      </div>
                      {partner.isAvailable ? (
                        <span className="flex items-center text-xs font-medium text-green-600 bg-green-50 dark:bg-green-900/20 px-2 py-1 rounded-full">
                          <CheckCircle size={14} className="mr-1" /> Online
                        </span>
                      ) : (
                        <span className="flex items-center text-xs font-medium text-gray-600 dark:text-gray-400 bg-gray-100 px-2 py-1 rounded-full">
                          <XCircle size={14} className="mr-1" /> Offline
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap justify-between items-center text-sm border-t border-gray-100 dark:border-dark-700 pt-4 mt-2 gap-2">
                      <span className="text-gray-500 dark:text-gray-400">Deliveries: <span className="font-bold text-gray-800 dark:text-gray-100">{completedDeliveries}</span></span>
                      <div className="flex flex-wrap gap-2">
                        <button 
                          onClick={async (e) => {
                            e.stopPropagation();
                            try {
                              await api.put(`/users/${partner._id}`, { isSuspended: true });
                              fetchData();
                              showToast('Partner suspended', 'success');
                            } catch (error) {
                              showToast('Failed to suspend', 'error');
                            }
                          }}
                          className="px-3 py-1 rounded-full text-xs font-bold whitespace-nowrap inline-block bg-gray-100 text-gray-700 dark:text-gray-300 hover:bg-red-50 dark:bg-red-900/20 hover:text-red-700 dark:text-red-400"
                        >
                          Suspend
                        </button>
                        <button onClick={(e) => handleDeletePartner(e, partner._id)} className="px-3 py-1 rounded-full text-xs font-bold whitespace-nowrap inline-block bg-red-50 dark:bg-red-900/20 text-red-600 hover:bg-red-100">Delete</button>
                      </div>
                    </div>
                  </div>
                </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {(filterStatus === 'all' || filterStatus === 'inactive') && (
        <div className="mt-8">
          <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100 mb-4">Inactive / Offline Partners</h3>
          {inactivePartners.length === 0 ? (
            <p className="text-gray-500 dark:text-gray-400 text-sm">No inactive or offline partners found.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {inactivePartners.map((partner) => {
              const completedDeliveries = allOrders.filter(o => o.deliveryPartner?._id === partner._id && o.status === 'Completed').length;
              return (
              <div 
                key={partner._id} 
                className="bg-red-50 dark:bg-red-900/20 rounded-xl shadow-sm border dark:border-dark-600 bg-white dark:bg-dark-900 text-gray-900 dark:text-white border-red-200 dark:border-red-900/30 overflow-hidden cursor-pointer hover:border-red-300 transition"
                onClick={() => handlePartnerClick(partner)}
              >
                <div className="p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center space-x-3 min-w-0 flex-1 mr-2">
                      <div className="h-10 w-10 shrink-0 rounded-full bg-red-200 text-red-700 dark:text-red-400 flex items-center justify-center font-bold">
                        {partner.name.charAt(0)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="font-bold text-gray-800 dark:text-gray-100 truncate">{partner.name}</h3>
                        {partner.partnerId && <p className="text-xs text-gray-400 font-mono mt-0.5">{partner.partnerId}</p>}
                        <p className={`text-sm font-medium truncate ${partner.isSuspended ? 'text-red-500' : 'text-gray-500 dark:text-gray-400'}`}>
                          {partner.isSuspended ? 'Suspended' : 'Offline'}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-wrap justify-between items-center text-sm border-t border-red-200 dark:border-red-900/30 pt-4 mt-2 gap-2">
                    <span className="text-gray-500 dark:text-gray-400">Deliveries: <span className="font-bold text-gray-800 dark:text-gray-100">{completedDeliveries}</span></span>
                    <div className="flex flex-wrap gap-2">
                      {partner.isSuspended && (
                        <button 
                          onClick={async (e) => {
                            e.stopPropagation();
                            try {
                              await api.put(`/users/${partner._id}`, { isSuspended: false });
                              fetchData();
                              showToast('Partner reactivated', 'success');
                            } catch (error) {
                              showToast('Failed to reactivate', 'error');
                            }
                          }}
                          className="px-3 py-1 rounded-full text-xs font-bold whitespace-nowrap inline-block bg-green-100 text-green-700 hover:bg-green-200"
                        >
                          Reactivate
                        </button>
                      )}
                      <button onClick={(e) => handleDeletePartner(e, partner._id)} className="px-3 py-1 rounded-full text-xs font-bold whitespace-nowrap inline-block bg-red-100 text-red-600 hover:bg-red-200">Delete</button>
                    </div>
                  </div>
                </div>
              </div>
              );
            })}
          </div>
        )}
      </div>
      )}

      {/* Partner Details Modal */}
      {selectedPartner && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-end">
          <div className="bg-white dark:bg-dark-800 w-full max-w-md h-full shadow-2xl animate-slide-in overflow-y-auto">
            <div className="p-6 border-b border-gray-100 dark:border-dark-700 flex justify-between items-center sticky top-0 bg-white dark:bg-dark-800 z-10">
              <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100">Partner Details</h2>
              <button onClick={() => setSelectedPartner(null)} className="text-gray-400 hover:text-gray-600 dark:text-gray-400">
                <X size={24} />
              </button>
            </div>
            
            <div className="p-6">
              <div className="mb-6">
                <button 
                  onClick={handleImpersonate}
                  className="w-full bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 font-bold py-3 rounded-xl hover:bg-orange-200 dark:hover:bg-orange-900/50 transition border border-orange-200 dark:border-orange-900/50"
                >
                  View Dashboard as Partner
                </button>
              </div>
              <div className="flex items-center space-x-4 mb-6">
                <div className="h-16 w-16 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center text-3xl font-bold">
                  {selectedPartner.name.charAt(0)}
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-gray-800 dark:text-gray-100">{selectedPartner.name}</h3>
                  <p className="text-sm font-bold text-primary-600 mb-1">ID: {selectedPartner.partnerId || 'Pending'}</p>
                  <p className="text-gray-500 dark:text-gray-400 text-sm mb-1">{selectedPartner.phone}</p>
                  <p className="text-gray-500 dark:text-gray-400 text-sm mb-1">{selectedPartner.email || 'No email provided'}</p>
                  {selectedPartner.verifiedId?.idNumber ? (
                    <p className="text-green-600 font-bold text-xs">
                      {selectedPartner.verifiedId.idType}: {selectedPartner.verifiedId.idNumber}
                    </p>
                  ) : (
                    <p className="text-yellow-600 font-bold text-xs">ID Not Verified</p>
                  )}
                  <p className="text-sm font-bold text-primary-600 mt-2">Total Deliveries: {partnerDeliveries.filter(o => o.status === 'Completed').length}</p>
                </div>
              </div>

              <div className="mb-6 bg-gray-50 dark:bg-dark-900 p-4 rounded-xl border border-gray-200 dark:border-dark-700">
                <h4 className="font-bold text-sm text-gray-700 dark:text-gray-300 mb-2 uppercase tracking-wide">Edit Details</h4>
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Phone</label>
                    <input 
                      type="text" 
                      pattern="\d{10}"
                      maxLength="10"
                      className="w-full px-3 py-2 border dark:border-dark-600 bg-white dark:bg-dark-900 text-gray-900 dark:text-white rounded-lg text-sm"
                      value={selectedPartner.phone}
                      onChange={(e) => setSelectedPartner({...selectedPartner, phone: e.target.value.replace(/\D/g, '')})}
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Email</label>
                    <input 
                      type="email" 
                      className="w-full px-3 py-2 border dark:border-dark-600 bg-white dark:bg-dark-900 text-gray-900 dark:text-white rounded-lg text-sm"
                      value={selectedPartner.email || ''}
                      onChange={(e) => setSelectedPartner({...selectedPartner, email: e.target.value})}
                    />
                  </div>
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">ID Type</label>
                      <select 
                        className="w-full px-3 py-2 border dark:border-dark-600 bg-white dark:bg-dark-900 text-gray-900 dark:text-white rounded-lg text-sm bg-white dark:bg-dark-800"
                        value={selectedPartner.verifiedId?.idType || ''}
                        onChange={(e) => setSelectedPartner({...selectedPartner, verifiedId: { ...selectedPartner.verifiedId, idType: e.target.value }})}
                      >
                        <option value="">Select ID</option>
                        <option value="Aadhaar">Aadhaar</option>
                        <option value="PAN">PAN</option>
                      </select>
                    </div>
                    <div className="flex-[2]">
                      <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">ID Number</label>
                      <input 
                        type="text" 
                        className="w-full px-3 py-2 border dark:border-dark-600 bg-white dark:bg-dark-900 text-gray-900 dark:text-white rounded-lg text-sm"
                        value={selectedPartner.verifiedId?.idNumber || ''}
                        onChange={(e) => setSelectedPartner({...selectedPartner, verifiedId: { ...selectedPartner.verifiedId, idNumber: e.target.value }})}
                      />
                    </div>
                  </div>
                  <button 
                    onClick={async () => {
                      try {
                        const { data } = await api.put(`/users/${selectedPartner._id}`, { 
                          phone: selectedPartner.phone,
                          email: selectedPartner.email,
                          verifiedId: selectedPartner.verifiedId
                        });
                        setPartners(partners.map(p => p._id === data._id ? {...p, ...data} : p));
                        showToast('Partner details updated', 'success');
                      } catch (error) {
                        showToast('Failed to update details', 'error');
                      }
                    }}
                    className="w-full bg-primary-600 text-white font-bold py-2 rounded-lg text-sm hover:bg-primary-700 mt-2"
                  >
                    Save Changes
                  </button>
                </div>
              </div>
              <div>
                <h4 className="font-bold text-gray-800 dark:text-gray-100 mb-3 flex items-center">
                  <Package size={18} className="mr-2 text-primary-600" /> Delivery History
                </h4>
                {loadingDeliveries ? (
                  <p className="text-sm text-gray-500 dark:text-gray-400">Loading deliveries...</p>
                ) : partnerDeliveries.length === 0 ? (
                  <p className="text-sm text-gray-500 dark:text-gray-400">No deliveries found for this partner.</p>
                ) : (
                  <div className="space-y-4">
                    {partnerDeliveries.map(order => (
                      <div key={order._id} className="border border-gray-100 dark:border-dark-700 rounded-xl p-4 shadow-sm space-y-3">
                        <div className="flex justify-between items-center border-b pb-2">
                          <div>
                            <p className="text-sm font-bold text-gray-800 dark:text-gray-100">{order.orderId || `Order #${order._id.substring(18)}`}</p>
                            <span className="text-xs text-gray-500 dark:text-gray-400">{new Date(order.createdAt).toLocaleString()}</span>
                          </div>
                          <span className={`px-2 py-1 text-xs font-bold rounded-full ${
                            order.status === 'Completed' || order.status === 'Delivered' ? 'bg-green-100 text-green-700' :
                            order.status === 'Cancelled' ? 'bg-red-100 text-red-700 dark:text-red-400' :
                            'bg-blue-100 text-blue-700'
                          }`}>
                            {order.status}
                          </span>
                        </div>
                        
                        <div>
                          <p className="text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">Items:</p>
                          <ul className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
                            {order.orderItems.map((item, i) => (
                              <li key={i} className="flex justify-between">
                                <span>{item.name} (x{item.quantity})</span>
                                <span>₹{item.price * item.quantity}</span>
                              </li>
                            ))}
                          </ul>
                          <div className="flex justify-between items-center mt-2 pt-2 border-t font-bold text-sm text-gray-800 dark:text-gray-100">
                            <span>Total</span>
                            <span>₹{order.totalAmount}</span>
                          </div>
                        </div>

                        {order.deliveryAddress && (
                          <div className="bg-gray-50 dark:bg-dark-900 p-2 rounded text-xs mt-2">
                            <p className="font-bold text-gray-700 dark:text-gray-300">Delivered To:</p>
                            <p className="text-gray-600 dark:text-gray-400">{order.customer?.name} ({order.customer?.phone})</p>
                            <p className="text-gray-600 dark:text-gray-400">{order.deliveryAddress.street}, {order.deliveryAddress.city}, {order.deliveryAddress.state} {order.deliveryAddress.postalCode}</p>
                            {order.updatedAt && (order.status === 'Completed' || order.status === 'Delivered') && (
                              <p className="text-gray-500 dark:text-gray-400 mt-1">Delivered: {new Date(order.updatedAt).toLocaleString()}</p>
                            )}
                          </div>
                        )}

                        {order.modificationLogs && order.modificationLogs.length > 0 && (
                          <div className="bg-blue-50 p-2 rounded text-xs mt-2">
                            <p className="font-bold text-blue-800 mb-1">Modifications:</p>
                            <ul className="space-y-1 text-blue-700">
                              {order.modificationLogs.map((log, idx) => (
                                <li key={idx}>
                                  <span className="font-semibold">{new Date(log.timestamp).toLocaleString()}</span> - {log.reason}
                                  {log.previousSnapshot && log.newSnapshot && (
                                    <span className="block text-blue-600 mt-1">
                                      ↳ Total changed from ₹{log.previousSnapshot.totalAmount} to ₹{log.newSnapshot.totalAmount}
                                    </span>
                                  )}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Partners;
