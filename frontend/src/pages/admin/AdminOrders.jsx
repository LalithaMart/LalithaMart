import React, { useState, useEffect, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { useUIStore } from '../../store/uiStore';
import { useSocketStore } from '../../store/socketStore';
import { useAuthStore } from '../../store/authStore';
import { Search, ChevronLeft, ChevronRight, ShoppingBag, Eye, UserPlus, X, Truck, MapPin, Phone, CheckCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { fadeUp, staggerContainer } from '../../animations/variants';

const AdminOrders = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { showToast } = useUIStore();
  const { socket } = useSocketStore();
  const { user: adminUser, token, startImpersonating } = useAuthStore();

  const [orders, setOrders] = useState([]);
  const [counts, setCounts] = useState({ All: 0, Pending: 0, Assigned: 0, 'Out for Delivery': 0, Completed: 0, Cancelled: 0 });
  const [loading, setLoading] = useState(true);

  // Filters
  const [activeTab, setActiveTab] = useState('All');
  const [search, setSearch] = useState('');
  const [dateFilter, setDateFilter] = useState('All Time');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [sortBy, setSortBy] = useState('date');
  const [sortOrder, setSortOrder] = useState('desc');

  // Pagination
  const [page, setPage] = useState(1);
  const [totalPages, setPages] = useState(1);
  const limit = 10;

  // View / Assign Modal
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [partners, setPartners] = useState([]);
  const [assigning, setAssigning] = useState(false);

  // If we came from a notification, we might want to open a specific order
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const orderIdToOpen = params.get('open');
    if (orderIdToOpen) {
      fetchOrderDetails(orderIdToOpen);
    }
  }, [location.search]);

  const fetchOrderDetails = async (id) => {
    try {
      const { data } = await api.get(`/orders/${id}`);
      setSelectedOrder(data);
      fetchPartners();
    } catch (error) {
      showToast('Failed to load order details', 'error');
    }
  };

  const fetchPartners = async () => {
    try {
      const { data } = await api.get('/users?role=delivery');
      setPartners(data);
    } catch (error) {
      console.error('Failed to load partners', error);
    }
  };

  const handleCloseModal = () => {
    setSelectedOrder(null);
    if (location.search.includes('open=')) {
      navigate('/admin/orders', { replace: true });
    }
  };

  const fetchCounts = useCallback(async () => {
    try {
      let query = '/orders/counts?';
      if (search) query += `search=${search}&`;
      
      if (dateFilter !== 'All Time') {
        const now = new Date();
        if (dateFilter === 'Today') {
          query += `startDate=${now.toISOString()}&endDate=${now.toISOString()}&`;
        } else if (dateFilter === 'Last 7 Days') {
          const last7 = new Date(now);
          last7.setDate(last7.getDate() - 7);
          query += `startDate=${last7.toISOString()}&endDate=${now.toISOString()}&`;
        } else if (dateFilter === 'This Month') {
          const startMonth = new Date(now.getFullYear(), now.getMonth(), 1);
          query += `startDate=${startMonth.toISOString()}&endDate=${now.toISOString()}&`;
        } else if (dateFilter === 'Custom Range') {
          if (fromDate) query += `startDate=${new Date(fromDate).toISOString()}&`;
          if (toDate) query += `endDate=${new Date(toDate).toISOString()}&`;
        }
      }

      const { data } = await api.get(query);
      setCounts(data);
    } catch (error) {
      console.error('Counts fetch error', error);
    }
  }, [search, dateFilter, fromDate, toDate]);

  /**
   * Fetches the orders from the server based on the current filters.
   * Supports pagination, searching, status filtering, and custom date range filtering.
   * 
   * @param {number} page - Current page number
   * @param {string} activeTab - The current status filter (e.g. 'Pending')
   * @param {string} search - Search keyword
   * @param {string} dateFilter - Option selected for date filtering
   */
  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      let query = `/orders?page=${page}&limit=${limit}&sortBy=${sortBy}&sortOrder=${sortOrder}`;
      if (activeTab !== 'All') query += `&status=${activeTab}`;
      if (search) query += `&search=${search}`;
      
      if (dateFilter !== 'All Time') {
        const now = new Date();
        if (dateFilter === 'Today') {
          query += `&startDate=${now.toISOString()}&endDate=${now.toISOString()}`;
        } else if (dateFilter === 'Last 7 Days') {
          const last7 = new Date(now);
          last7.setDate(last7.getDate() - 7);
          query += `&startDate=${last7.toISOString()}&endDate=${now.toISOString()}`;
        } else if (dateFilter === 'This Month') {
          const startMonth = new Date(now.getFullYear(), now.getMonth(), 1);
          query += `&startDate=${startMonth.toISOString()}&endDate=${now.toISOString()}`;
        } else if (dateFilter === 'Custom Range') {
          if (fromDate) query += `&startDate=${new Date(fromDate).toISOString()}`;
          if (toDate) query += `&endDate=${new Date(toDate).toISOString()}`;
        }
      }

      const { data } = await api.get(query);
      setOrders(data.orders);
      setPages(data.pages);
      fetchCounts();
    } catch (error) {
      console.error(error);
      showToast('Failed to load orders', 'error');
    } finally {
      setLoading(false);
    }
  }, [page, activeTab, search, sortBy, sortOrder, dateFilter, fromDate, toDate, fetchCounts]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  // Socket IO real-time updates
  useEffect(() => {
    if (socket) {
      const handleNewOrder = (order) => {
        showToast(`New order received: ${order.orderId}`, 'success');
        fetchOrders();
      };
      
      const handleOrderUpdate = () => {
        fetchOrders();
        // If the modal is open for this order, refresh its details
        if (selectedOrder) {
          fetchOrderDetails(selectedOrder._id);
        }
      };

      const handlePartnerUpdate = (updatedPartner) => {
        setPartners(prev => prev.map(p => p._id === updatedPartner._id ? updatedPartner : p));
      };

      socket.on('new-order', handleNewOrder);
      socket.on('order-updated', handleOrderUpdate);
      socket.on('order-assigned', handleOrderUpdate);
      socket.on('order-modified', handleOrderUpdate);
      socket.on('order-cancelled', handleOrderUpdate);
      socket.on('partner-status-updated', handlePartnerUpdate);

      return () => {
        socket.off('new-order', handleNewOrder);
        socket.off('order-updated', handleOrderUpdate);
        socket.off('order-assigned', handleOrderUpdate);
        socket.off('order-modified', handleOrderUpdate);
        socket.off('order-cancelled', handleOrderUpdate);
        socket.off('partner-status-updated', handlePartnerUpdate);
      };
    }
  }, [socket, fetchOrders, selectedOrder]);

  const handleStatusChange = async (orderId, newStatus) => {
    try {
      await api.put(`/orders/${orderId}/status`, { status: newStatus });
      showToast('Order status updated', 'success');
      fetchOrders();
      if (selectedOrder && selectedOrder._id === orderId) {
        fetchOrderDetails(orderId);
      }
    } catch (error) {
      showToast('Failed to update status', 'error');
    }
  };

  const handleAssignPartner = async (partnerId) => {
    if (!selectedOrder) return;
    setAssigning(true);
    try {
      await api.put(`/orders/${selectedOrder._id}/assign`, { partnerId });
      showToast('Delivery partner assigned successfully', 'success');
      fetchOrderDetails(selectedOrder._id);
      fetchOrders();
    } catch (error) {
      showToast(error.response?.data?.message || 'Failed to assign partner', 'error');
    } finally {
      setAssigning(false);
    }
  };

  const handleImpersonate = async (targetUserId, targetRole) => {
    try {
      const { data } = await api.post(`/auth/impersonate/${targetUserId}`);
      startImpersonating(data, data.token, adminUser, token);
      showToast(`Impersonating ${targetRole}`, 'success');
      if (targetRole === 'customer') navigate('/');
      else navigate('/delivery');
    } catch (error) {
      console.error(error);
      showToast(error.response?.data?.message || 'Failed to impersonate', 'error');
    }
  };

  const tabs = ['All', 'Pending', 'Assigned', 'Out for Delivery', 'Completed', 'Cancelled'];

  const getStatusColor = (status) => {
    switch (status) {
      case 'Pending': return 'bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-400 dark:border-yellow-800/50';
      case 'Completed': 
      case 'Delivered': return 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800/50';
      case 'Cancelled': return 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800/50';
      case 'Assigned': 
      case 'Packed':
      case 'Out for Delivery': return 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800/50';
      default: return 'bg-gray-100 text-gray-800 border-gray-200 dark:bg-dark-700 dark:text-gray-300 dark:border-dark-600';
    }
  };

  const isOrderAssigned = selectedOrder && ['Out for Delivery', 'Delivered', 'Completed'].includes(selectedOrder.status);

  return (
    <motion.div 
      initial="initial"
      animate="animate"
      variants={staggerContainer}
      className="space-y-6 pb-12"
    >
      <motion.div variants={fadeUp} className="glass dark:bg-dark-800 p-6 sm:p-8 rounded-3xl shadow-sm border border-gray-100 dark:border-dark-700 flex flex-col md:flex-row justify-between md:items-center gap-4 transition-colors">
        <div>
          <h1 className="text-3xl font-black text-gray-900 dark:text-white flex items-center tracking-tight">
            <div className="w-12 h-12 bg-primary-100 dark:bg-primary-900/30 rounded-2xl flex items-center justify-center mr-4 text-primary-600 dark:text-primary-400">
              <ShoppingBag size={24} />
            </div>
            Order Management
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-2 font-medium">View, track, and manage all customer orders in real-time</p>
        </div>
      </motion.div>

      <motion.div variants={fadeUp} className="glass dark:bg-dark-800 rounded-3xl shadow-sm border border-gray-100 dark:border-dark-700 overflow-hidden transition-colors">
        {/* Filters Header */}
        <div className="p-5 md:p-6 border-b border-gray-100 dark:border-dark-700 flex flex-col xl:flex-row gap-6 justify-between bg-gray-50/50 dark:bg-dark-900/50">
          {/* Tabs */}
          <div className="flex overflow-x-auto custom-scrollbar space-x-2 pb-2 xl:pb-0 p-1 bg-gray-100/50 dark:bg-dark-800/50 rounded-2xl">
            {tabs.map(tab => (
              <button
                key={tab}
                onClick={() => { setActiveTab(tab); setPage(1); }}
                className={`relative px-4 py-2 rounded-xl font-bold whitespace-nowrap transition-colors flex items-center space-x-2 z-10
                  ${activeTab === tab ? 'text-primary-700 dark:text-primary-400' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}`}
              >
                {activeTab === tab && (
                  <motion.div 
                    layoutId="activeTabOrder"
                    className="absolute inset-0 bg-white dark:bg-dark-700 rounded-xl shadow-sm border border-gray-200/50 dark:border-dark-600/50 z-[-1]"
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  />
                )}
                <span className="relative z-10">{tab}</span>
                <span className={`relative z-10 px-2 py-0.5 rounded-full text-xs font-black shadow-sm transition-colors ${activeTab === tab ? 'bg-primary-100 text-primary-700 dark:bg-primary-900/50 dark:text-primary-400' : 'bg-gray-200 dark:bg-dark-600 text-gray-600 dark:text-gray-300'}`}>
                  {counts[tab] || 0}
                </span>
              </button>
            ))}
          </div>

          {/* Search & Sort */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
              <input 
                type="text" 
                placeholder="Search orders..." 
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-11 pr-4 py-3 bg-white dark:bg-dark-800 border-2 border-gray-200 dark:border-dark-600 rounded-xl text-sm font-bold w-full sm:w-64 focus:ring-4 focus:ring-primary-500/20 focus:border-primary-500 text-gray-900 dark:text-white transition-all outline-none"
              />
            </div>

            <select 
              value={dateFilter}
              onChange={(e) => { setDateFilter(e.target.value); setPage(1); }}
              className="px-4 py-3 bg-white dark:bg-dark-800 border-2 border-gray-200 dark:border-dark-600 rounded-xl text-sm font-bold focus:ring-4 focus:ring-primary-500/20 focus:border-primary-500 text-gray-900 dark:text-white transition-all outline-none cursor-pointer"
            >
              <option>All Time</option>
              <option>Today</option>
              <option>Last 7 Days</option>
              <option>Last 30 Days</option>
              <option>This Month</option>
              <option>Custom Range</option>
            </select>

            {dateFilter === 'Custom Range' && (
              <div className="flex space-x-2">
                <input 
                  type="date" 
                  max={new Date().toISOString().split('T')[0]}
                  value={fromDate}
                  onChange={(e) => { 
                    const newDate = e.target.value;
                    if (toDate && newDate > toDate) {
                      showToast('From Date cannot be later than To Date', 'error');
                      return;
                    }
                    setFromDate(newDate); 
                    setPage(1); 
                  }}
                  className="px-4 py-3 bg-white dark:bg-dark-800 border-2 border-gray-200 dark:border-dark-600 rounded-xl text-sm font-bold focus:ring-4 focus:ring-primary-500/20 focus:border-primary-500 text-gray-900 dark:text-white transition-all outline-none"
                />
                <input 
                  type="date" 
                  max={new Date().toISOString().split('T')[0]}
                  min={fromDate || undefined}
                  value={toDate}
                  onChange={(e) => { 
                    const newDate = e.target.value;
                    if (fromDate && newDate < fromDate) {
                      showToast('To Date cannot be earlier than From Date', 'error');
                      return;
                    }
                    setToDate(newDate); 
                    setPage(1); 
                  }}
                  className="px-4 py-3 bg-white dark:bg-dark-800 border-2 border-gray-200 dark:border-dark-600 rounded-xl text-sm font-bold focus:ring-4 focus:ring-primary-500/20 focus:border-primary-500 text-gray-900 dark:text-white transition-all outline-none"
                />
              </div>
            )}

            <select 
              value={sortBy}
              onChange={(e) => { setSortBy(e.target.value); setPage(1); }}
              className="px-4 py-3 bg-white dark:bg-dark-800 border-2 border-gray-200 dark:border-dark-600 rounded-xl text-sm font-bold focus:ring-4 focus:ring-primary-500/20 focus:border-primary-500 text-gray-900 dark:text-white transition-all outline-none cursor-pointer"
            >
              <option value="date">Date (Latest)</option>
              <option value="value">Amount (High to Low)</option>
            </select>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          {loading ? (
             <div className="flex justify-center items-center min-h-[400px]">
               <div className="animate-spin w-10 h-10 border-4 border-primary-500 border-t-transparent rounded-full shadow-md"></div>
             </div>
          ) : orders.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-16 text-center">
               <div className="w-20 h-20 bg-gray-50 dark:bg-dark-900 rounded-full flex items-center justify-center mb-4 shadow-inner">
                 <ShoppingBag size={32} className="text-gray-300 dark:text-gray-600" />
               </div>
               <h3 className="text-xl font-bold text-gray-800 dark:text-gray-200">No orders found</h3>
               <p className="text-gray-500 dark:text-gray-400 mt-2 font-medium">Try adjusting your filters or search criteria.</p>
            </div>
          ) : (
            <table className="w-full text-left border-collapse whitespace-nowrap">
              <thead className="bg-gray-50/80 dark:bg-dark-900/80 text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wider font-bold border-b border-gray-100 dark:border-dark-700">
                <tr>
                  <th className="p-5">Order Info</th>
                  <th className="p-5">Customer</th>
                  <th className="p-5">Date</th>
                  <th className="p-5">Amount</th>
                  <th className="p-5">Status</th>
                  <th className="p-5">Partner</th>
                  <th className="p-5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-dark-700">
                {orders.map((order) => (
                  <tr key={order._id} className="hover:bg-gray-50 dark:hover:bg-dark-700/50 transition cursor-pointer group" onClick={() => fetchOrderDetails(order._id)}>
                    <td className="p-5">
                      <div className="font-black text-gray-900 dark:text-white">{order.orderId || `#${order._id.substring(18)}`}</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 font-medium mt-1">{order.orderItems?.length || 0} items</div>
                    </td>
                    <td className="p-5">
                      <div className="font-bold text-gray-800 dark:text-gray-200">{order.customer?.name}</div>
                      <div className="text-gray-500 dark:text-gray-400 text-xs font-medium mt-1 flex items-center">
                        <Phone size={10} className="mr-1" /> {order.customer?.phone}
                      </div>
                    </td>
                    <td className="p-5 text-sm font-medium text-gray-600 dark:text-gray-400">
                      <div>{new Date(order.createdAt).toLocaleDateString()}</div>
                      <div className="text-xs mt-0.5">{new Date(order.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div>
                    </td>
                    <td className="p-5">
                      <div className="font-black text-gray-900 dark:text-white">₹{order.totalAmount}</div>
                      <span className="inline-block mt-1 px-2 py-0.5 bg-gray-100 dark:bg-dark-700 text-gray-600 dark:text-gray-300 text-[10px] font-bold rounded uppercase tracking-wider">{order.paymentMethod}</span>
                    </td>
                    <td className="p-5 text-sm" onClick={(e) => e.stopPropagation()}>
                      <select 
                        value={order.status}
                        onChange={(e) => handleStatusChange(order._id, e.target.value)}
                        className={`text-xs font-black rounded-xl px-3 py-1.5 border focus:ring-2 outline-none cursor-pointer ${getStatusColor(order.status)}`}
                        disabled={['Out for Delivery', 'Delivered', 'Completed'].includes(order.status)}
                      >
                        <option value="Pending">Pending</option>
                        <option value="Assigned">Assigned</option>
                        <option value="Packed">Packed</option>
                        <option value="Out for Delivery">Out for Delivery</option>
                        <option value="Delivered">Delivered</option>
                        <option value="Completed">Completed</option>
                        <option value="Cancelled">Cancelled</option>
                      </select>
                    </td>
                    <td className="p-5 text-sm text-gray-600 dark:text-gray-400">
                      {order.deliveryPartner ? (
                        <div>
                          <div className="font-bold text-gray-800 dark:text-gray-200">{order.deliveryPartner.name}</div>
                          <div className="text-xs font-medium mt-1">{order.deliveryPartner.phone}</div>
                        </div>
                      ) : (
                        <span className="inline-block px-2 py-1 bg-gray-100 dark:bg-dark-700 text-gray-500 dark:text-gray-400 text-xs font-bold rounded-lg uppercase">Unassigned</span>
                      )}
                    </td>
                    <td className="p-5 text-right">
                      <button 
                        onClick={(e) => { e.stopPropagation(); fetchOrderDetails(order._id); }}
                        className="p-2 bg-white dark:bg-dark-800 border-2 border-gray-200 dark:border-dark-600 rounded-xl text-primary-600 dark:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/30 hover:border-primary-200 dark:hover:border-primary-800/50 transition-all opacity-0 group-hover:opacity-100 shadow-sm"
                        title="View Details"
                      >
                        <Eye size={18} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination */}
        {!loading && orders.length > 0 && (
          <div className="p-5 border-t border-gray-100 dark:border-dark-700 flex flex-col sm:flex-row items-center justify-between gap-4 bg-gray-50/50 dark:bg-dark-900/50">
            <div className="text-sm font-medium text-gray-500 dark:text-gray-400">
              Showing page <span className="font-black text-gray-900 dark:text-white">{page}</span> of <span className="font-black text-gray-900 dark:text-white">{totalPages}</span>
            </div>
            <div className="flex space-x-2">
              <button 
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-2 border-2 border-gray-200 dark:border-dark-600 rounded-xl text-gray-600 dark:text-gray-300 hover:bg-white dark:hover:bg-dark-800 disabled:opacity-50 disabled:cursor-not-allowed transition bg-transparent"
              >
                <ChevronLeft size={20} />
              </button>
              <button 
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="p-2 border-2 border-gray-200 dark:border-dark-600 rounded-xl text-gray-600 dark:text-gray-300 hover:bg-white dark:hover:bg-dark-800 disabled:opacity-50 disabled:cursor-not-allowed transition bg-transparent"
              >
                <ChevronRight size={20} />
              </button>
            </div>
          </div>
        )}
      </motion.div>

      {/* View / Assign Order Modal */}
      <AnimatePresence>
        {selectedOrder && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[70] flex justify-end"
            onClick={handleCloseModal}
          >
            <motion.div 
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="w-full max-w-lg bg-white dark:bg-dark-800 h-full shadow-2xl flex flex-col border-l border-gray-100 dark:border-dark-700"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="p-6 border-b border-gray-100 dark:border-dark-700 flex justify-between items-center bg-gray-50 dark:bg-dark-900">
                <div>
                  <h2 className="text-2xl font-black text-gray-900 dark:text-white">Order Details & Assignment</h2>
                  <p className="text-sm font-bold text-gray-500 dark:text-gray-400 mt-1">{selectedOrder.orderId || `#${selectedOrder._id.substring(18)}`}</p>
                </div>
                <button 
                  onClick={handleCloseModal}
                  className="p-2 bg-gray-200 dark:bg-dark-700 text-gray-600 dark:text-gray-300 rounded-full hover:bg-gray-300 dark:hover:bg-dark-600 transition"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Body */}
              <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">
                
                {/* Status & Assignment */}
                <div className="space-y-4">
                  <h3 className="text-xs font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest border-b border-gray-100 dark:border-dark-700 pb-2">Status & Assignment</h3>
                  
                  <div className="flex flex-col bg-gray-50 dark:bg-dark-900 p-4 rounded-2xl border border-gray-100 dark:border-dark-700 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-gray-700 dark:text-gray-300">Current Status</span>
                      <span className={`px-3 py-1 text-xs font-black uppercase tracking-wider rounded-xl border ${getStatusColor(selectedOrder.status)}`}>
                        {selectedOrder.status}
                      </span>
                    </div>
                    {selectedOrder.status === 'Cancelled' && selectedOrder.cancelReason && (
                      <div className="text-sm font-medium text-red-600 dark:text-red-400 mt-2 bg-red-50 dark:bg-red-900/20 p-3 rounded-xl border border-red-100 dark:border-red-900/30">
                        <strong className="block mb-1">Reason for Cancellation:</strong>
                        {selectedOrder.cancelReason}
                      </div>
                    )}
                  </div>

                  <div className="bg-white dark:bg-dark-800 border-2 border-gray-100 dark:border-dark-700 rounded-3xl p-5 shadow-sm">
                    <h4 className="font-bold text-gray-900 dark:text-white flex items-center mb-4">
                      <Truck size={18} className="mr-2 text-primary-500" />
                      Delivery Partner
                    </h4>
                    
                    {selectedOrder.deliveryPartner ? (
                      <>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <div className="w-12 h-12 bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 rounded-full flex items-center justify-center font-black text-xl">
                              {selectedOrder.deliveryPartner.name.charAt(0)}
                            </div>
                            <div>
                              <p className="font-bold text-gray-900 dark:text-white">{selectedOrder.deliveryPartner.name}</p>
                              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mt-0.5">{selectedOrder.deliveryPartner.phone}</p>
                            </div>
                          </div>
                          {isOrderAssigned ? (
                            <span className="text-xs font-bold text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 px-2 py-1 rounded-lg">On Duty</span>
                          ) : (
                            <span className="text-xs font-bold text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-dark-700 px-2 py-1 rounded-lg">Assigned</span>
                          )}
                        </div>
                        
                        <div className="mt-4 flex justify-end">
                          <button 
                            onClick={() => handleImpersonate(selectedOrder.deliveryPartner._id, 'partner')}
                            className="text-xs font-bold bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400 px-3 py-1.5 rounded-lg hover:bg-orange-200 transition"
                          >
                            View as Partner
                          </button>
                        </div>
                      </>
                    ) : (
                      <p className="text-sm font-medium text-gray-500 dark:text-gray-400 italic">No partner assigned yet</p>
                    )}

                  {selectedOrder.status === 'Cancelled' ? (
                <div className="mt-5 p-4 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/50 rounded-xl">
                  <p className="text-sm font-bold text-red-700 dark:text-red-400 flex items-center">
                    <X size={16} className="mr-2" /> This order has been cancelled and cannot be assigned.
                  </p>
                </div>
              ) : !isOrderAssigned && (
                <div className="mt-5 pt-5 border-t border-gray-100 dark:border-dark-700">
                  <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-2 uppercase tracking-wider">Assign / Reassign Partner</label>
                  <div className="space-y-2 max-h-48 overflow-y-auto custom-scrollbar pr-2">
                  {partners.filter(p => p.isAvailable).length === 0 ? (
                    <p className="text-sm font-medium text-red-500 bg-red-50 dark:bg-red-900/20 p-3 rounded-xl border border-red-100 dark:border-red-900/50">No partners are currently available.</p>
                  ) : (
                    partners.filter(p => p.isAvailable).map(partner => {
                      const isOutForDelivery = partner.isOutForDelivery || orders.some(o => o.status === 'Out for Delivery' && o.deliveryPartner?._id === partner._id);
                      return (
                      <div key={partner._id} className="flex items-center justify-between p-3 rounded-xl border border-gray-100 dark:border-dark-600 bg-gray-50 dark:bg-dark-900 hover:border-primary-300 transition-colors">
                        <div>
                          <p className="font-bold text-gray-800 dark:text-gray-200 text-sm">
                            {partner.name}
                            {isOutForDelivery && <span className="ml-2 text-[10px] bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 px-2 py-0.5 rounded-full uppercase tracking-wider font-bold whitespace-nowrap inline-block">Out for Delivery</span>}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">{partner.phone}</p>
                        </div>
                        <button
                          onClick={() => handleAssignPartner(partner._id)}
                          disabled={assigning || (selectedOrder.cancelledBy && selectedOrder.cancelledBy.includes(partner._id)) || isOutForDelivery}
                          className={`px-3 py-1.5 rounded-lg text-xs font-black flex items-center transition ${
                            selectedOrder.deliveryPartner?._id === partner._id
                              ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 cursor-default'
                              : (selectedOrder.cancelledBy && selectedOrder.cancelledBy.includes(partner._id)) || isOutForDelivery
                              ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                              : 'bg-primary-600 text-white hover:bg-primary-700 shadow-sm'
                          }`}
                        >
                          {selectedOrder.deliveryPartner?._id === partner._id ? (
                            <><CheckCircle size={14} className="mr-1" /> Assigned</>
                          ) : (selectedOrder.cancelledBy && selectedOrder.cancelledBy.includes(partner._id)) ? (
                            <><X size={14} className="mr-1" /> Cancelled</>
                          ) : isOutForDelivery ? (
                            'Busy'
                          ) : (
                            <><UserPlus size={14} className="mr-1" /> Assign</>
                          )}
                        </button>
                      </div>
                    )})
                  )}
                  </div>
                </div>
              )}
                    
                    {isOrderAssigned && (
                      <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-900/50 rounded-xl">
                        <p className="text-xs font-bold text-blue-700 dark:text-blue-400 flex items-center">
                          <CheckCircle size={14} className="mr-1" /> Reassignment disabled (Partner is on the way/delivered)
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Customer Details */}
                <div className="space-y-4">
                  <h3 className="text-xs font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest border-b border-gray-100 dark:border-dark-700 pb-2">Customer Info</h3>
                  <div className="bg-gray-50 dark:bg-dark-900 rounded-3xl p-5 border border-gray-100 dark:border-dark-700 space-y-3 relative">
                    <button 
                      onClick={() => handleImpersonate(selectedOrder.customer._id, 'customer')}
                      className="absolute top-5 right-5 text-xs font-bold bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 px-3 py-1.5 rounded-lg hover:bg-blue-200 transition"
                    >
                      View as Customer
                    </button>
                    <p className="font-bold text-gray-900 dark:text-white text-lg">{selectedOrder.customer?.name}</p>
                    <div className="flex items-center text-sm font-medium text-gray-600 dark:text-gray-400">
                      <Phone size={14} className="mr-2 text-gray-400" /> {selectedOrder.customer?.phone}
                    </div>
                    <div className="flex items-start text-sm font-medium text-gray-600 dark:text-gray-400 pt-2 border-t border-gray-200 dark:border-dark-700">
                      <MapPin size={14} className="mr-2 mt-1 text-gray-400 shrink-0" /> 
                      <span>{selectedOrder.deliveryAddress?.street}, {selectedOrder.deliveryAddress?.city}, {selectedOrder.deliveryAddress?.state} - {selectedOrder.deliveryAddress?.postalCode}</span>
                    </div>
                  </div>
                </div>

                {/* Order Items */}
                <div className="space-y-4">
                  <h3 className="text-xs font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest border-b border-gray-100 dark:border-dark-700 pb-2">Items</h3>
                  <div className="bg-white dark:bg-dark-800 border-2 border-gray-100 dark:border-dark-700 rounded-3xl p-5 shadow-sm space-y-3">
                    {selectedOrder.orderItems.map((item, idx) => (
                      <div key={idx} className="flex justify-between items-center text-sm border-b border-gray-50 dark:border-dark-700 last:border-0 pb-2 last:pb-0">
                        <span className="font-medium text-gray-800 dark:text-gray-200">
                          <span className="font-black text-gray-400 mr-2">{item.quantity}x</span>
                          {item.name}
                        </span>
                        <span className="font-black text-gray-900 dark:text-white">₹{item.price * item.quantity}</span>
                      </div>
                    ))}
                    <div className="pt-4 mt-2 border-t-2 border-dashed border-gray-200 dark:border-dark-600 flex justify-between items-center text-lg">
                      <span className="font-bold text-gray-500 dark:text-gray-400">Total</span>
                      <span className="font-black text-primary-600 dark:text-primary-400 text-2xl">₹{selectedOrder.totalAmount}</span>
                    </div>
                  </div>
                </div>

              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default AdminOrders;
