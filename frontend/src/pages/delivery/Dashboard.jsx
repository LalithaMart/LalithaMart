import React, { useState, useEffect, useRef } from 'react';
import api from '../../services/api';
import { MapPin, Phone, Package, CheckCircle, Wallet, XCircle, ChevronRight, Navigation2, Camera } from 'lucide-react';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { useUIStore } from '../../store/uiStore';
import { useAuthStore } from '../../store/authStore';
import { useSocketStore } from '../../store/socketStore';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { fadeUp, staggerContainer } from '../../animations/variants';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

function NativeMap({ lat, lng, popupText }) {
  const mapRef = useRef(null);
  const mapInstance = useRef(null);
  const markerInstance = useRef(null);

  useEffect(() => {
    if (!mapRef.current) return;
    if (!mapInstance.current) {
      mapInstance.current = L.map(mapRef.current).setView([lat, lng], 14);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap'
      }).addTo(mapInstance.current);
      
      markerInstance.current = L.marker([lat, lng]).addTo(mapInstance.current);
      if (popupText) {
        markerInstance.current.bindPopup(`<b style="font-family: sans-serif;">${popupText}</b>`);
      }
    }
    return () => {
      if (mapInstance.current) {
        mapInstance.current.remove();
        mapInstance.current = null;
        markerInstance.current = null;
      }
    };
  }, [lat, lng, popupText]);

  return <div ref={mapRef} className="h-full w-full z-0" />;
}

const DeliveryDashboard = () => {
  const [allOrders, setAllOrders] = useState([]);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [otp, setOtp] = useState('');
  const [error, setError] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('');
  
  // Cancel delivery modal state
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelOrderId, setCancelOrderId] = useState(null);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelImage, setCancelImage] = useState(null);
  
  const { showToast } = useUIStore();
  const { user } = useAuthStore();
  const { socket } = useSocketStore();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [expandedOrderId, setExpandedOrderId] = useState(null);
  const orderRefs = useRef({});

  const fetchAssignedOrders = async () => {
    try {
      const { data } = await api.get('/orders/assigned');
      setAllOrders(data);
      setOrders(data.filter(o => o.status !== 'Completed' && o.status !== 'Cancelled'));
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAssignedOrders();
  }, []);

  useEffect(() => {
    const deepLinkOrderId = searchParams.get('orderId');
    if (deepLinkOrderId && !loading && orders.length > 0) {
      setExpandedOrderId(deepLinkOrderId);
      setTimeout(() => {
        if (orderRefs.current[deepLinkOrderId]) {
          orderRefs.current[deepLinkOrderId].scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 500);
      setSearchParams(new URLSearchParams());
    }
  }, [searchParams, loading, orders, setSearchParams]);

  useEffect(() => {
    if (socket) {
      const handleOrderUpdate = () => {
        fetchAssignedOrders();
      };
      
      socket.on('order-assigned', handleOrderUpdate);
      socket.on('order-updated', handleOrderUpdate);
      socket.on('order-modified', handleOrderUpdate);
      socket.on('order-cancelled', handleOrderUpdate);
      
      return () => {
        socket.off('order-assigned', handleOrderUpdate);
        socket.off('order-updated', handleOrderUpdate);
        socket.off('order-modified', handleOrderUpdate);
        socket.off('order-cancelled', handleOrderUpdate);
      };
    }
  }, [socket]);

  // Live Location Tracking
  useEffect(() => {
    let watchId;
    if (user?.isAvailable && navigator.geolocation) {
      watchId = navigator.geolocation.watchPosition(
        async (position) => {
          try {
            await api.put('/users/location', {
              lat: position.coords.latitude,
              lng: position.coords.longitude
            });
          } catch (e) {
            console.error('Failed to update live location', e);
          }
        },
        (err) => console.warn('Geolocation error:', err),
        { enableHighAccuracy: true, maximumAge: 10000, timeout: 5000 }
      );
    }
    return () => {
      if (watchId) navigator.geolocation.clearWatch(watchId);
    };
  }, [user?.isAvailable]);

  const handleUpdateStatus = async (id, status) => {
    try {
      await api.put(`/orders/${id}/status`, { status });
      fetchAssignedOrders();
      if (selectedOrder && selectedOrder._id === id) {
        setSelectedOrder({ ...selectedOrder, status });
      }
      showToast('Status updated', 'success');
    } catch (error) {
      console.error(error);
      showToast('Failed to update status', 'error');
    }
  };

  const handleCancelDelivery = (id) => {
    setCancelOrderId(id);
    setShowCancelModal(true);
  };

  const submitCancelDelivery = async (e) => {
    e.preventDefault();
    if (!cancelReason) return;
    try {
      const data = new FormData();
      data.append('reason', cancelReason);
      if (cancelImage) data.append('image', cancelImage);
      
      await api.put(`/orders/${cancelOrderId}/cancel-delivery`, data);
      showToast('Delivery cancelled', 'success');
      setShowCancelModal(false);
      setCancelOrderId(null);
      setCancelReason('');
      setCancelImage(null);
      fetchAssignedOrders();
    } catch (error) {
      console.error(error);
      showToast(error.response?.data?.message || 'Failed to cancel delivery', 'error');
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await api.post(`/orders/${selectedOrder._id}/verify-otp`, { otp, paymentMethod });
      setSelectedOrder(null);
      setOtp('');
      setPaymentMethod('');
      fetchAssignedOrders();
      showToast('Delivery Completed Successfully! Payment Collected.', 'success');
    } catch (error) {
      setError(error.response?.data?.message || 'Invalid OTP');
    }
  };

  if (loading) return (
    <div className="flex justify-center items-center min-h-[50vh]">
      <div className="animate-spin w-12 h-12 border-4 border-primary-500 border-t-transparent rounded-full shadow-md"></div>
    </div>
  );

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const completedOrders = allOrders.filter(o => {
    if (o.status !== 'Completed') return false;
    const orderDate = new Date(o.updatedAt);
    return orderDate >= today;
  });
  const earnings = completedOrders.length * 40; // Assuming ₹40 per delivery

  return (
    <motion.div 
      initial="initial"
      animate="animate"
      variants={staggerContainer}
      className="space-y-6 pb-24"
    >
      {/* Earnings Summary */}
      <motion.div variants={fadeUp} className="bg-gradient-to-br from-primary-500 to-primary-700 dark:from-primary-700 dark:to-primary-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl shadow-primary-500/20 relative overflow-hidden">
        <div className="absolute right-0 top-0 w-48 h-48 bg-white/10 rounded-full blur-3xl transform translate-x-1/3 -translate-y-1/3 pointer-events-none"></div>
        <div className="relative z-10">
          <div className="flex justify-between items-center mb-6">
            <div>
              <p className="text-primary-100 font-bold mb-1 uppercase tracking-wider text-sm">Today's Earnings</p>
              <h2 className="text-4xl sm:text-5xl font-black drop-shadow-sm">₹{earnings}</h2>
            </div>
            <div className="bg-white/20 p-4 rounded-2xl backdrop-blur-md shadow-inner border border-white/20">
              <Wallet size={32} className="drop-shadow-md" />
            </div>
          </div>
          <div className="flex justify-between items-center text-sm font-bold bg-white/10 p-4 rounded-2xl backdrop-blur-sm border border-white/10">
            <span className="flex items-center"><CheckCircle size={16} className="mr-2" /> Deliveries: {completedOrders.length}</span>
            <span className="bg-white text-primary-700 px-3 py-1.5 rounded-xl drop-shadow-sm">+ ₹40/del</span>
          </div>
        </div>
      </motion.div>

      {orders.length === 0 ? (
        <motion.div variants={fadeUp} className="glass dark:bg-dark-800 p-10 rounded-3xl shadow-sm border border-gray-100 dark:border-dark-700 text-center transition-colors">
          <div className="w-24 h-24 bg-gray-50 dark:bg-dark-900 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner border border-gray-100 dark:border-dark-700">
            <Package size={48} className="text-gray-300 dark:text-gray-600" />
          </div>
          <h3 className="text-2xl font-black text-gray-800 dark:text-gray-200 mb-2 tracking-tight">No Active Deliveries</h3>
          <p className="text-gray-500 dark:text-gray-400 font-medium">You're all caught up! Wait for new orders to be assigned.</p>
        </motion.div>
      ) : (
        <motion.div variants={staggerContainer} className="space-y-6">
          <AnimatePresence>
            {orders.map((order) => {
              const isExpanded = expandedOrderId === order._id || orders.length === 1; // Auto-expand if only 1 order
              return (
              <motion.div 
                layout
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                key={order._id}
                ref={(el) => orderRefs.current[order._id] = el}
                className={`glass dark:bg-dark-800 rounded-3xl shadow-sm border ${isExpanded ? 'border-primary-500 ring-2 ring-primary-500/20' : 'border-gray-100 dark:border-dark-700'} overflow-hidden transition-all duration-300`}
              >
                <div 
                  className={`p-5 sm:p-6 cursor-pointer transition-colors ${isExpanded ? 'bg-primary-50/50 dark:bg-primary-900/10 border-b border-primary-100 dark:border-primary-900/30' : 'bg-gray-50/80 dark:bg-dark-900/50 border-b border-gray-100 dark:border-dark-700 hover:bg-gray-100/80 dark:hover:bg-dark-900/80'} flex justify-between items-center backdrop-blur-sm`}
                  onClick={() => setExpandedOrderId(isExpanded && orders.length > 1 ? null : order._id)}
                >
                  <div>
                    <span className="text-xs font-bold text-gray-500 dark:text-gray-400 block mb-0.5 uppercase tracking-wider">Order ID</span>
                    <span className="font-black text-gray-900 dark:text-white text-lg tracking-tight flex items-center">
                      {order.orderId || `#${order._id.substring(18)}`}
                      {orders.length > 1 && (
                        <ChevronRight size={20} className={`ml-2 text-gray-400 transition-transform duration-300 ${isExpanded ? 'rotate-90' : ''}`} />
                      )}
                    </span>
                  </div>
                  <span className={`px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-widest shadow-sm border
                    ${order.status === 'Assigned' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border-blue-200 dark:border-blue-800/50' : 
                      order.status === 'Out for Delivery' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800/50' : 
                      'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border-green-200 dark:border-green-800/50'}`}>
                    {order.status}
                  </span>
                </div>
                
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                <div className="p-5 sm:p-6 space-y-6">
                  {/* Customer Info */}
                  <div className="flex items-start bg-gray-50 dark:bg-dark-900 p-4 rounded-2xl border border-gray-100 dark:border-dark-700">
                    <div className="mt-1 bg-primary-100 dark:bg-primary-900/50 p-2.5 rounded-xl text-primary-600 dark:text-primary-400 mr-4 shadow-sm shrink-0 border border-primary-200 dark:border-primary-900">
                      <MapPin size={20} />
                    </div>
                    <div>
                      <p className="font-black text-gray-900 dark:text-white text-lg mb-1">{order.customer?.name}</p>
                      <p className="text-sm font-medium text-gray-600 dark:text-gray-400 leading-relaxed">
                        {order.deliveryAddress?.street}, {order.deliveryAddress?.city}, {order.deliveryAddress?.postalCode}
                      </p>
                    </div>
                  </div>

                  {/* Actions Row */}
                  <div className="flex flex-col sm:flex-row gap-3">
                    <div className="flex-1 flex items-center justify-between bg-white dark:bg-dark-800 p-4 rounded-2xl border-2 border-gray-100 dark:border-dark-700 shadow-sm">
                      <div className="flex items-center font-bold text-gray-700 dark:text-gray-200">
                        <Phone size={18} className="mr-3 text-gray-400 dark:text-gray-500" />
                        {order.customer?.phone}
                      </div>
                      <a href={`tel:${order.customer?.phone}`} className="text-primary-600 dark:text-primary-400 font-black text-sm bg-primary-50 dark:bg-primary-900/30 px-5 py-2 rounded-xl border border-primary-100 dark:border-primary-900/50 hover:bg-primary-100 dark:hover:bg-primary-900/50 transition-colors shadow-sm">Call</a>
                    </div>
                    <button 
                      onClick={() => {
                        if (order.deliveryAddress?.location) {
                          window.open(`https://www.google.com/maps/dir/?api=1&destination=${order.deliveryAddress.location.lat},${order.deliveryAddress.location.lng}`);
                        } else {
                          showToast('Location coordinates not available', 'error');
                        }
                      }}
                      className="flex-1 sm:flex-none bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 py-4 px-6 rounded-2xl font-black flex items-center justify-center hover:bg-gray-800 dark:hover:bg-white transition-colors shadow-md"
                    >
                      <Navigation2 size={18} className="mr-2" />
                      Navigate
                    </button>
                  </div>

                  {/* Order Items */}
                  <div className="pt-2">
                    <h4 className="text-sm font-black text-gray-800 dark:text-gray-200 mb-3 uppercase tracking-wider">Items to Deliver</h4>
                    <ul className="space-y-2 mb-4 bg-gray-50 dark:bg-dark-900 p-4 rounded-2xl border border-gray-100 dark:border-dark-700">
                      {order.orderItems.map((item, idx) => (
                        <li key={idx} className="flex justify-between items-center text-sm font-medium">
                          <span className="text-gray-700 dark:text-gray-300"><span className="font-black text-gray-400 mr-2">{item.quantity}x</span>{item.name}</span>
                          <span className="font-black text-gray-900 dark:text-white">₹{item.price * item.quantity}</span>
                        </li>
                      ))}
                    </ul>
                    <div className="flex justify-between items-center font-black text-gray-900 dark:text-white mt-2 p-4 rounded-2xl border-2 border-primary-100 dark:border-primary-900/50 bg-primary-50/50 dark:bg-primary-900/10 text-lg">
                      <span>Total to Collect <span className="text-xs bg-gray-200 dark:bg-dark-700 text-gray-600 dark:text-gray-300 px-2 py-1 rounded-lg ml-2">COD</span></span>
                      <span className="text-2xl text-primary-600 dark:text-primary-400 tracking-tight">₹{order.totalAmount}</span>
                    </div>
                  </div>

                  {/* Map */}
                  {order.deliveryAddress?.location && (
                    <div className="h-56 rounded-2xl overflow-hidden border-2 border-gray-200 dark:border-dark-700 relative z-0 shadow-inner">
                      <NativeMap 
                        lat={order.deliveryAddress.location.lat} 
                        lng={order.deliveryAddress.location.lng} 
                        popupText={`${order.customer?.name}'s Location`} 
                      />
                    </div>
                  )}

                  {/* Primary Actions */}
                  <div className="pt-4 border-t border-gray-100 dark:border-dark-700 flex flex-col sm:flex-row gap-3">
                    {order.status === 'Assigned' && (
                      <>
                        <button 
                          onClick={() => handleUpdateStatus(order._id, 'Out for Delivery')}
                          className="w-full bg-primary-600 text-white py-4 rounded-2xl font-black text-lg hover:bg-primary-500 transition shadow-lg shadow-primary-500/30 flex items-center justify-center group"
                        >
                          Start Delivery <ChevronRight size={20} className="ml-1 group-hover:translate-x-1 transition-transform" />
                        </button>
                        <button 
                          onClick={() => handleCancelDelivery(order._id)}
                          className="w-full sm:w-auto bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 py-4 px-6 rounded-2xl font-bold border-2 border-red-100 dark:border-red-900/50 hover:bg-red-100 dark:hover:bg-red-900/40 transition flex items-center justify-center"
                        >
                          <XCircle size={18} className="mr-2" /> Cancel
                        </button>
                      </>
                    )}
                    
                    {order.status === 'Out for Delivery' && (
                      <button 
                        onClick={() => {
                          handleUpdateStatus(order._id, 'Delivered');
                          setSelectedOrder(order);
                        }}
                        className="w-full bg-green-500 text-white py-4 rounded-2xl font-black text-lg hover:bg-green-600 transition shadow-lg shadow-green-500/30 flex items-center justify-center"
                      >
                        <CheckCircle size={20} className="mr-2" /> Mark Arrived
                      </button>
                    )}

                    {order.status === 'Delivered' && (
                      <button 
                        onClick={() => setSelectedOrder(order)}
                        className="w-full bg-primary-600 text-white py-4 rounded-2xl font-black text-lg hover:bg-primary-500 transition shadow-lg shadow-primary-500/30"
                      >
                        Verify OTP & Collect Payment
                      </button>
                    )}
                  </div>
                </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            )})}
          </AnimatePresence>
        </motion.div>
      )}

      {/* OTP Verification Modal */}
      <AnimatePresence>
        {selectedOrder && selectedOrder.status === 'Delivered' && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex items-end sm:items-center justify-center sm:p-4"
          >
            <motion.div 
              initial={{ y: "100%", opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: "100%", opacity: 0 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="bg-white dark:bg-dark-800 rounded-t-3xl sm:rounded-3xl w-full max-w-md overflow-y-auto max-h-[90vh] custom-scrollbar shadow-2xl border border-gray-100 dark:border-dark-700"
            >
              <div className="p-6 border-b border-gray-100 dark:border-dark-700 text-center relative bg-gray-50/50 dark:bg-dark-900/50">
                <div className="mx-auto w-16 h-16 bg-green-100 dark:bg-green-900/30 text-green-500 dark:text-green-400 rounded-2xl flex items-center justify-center mb-4 shadow-sm border border-green-200 dark:border-green-800/50">
                  <CheckCircle size={32} />
                </div>
                <h2 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">Verify Customer</h2>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mt-2">Ask the customer for the OTP sent to their phone.</p>
                
                <button 
                  onClick={() => {setSelectedOrder(null); setError(''); setOtp(''); setPaymentMethod('');}}
                  className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center bg-gray-100 dark:bg-dark-700 text-gray-500 dark:text-gray-400 rounded-full hover:bg-gray-200 dark:hover:bg-dark-600 transition"
                >
                  ✕
                </button>
              </div>
              
              <form onSubmit={handleVerifyOtp} className="p-6 sm:p-8 space-y-6">
                {error && <div className="text-red-500 text-sm font-bold text-center bg-red-50 dark:bg-red-900/20 py-3 rounded-xl border border-red-200 dark:border-red-900/50">{error}</div>}
                
                <div className="text-center bg-gray-50 dark:bg-dark-900 p-6 rounded-2xl border border-gray-100 dark:border-dark-700 shadow-inner">
                  <label className="block text-xs font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-2">Amount to Collect</label>
                  <div className="text-4xl font-black text-primary-600 dark:text-primary-400 mb-6 drop-shadow-sm">₹{selectedOrder.totalAmount}</div>
                  
                  <div className="flex gap-3 mb-2 justify-center">
                    <button type="button" onClick={() => setPaymentMethod('Cash')} className={`flex-1 py-3 rounded-xl font-black transition-all border-2 ${paymentMethod === 'Cash' ? 'bg-primary-600 text-white border-primary-600 shadow-md shadow-primary-500/30' : 'bg-white dark:bg-dark-800 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-dark-600 hover:border-primary-300'}`}>Cash</button>
                    <button type="button" onClick={() => setPaymentMethod('UPI')} className={`flex-1 py-3 rounded-xl font-black transition-all border-2 ${paymentMethod === 'UPI' ? 'bg-primary-600 text-white border-primary-600 shadow-md shadow-primary-500/30' : 'bg-white dark:bg-dark-800 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-dark-600 hover:border-primary-300'}`}>UPI QR</button>
                  </div>
                  
                  {paymentMethod === 'UPI' && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="mt-6">
                      <div className="bg-white p-3 rounded-2xl shadow-sm border-2 border-primary-100 inline-block mx-auto mb-2">
                        <img src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=upi://pay?pa=lalithamart@upi&pn=LalithaMart&am=${selectedOrder.totalAmount}`} alt="UPI QR" className="w-32 h-32 object-contain" />
                      </div>
                      <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">Scan to pay via UPI</p>
                    </motion.div>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-2 text-center">Enter 6-Digit OTP</label>
                  <input
                    type="text"
                    required
                    maxLength="6"
                    placeholder="------"
                    className="w-full text-center tracking-[1em] text-2xl font-black px-4 py-4 bg-gray-50 dark:bg-dark-900 border-2 border-gray-200 dark:border-dark-700 rounded-2xl focus:border-primary-500 focus:ring-4 focus:ring-primary-500/20 transition-all text-gray-900 dark:text-white"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                  />
                </div>
                
                <button
                  type="submit"
                  className="w-full bg-primary-600 text-white font-black text-lg py-4 rounded-2xl hover:bg-primary-500 transition shadow-lg shadow-primary-500/30 disabled:bg-gray-300 dark:disabled:bg-dark-700 disabled:text-gray-500 disabled:shadow-none"
                  disabled={!paymentMethod || otp.length < 6}
                >
                  Confirm & Complete
                </button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Cancel Delivery Modal */}
      <AnimatePresence>
        {showCancelModal && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex items-end sm:items-center justify-center sm:p-4"
          >
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white dark:bg-dark-800 rounded-t-3xl sm:rounded-3xl w-full max-w-md overflow-hidden shadow-2xl border border-gray-100 dark:border-dark-700"
            >
              <div className="p-6 border-b border-gray-100 dark:border-dark-700 relative bg-gray-50/50 dark:bg-dark-900/50">
                <h2 className="text-xl font-black text-gray-900 dark:text-white flex items-center">
                  <XCircle className="text-red-500 mr-2" size={24} />
                  Cancel Delivery
                </h2>
                <button 
                  onClick={() => {
                    setShowCancelModal(false); 
                    setCancelOrderId(null); 
                    setCancelReason(''); 
                    setCancelImage(null);
                  }}
                  className="absolute top-6 right-6 w-8 h-8 flex items-center justify-center bg-gray-100 dark:bg-dark-700 text-gray-500 dark:text-gray-400 rounded-full hover:bg-gray-200 dark:hover:bg-dark-600 transition"
                >
                  ✕
                </button>
              </div>
              <form onSubmit={submitCancelDelivery} className="p-6 space-y-6">
                <div>
                  <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Reason for Cancellation</label>
                  <textarea
                    required
                    className="w-full px-4 py-3 bg-gray-50 dark:bg-dark-900 border-2 border-gray-200 dark:border-dark-700 rounded-xl focus:border-red-500 focus:ring-4 focus:ring-red-500/20 transition-all font-medium text-gray-900 dark:text-white resize-none"
                    rows="3"
                    placeholder="E.g. Customer unreachable, location incorrect..."
                    value={cancelReason}
                    onChange={(e) => setCancelReason(e.target.value)}
                  ></textarea>
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Upload Proof (Optional)</label>
                  <div className="relative border-2 border-dashed border-gray-300 dark:border-dark-600 rounded-xl p-4 text-center hover:bg-gray-50 dark:hover:bg-dark-900 transition-colors">
                    <input
                      type="file"
                      accept="image/*"
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      onChange={(e) => setCancelImage(e.target.files[0])}
                    />
                    <div className="pointer-events-none">
                      <Camera size={24} className="mx-auto text-gray-400 mb-2" />
                      <span className="text-sm font-bold text-primary-600 dark:text-primary-400">
                        {cancelImage ? cancelImage.name : 'Tap to upload photo'}
                      </span>
                    </div>
                  </div>
                </div>
                <button
                  type="submit"
                  className="w-full bg-red-600 text-white font-black text-lg py-4 rounded-2xl hover:bg-red-500 transition shadow-lg shadow-red-500/30"
                >
                  Confirm Cancellation
                </button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default DeliveryDashboard;
