import { useState, useEffect, useRef } from 'react';
import api from '../../services/api';
import { History as HistoryIcon, Package, CheckCircle2, Banknote, QrCode, Calendar, ChevronDown } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { useUIStore } from '../../store/uiStore';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { fadeUp, staggerContainer } from '../../animations/variants';

const DeliveryHistory = () => {
  const [allHistory, setAllHistory] = useState([]);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dateFilter, setDateFilter] = useState('All Time');
  const [statusFilter, setStatusFilter] = useState('All');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const { user, stopImpersonating } = useAuthStore();
  const { showToast } = useUIStore();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [expandedOrderId, setExpandedOrderId] = useState(null);
  const orderRefs = useRef({});

  useEffect(() => {
    if (startDate && endDate && new Date(endDate) < new Date(startDate)) {
      showToast('To Date cannot be before From Date', 'error');
      setEndDate('');
    }
  }, [startDate, endDate, showToast]);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const { data } = await api.get('/orders/assigned');
        // Include Completed, globally Cancelled, cancelled by THIS partner, or Assigned
        const filtered = data.filter(o => o.status === 'Completed' || o.status === 'Cancelled' || o.status === 'Assigned' || o.status === 'Out for Delivery' || o.status === 'Delivered' || (o.cancelledBy && o.cancelledBy.includes(user._id)));
        setAllHistory(filtered);
        setHistory(filtered);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      fetchHistory();
    }
  }, [user]);

  useEffect(() => {
    let filtered = [...allHistory];
    const now = new Date();
    
    if (dateFilter === 'Today') {
      filtered = filtered.filter(o => new Date(o.updatedAt).toDateString() === now.toDateString());
    } else if (dateFilter === 'Yesterday') {
      const yesterday = new Date(now);
      yesterday.setDate(yesterday.getDate() - 1);
      filtered = filtered.filter(o => new Date(o.updatedAt).toDateString() === yesterday.toDateString());
    } else if (dateFilter === 'Last 7 Days') {
      const lastWeek = new Date(now);
      lastWeek.setDate(lastWeek.getDate() - 7);
      filtered = filtered.filter(o => new Date(o.updatedAt) >= lastWeek);
    } else if (dateFilter === 'This Month') {
      filtered = filtered.filter(o => new Date(o.updatedAt).getMonth() === now.getMonth() && new Date(o.updatedAt).getFullYear() === now.getFullYear());
    } else if (dateFilter === 'Custom Range') {
      filtered = filtered.filter(o => {
        let match = true;
        const orderDate = new Date(o.updatedAt);
        if (startDate) {
          const start = new Date(startDate);
          start.setHours(0, 0, 0, 0);
          match = match && orderDate >= start;
        }
        if (endDate) {
          const end = new Date(endDate);
          end.setHours(23, 59, 59, 999);
          match = match && orderDate <= end;
        }
        return match;
      });
    }

    if (statusFilter !== 'All') {
      filtered = filtered.filter(o => {
        if (statusFilter === 'Completed') return o.status === 'Completed';
        if (statusFilter === 'Cancelled') return o.status === 'Cancelled' || (o.cancelledBy && o.cancelledBy.includes(user?._id));
        if (statusFilter === 'Assigned') return o.status === 'Assigned' || o.status === 'Out for Delivery';
        return true;
      });
    }

    // Sort descending by date
    filtered.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
    setHistory(filtered);
  }, [dateFilter, statusFilter, startDate, endDate, allHistory, user]);

  useEffect(() => {
    const deepLinkOrderId = searchParams.get('orderId');
    if (deepLinkOrderId && !loading && history.length > 0) {
      setExpandedOrderId(deepLinkOrderId);
      setTimeout(() => {
        if (orderRefs.current[deepLinkOrderId]) {
          orderRefs.current[deepLinkOrderId].scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 500);
      setSearchParams(new URLSearchParams());
    }
  }, [searchParams, loading, history, setSearchParams]);

  if (loading) return (
    <div className="flex justify-center items-center min-h-[50vh]">
      <div className="animate-spin w-12 h-12 border-4 border-primary-500 border-t-transparent rounded-full shadow-md"></div>
    </div>
  );

  const completed = history.filter(o => o.status === 'Completed' && o.deliveryPartner === user?._id);
  const cashCollected = completed.filter(o => o.paymentMethod === 'Cash').reduce((acc, curr) => acc + curr.totalAmount, 0);
  const upiCollected = completed.filter(o => o.paymentMethod === 'UPI').reduce((acc, curr) => acc + curr.totalAmount, 0);

  return (
    <motion.div 
      initial="initial"
      animate="animate"
      variants={staggerContainer}
      className="space-y-6 pb-24 px-4 sm:px-0"
    >
      <motion.div variants={fadeUp} className="grid grid-cols-2 gap-4">
        <div className="glass dark:bg-dark-800 p-5 rounded-3xl shadow-sm border border-gray-100 dark:border-dark-700 flex flex-col justify-center transition-colors">
          <div className="flex items-center text-green-600 dark:text-green-400 mb-2">
            <div className="bg-green-100 dark:bg-green-900/30 p-1.5 rounded-lg mr-2"><CheckCircle2 size={16} /></div>
            <span className="text-xs font-black uppercase tracking-wider">Deliveries</span>
          </div>
          <p className="text-3xl font-black text-gray-900 dark:text-white pl-1">{completed.length}</p>
        </div>
        <div className="glass dark:bg-dark-800 p-5 rounded-3xl shadow-sm border border-gray-100 dark:border-dark-700 flex flex-col justify-center transition-colors">
          <div className="flex items-center text-red-500 dark:text-red-400 mb-2">
            <div className="bg-red-100 dark:bg-red-900/30 p-1.5 rounded-lg mr-2"><Package size={16} /></div>
            <span className="text-xs font-black uppercase tracking-wider">Cancelled</span>
          </div>
          <p className="text-3xl font-black text-gray-900 dark:text-white pl-1">{history.filter(o => o.status === 'Cancelled' || (o.cancelledBy && o.cancelledBy.includes(user?._id))).length}</p>
        </div>
      </motion.div>
      
      <motion.div variants={fadeUp} className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="glass dark:bg-dark-800 bg-emerald-50/50 dark:bg-emerald-900/10 p-3 sm:p-4 rounded-3xl shadow-sm border-2 border-emerald-100 dark:border-emerald-900/30 flex flex-col items-start justify-between transition-colors min-h-[100px]">
          <div className="flex items-center text-emerald-700 dark:text-emerald-400 mb-2 w-full gap-2">
            <div className="bg-emerald-100 dark:bg-emerald-900/30 p-1.5 rounded-lg shrink-0"><Banknote size={16} /></div>
            <span className="text-[10px] sm:text-xs font-black uppercase tracking-tight leading-tight">Total Cash</span>
          </div>
          <p className="text-xl sm:text-2xl font-black text-emerald-900 dark:text-emerald-300">₹{cashCollected}</p>
        </div>
        <div className="glass dark:bg-dark-800 bg-indigo-50/50 dark:bg-indigo-900/10 p-3 sm:p-4 rounded-3xl shadow-sm border-2 border-indigo-100 dark:border-indigo-900/30 flex flex-col items-start justify-between transition-colors min-h-[100px]">
          <div className="flex items-center text-indigo-700 dark:text-indigo-400 mb-2 w-full gap-2">
            <div className="bg-indigo-100 dark:bg-indigo-900/30 p-1.5 rounded-lg shrink-0"><QrCode size={16} /></div>
            <span className="text-[10px] sm:text-xs font-black uppercase tracking-tight leading-tight">Total UPI</span>
          </div>
          <p className="text-xl sm:text-2xl font-black text-indigo-900 dark:text-indigo-300">₹{upiCollected}</p>
        </div>
        <div className="glass dark:bg-dark-800 bg-red-50/50 dark:bg-red-900/10 p-3 sm:p-4 rounded-3xl shadow-sm border-2 border-red-200 dark:border-red-900/50 flex flex-col items-start justify-between transition-colors relative overflow-hidden min-h-[100px]">
          <div className="absolute right-0 top-0 w-16 h-16 bg-red-500/10 rounded-full blur-xl translate-x-1/2 -translate-y-1/2 pointer-events-none"></div>
          <div className="flex items-center text-red-700 dark:text-red-400 mb-2 w-full gap-2 relative z-10">
            <div className="bg-red-100 dark:bg-red-900/30 p-1.5 rounded-lg shrink-0"><Banknote size={14} /></div>
            <span className="text-[10px] sm:text-xs font-black uppercase tracking-tight leading-tight">Pending COD</span>
          </div>
          <p className="text-xl sm:text-2xl font-black text-red-900 dark:text-red-300 relative z-10">₹{user?.stats?.pendingCashToSubmit || 0}</p>
        </div>
        <div className="glass dark:bg-dark-800 bg-green-50/50 dark:bg-green-900/10 p-3 sm:p-4 rounded-3xl shadow-sm border-2 border-green-100 dark:border-green-900/30 flex flex-col items-start justify-between transition-colors min-h-[100px]">
          <div className="flex items-center text-green-700 dark:text-green-400 mb-2 w-full gap-2">
            <div className="bg-green-100 dark:bg-green-900/30 p-1.5 rounded-lg shrink-0"><CheckCircle2 size={14} /></div>
            <span className="text-[10px] sm:text-xs font-black uppercase tracking-tight leading-tight">Cash Submit</span>
          </div>
          <p className="text-xl sm:text-2xl font-black text-green-900 dark:text-green-300">₹{user?.stats?.submittedCash || 0}</p>
        </div>
      </motion.div>

      <motion.div variants={fadeUp} className="flex flex-col md:flex-row justify-between items-center mb-2 mt-4 bg-white dark:bg-dark-800 p-3 rounded-2xl border border-gray-100 dark:border-dark-700 shadow-sm transition-colors gap-3">
        <h3 className="font-black text-gray-800 dark:text-white flex items-center px-2">
          <HistoryIcon size={20} className="mr-2 text-primary-500" />
          Delivery Log
          {user?.isImpersonated && (
            <button onClick={() => { stopImpersonating(); navigate('/admin'); }} className="ml-4 text-xs bg-orange-500 text-white px-3 py-1 rounded-full hover:bg-orange-600 transition-colors">
              Return to Admin
            </button>
          )}
        </h3>
        <div className="relative flex flex-wrap gap-2 justify-end">
            <select 
              value={statusFilter} 
              onChange={e => setStatusFilter(e.target.value)}
              className="text-sm font-bold bg-gray-50 dark:bg-dark-900 border border-gray-200 dark:border-dark-700 rounded-xl px-3 py-2 focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500 outline-none text-gray-700 dark:text-gray-300 cursor-pointer transition-colors"
            >
              <option value="All">All Status</option>
              <option value="Assigned">Assigned</option>
              <option value="Completed">Completed</option>
              <option value="Cancelled">Cancelled</option>
            </select>
          <div className="relative">
            <select 
              value={dateFilter} 
              onChange={e => setDateFilter(e.target.value)}
              className="text-sm font-bold bg-gray-50 dark:bg-dark-900 border border-gray-200 dark:border-dark-700 rounded-xl pl-3 pr-8 py-2 focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500 outline-none text-gray-700 dark:text-gray-300 appearance-none cursor-pointer transition-colors"
            >
              <option>All Time</option>
              <option>Today</option>
              <option>Yesterday</option>
              <option>Last 7 Days</option>
              <option>Last 30 Days</option>
              <option>This Month</option>
              <option>Custom Range</option>
            </select>
            <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none text-gray-500">
              <ChevronDown size={16} />
            </div>
          </div>
          {dateFilter === 'Custom Range' && (
            <div className="flex flex-col gap-1 w-full sm:w-auto mt-2 sm:mt-0">
              <div className="flex gap-2">
                <input 
                  type="date" 
                  max={new Date().toISOString().split('T')[0]}
                  value={startDate} 
                  onChange={(e) => {
                    const newDate = e.target.value;
                    if (endDate && newDate > endDate) {
                      showToast('From Date cannot be later than To Date', 'error');
                      return;
                    }
                    setStartDate(newDate);
                  }} 
                  className="text-sm font-bold bg-gray-50 dark:bg-dark-900 border border-gray-200 dark:border-dark-700 rounded-xl px-3 py-2 focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500 outline-none text-gray-700 dark:text-gray-300 transition-colors" 
                />
                <input 
                  type="date" 
                  max={new Date().toISOString().split('T')[0]}
                  min={startDate || undefined}
                  value={endDate} 
                  onChange={(e) => {
                    const newDate = e.target.value;
                    if (startDate && newDate < startDate) {
                      showToast('To Date cannot be earlier than From Date', 'error');
                      return;
                    }
                    setEndDate(newDate);
                  }} 
                  className="text-sm font-bold bg-gray-50 dark:bg-dark-900 border border-gray-200 dark:border-dark-700 rounded-xl px-3 py-2 focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500 outline-none text-gray-700 dark:text-gray-300 transition-colors" 
                />
              </div>
              {startDate && endDate && new Date(startDate) > new Date(endDate) && (
                <span className="text-red-500 text-xs font-bold px-1">To date cannot be before From date.</span>
              )}
            </div>
          )}
        </div>
      </motion.div>

      {history.length === 0 ? (
        <motion.div variants={fadeUp} className="text-center py-16 glass dark:bg-dark-800 rounded-3xl border border-gray-100 dark:border-dark-700 text-gray-500 dark:text-gray-400 transition-colors">
          <div className="w-20 h-20 bg-gray-50 dark:bg-dark-900 rounded-full flex items-center justify-center mx-auto mb-4 shadow-inner">
            <Package size={32} className="opacity-50" />
          </div>
          <p className="font-medium">No deliveries found for this period.</p>
        </motion.div>
      ) : (
        <motion.div variants={staggerContainer} className="space-y-3">
          <AnimatePresence>
            {history.map((order, i) => {
              const isExpanded = expandedOrderId === order._id;
              return (
              <motion.div 
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ delay: i * 0.05 }}
                key={order._id} 
                ref={(el) => orderRefs.current[order._id] = el}
                onClick={() => setExpandedOrderId(isExpanded ? null : order._id)}
                className={`glass dark:bg-dark-800 p-5 rounded-2xl border ${isExpanded ? 'border-primary-500 ring-2 ring-primary-500/20 bg-primary-50/10 dark:bg-primary-900/10' : 'border-gray-100 dark:border-dark-700 hover:border-primary-200 dark:hover:border-primary-900/50'} shadow-sm flex flex-col hover:shadow-md transition-all group cursor-pointer`}
              >
                <div className="flex justify-between items-center w-full">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-black text-gray-900 dark:text-white flex items-center">
                        {order.orderId || `#${order._id.substring(18)}`}
                        <ChevronDown size={16} className={`ml-2 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                      </p>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-black uppercase tracking-wider border shadow-sm ${(order.status === 'Completed' && order.deliveryPartner === user?._id) ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800/50' : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800/50'}`}>
                        {(order.cancelledBy && order.cancelledBy.includes(user?._id)) ? 'Cancelled' : order.status}
                      </span>
                    </div>
                    <div className="flex items-center text-xs text-gray-500 dark:text-gray-400 font-medium bg-gray-50 dark:bg-dark-900 inline-flex px-2 py-1 rounded-lg">
                      <Calendar size={12} className="mr-1" />
                      {new Date(order.updatedAt).toLocaleDateString()} at {new Date(order.updatedAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                    </div>
                  </div>
                  <div className="text-right flex flex-col items-end">
                    <p className={`font-black text-lg ${(order.status === 'Completed' && order.deliveryPartner === user?._id) ? 'text-primary-600 dark:text-primary-400' : 'text-gray-400 dark:text-gray-600 line-through'}`}>₹{order.totalAmount}</p>
                    {(order.status === 'Completed' && order.deliveryPartner === user?._id) && (
                      <p className="text-xs font-bold mt-1 flex items-center bg-gray-50 dark:bg-dark-900 px-2 py-1 rounded-lg text-gray-700 dark:text-gray-300">
                        {order.paymentMethod === 'Cash' ? <Banknote size={12} className="text-emerald-500 mr-1" /> : <QrCode size={12} className="text-indigo-500 mr-1"/>} 
                        {order.paymentMethod || 'COD'}
                      </p>
                    )}
                  </div>
                </div>
                
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden mt-4 pt-4 border-t border-gray-100 dark:border-dark-700 w-full"
                    >
                      <h4 className="font-bold text-sm text-gray-900 dark:text-white mb-2">Order Items</h4>
                      <ul className="space-y-2 mb-4">
                        {order.orderItems.map((item, idx) => (
                          <li key={idx} className="flex justify-between items-center text-xs font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-dark-900 p-2 rounded-lg border border-gray-100 dark:border-dark-700">
                            <span><span className="font-bold text-primary-600 mr-2">{item.quantity}x</span>{item.name}</span>
                          </li>
                        ))}
                      </ul>
                      <h4 className="font-bold text-sm text-gray-900 dark:text-white mb-2">Delivery Address</h4>
                      <p className="text-xs text-gray-600 dark:text-gray-400 bg-white dark:bg-dark-900 p-3 rounded-lg border border-gray-100 dark:border-dark-700">
                        <span className="font-bold block text-gray-800 dark:text-gray-200 mb-1">{order.deliveryAddress?.street}</span>
                        {order.deliveryAddress?.city}, {order.deliveryAddress?.state} {order.deliveryAddress?.postalCode}
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            )})}
          </AnimatePresence>
        </motion.div>
      )}
    </motion.div>
  );
};

export default DeliveryHistory;
