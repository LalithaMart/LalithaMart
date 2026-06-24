import React, { useState, useEffect, useRef } from 'react';
import api from '../../services/api';
import { Package, MapPin, LogOut, Plus, CheckCircle, Clock, XCircle, ChevronRight, Settings } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { useUIStore } from '../../store/uiStore';
import { useSocketStore } from '../../store/socketStore';
import { useNavigate, useSearchParams } from 'react-router-dom';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { motion, AnimatePresence } from 'framer-motion';
import { fadeUp, staggerContainer } from '../../animations/variants';

// Fix for default marker icon in leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

function LocationPicker({ position, setPosition }) {
  const mapRef = useRef(null);
  const mapInstance = useRef(null);
  const markerInstance = useRef(null);

  useEffect(() => {
    if (!mapRef.current) return;

    const lat = position.location?.lat || 17.3850;
    const lng = position.location?.lng || 78.4867;

    // Initialize map only once
    if (!mapInstance.current) {
      mapInstance.current = L.map(mapRef.current).setView([lat, lng], 13);
      
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap'
      }).addTo(mapInstance.current);

      if (position.location?.lat) {
        markerInstance.current = L.marker([lat, lng]).addTo(mapInstance.current);
      }

      mapInstance.current.on('click', (e) => {
        const { lat: newLat, lng: newLng } = e.latlng;
        
        if (markerInstance.current) {
          markerInstance.current.setLatLng([newLat, newLng]);
        } else {
          markerInstance.current = L.marker([newLat, newLng]).addTo(mapInstance.current);
        }
        
        setPosition(prev => ({
          ...prev,
          location: { lat: newLat, lng: newLng }
        }));
      });
    }
  }, []); // Only initialize once

  // Update map and marker when position changes externally
  useEffect(() => {
    if (mapInstance.current && position.location?.lat && position.location?.lng) {
      const lat = position.location.lat;
      const lng = position.location.lng;
      mapInstance.current.setView([lat, lng], 16);
      
      if (markerInstance.current) {
        markerInstance.current.setLatLng([lat, lng]);
      } else {
        markerInstance.current = L.marker([lat, lng]).addTo(mapInstance.current);
      }
    }
  }, [position.location?.lat, position.location?.lng]);

  useEffect(() => {
    return () => {
      if (mapInstance.current) {
        mapInstance.current.remove();
        mapInstance.current = null;
        markerInstance.current = null;
      }
    };
  }, []); // Run only on mount

  return <div ref={mapRef} className="h-full w-full z-0" />;
}

const Profile = () => {
  const [orders, setOrders] = useState([]);
  const [orderFilter, setOrderFilter] = useState('All');
  const [dateFilter, setDateFilter] = useState('All Time');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [loading, setLoading] = useState(true);
  const [expandedOrderId, setExpandedOrderId] = useState(null);
  const { user, logout, setCredentials } = useAuthStore();
  const { showToast } = useUIStore();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const orderRefs = useRef({});
  
  const [isEditing, setIsEditing] = useState(false);
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [newAddress, setNewAddress] = useState({ street: '', city: '', state: '', postalCode: '', country: 'India', location: { lat: 17.3850, lng: 78.4867 } });
  
  const [formData, setFormData] = useState({
    name: user?.name || '',
    phone: user?.phone || '',
    password: ''
  });

  const [addresses, setAddresses] = useState([]);

  useEffect(() => {
    const fetchProfileData = async () => {
      try {
        const [ordersRes, userRes] = await Promise.all([
          api.get('/orders/myorders'),
          api.get('/users/profile')
        ]);
        setOrders(ordersRes.data);
        setAddresses(userRes.data.savedAddresses || []);
        
        // Sync user state with backend to get customerId
        setCredentials(userRes.data, useAuthStore.getState().token);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };
    fetchProfileData();
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
      
      // Clean up URL without triggering reload
      setSearchParams(new URLSearchParams());
    }
  }, [searchParams, loading, orders, setSearchParams]);

  const { socket } = useSocketStore();
  
  useEffect(() => {
    if (socket) {
      const handleOrderModified = (updatedOrder) => {
        setOrders(prev => prev.map(o => o._id === updatedOrder._id ? updatedOrder : o));
        
        // Show notification with the latest modification reason
        if (updatedOrder.modificationLogs && updatedOrder.modificationLogs.length > 0) {
          const latestLog = updatedOrder.modificationLogs[updatedOrder.modificationLogs.length - 1];
          showToast(`Order Modified: ${latestLog.reason}`, 'info');
        } else {
          showToast(`Order #${updatedOrder.orderId || updatedOrder._id.substring(18)} was modified`, 'info');
        }
      };
      
      const handleOrderUpdated = (updatedOrder) => {
        setOrders(prev => prev.map(o => o._id === updatedOrder._id ? updatedOrder : o));
        showToast(`Order status updated to ${updatedOrder.status}`, 'info');
      };

      const handleOrderCancelled = (updatedOrder) => {
        setOrders(prev => prev.map(o => o._id === updatedOrder._id ? updatedOrder : o));
        showToast(`Order has been Cancelled`, 'error');
      };
      
      socket.on('order-modified', handleOrderModified);
      socket.on('order-updated', handleOrderUpdated);
      socket.on('order-cancelled', handleOrderCancelled);
      return () => {
        socket.off('order-modified', handleOrderModified);
        socket.off('order-updated', handleOrderUpdated);
        socket.off('order-cancelled', handleOrderCancelled);
      };
    }
  }, [socket, showToast]);

  useEffect(() => {
    if (startDate && endDate && new Date(endDate) < new Date(startDate)) {
      showToast('To Date cannot be before From Date', 'error');
      setEndDate('');
    }
  }, [startDate, endDate, showToast]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleCancelOrder = async (orderId) => {
    if (window.confirm('Are you sure you want to cancel this order?')) {
      try {
        await api.put(`/orders/${orderId}/cancel`, { reason: 'Cancelled by Customer' });
        showToast('Order cancelled successfully', 'success');
        setOrders(prev => prev.map(o => o._id === orderId ? { ...o, status: 'Cancelled', cancelReason: 'Cancelled by Customer' } : o));
      } catch (error) {
        showToast(error.response?.data?.message || 'Failed to cancel order', 'error');
      }
    }
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    try {
      const updateData = { name: formData.name, phone: formData.phone };
      if (formData.password) {
        updateData.password = formData.password;
      }
      const { data } = await api.put('/users/profile', updateData);
      setCredentials(data, useAuthStore.getState().token);
      setIsEditing(false);
      setFormData(prev => ({ ...prev, password: '' }));
      showToast('Profile updated successfully', 'success');
    } catch (error) {
      console.error(error);
      showToast('Failed to update profile', 'error');
    }
  };

  const [editingAddressIndex, setEditingAddressIndex] = useState(null);

  const handleAddAddress = async (e) => {
    e.preventDefault();
    try {
      const payload = { address: newAddress };
      if (editingAddressIndex !== null) {
        payload.addressIndex = editingAddressIndex;
      }
      
      const { data } = await api.put('/users/profile', payload);
      setCredentials(data, useAuthStore.getState().token);
      setAddresses(data.savedAddresses);
      setShowAddressForm(false);
      setEditingAddressIndex(null);
      setNewAddress({ street: '', city: '', state: '', postalCode: '', country: 'India', location: { lat: 17.3850, lng: 78.4867 } });
      showToast('Address saved successfully', 'success');
    } catch (error) {
      console.error(error);
      showToast('Failed to add address', 'error');
    }
  };

  const handleUseCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(async (position) => {
        const { latitude, longitude } = position.coords;
        setNewAddress(prev => ({ ...prev, location: { lat: latitude, lng: longitude } }));
        
        try {
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`);
          const data = await res.json();
          if (data && data.address) {
            setNewAddress(prev => ({
              ...prev,
              street: data.address.road || data.address.suburb || data.address.neighbourhood || prev.street,
              city: data.address.city || data.address.town || data.address.village || data.address.county || prev.city,
              state: data.address.state || prev.state,
              postalCode: data.address.postcode || prev.postalCode,
              location: { lat: latitude, lng: longitude }
            }));
            showToast('Location fetched and address autofilled', 'success');
          }
        } catch (error) {
          console.error("Reverse geocoding failed", error);
          showToast('Location pinned. Please fill the address manually.', 'success');
        }
      }, (error) => {
        console.error(error);
        showToast('Please enable location permissions in your browser', 'error');
      });
    } else {
      showToast('Geolocation is not supported by this browser', 'error');
    }
  };

  const handleEditAddress = (addr, index) => {
    setNewAddress(addr);
    setEditingAddressIndex(index);
    setShowAddressForm(true);
  };

  const handleDeleteAddress = async (index) => {
    if(!window.confirm('Are you sure you want to delete this address?')) return;
    try {
      const { data } = await api.put('/users/profile', { deleteAddressIndex: index });
      setCredentials(data, useAuthStore.getState().token);
      setAddresses(data.savedAddresses);
      showToast('Address deleted successfully', 'success');
    } catch (error) {
      console.error(error);
      showToast('Failed to delete address', 'error');
    }
  };

  const handleSetDefaultAddress = async (index) => {
    try {
      const { data } = await api.put('/users/profile', { setDefaultAddressIndex: index });
      setCredentials(data, useAuthStore.getState().token);
      setAddresses(data.savedAddresses);
      showToast('Default address updated', 'success');
    } catch (error) {
      console.error(error);
      showToast('Failed to update default address', 'error');
    }
  };

  if (loading) return (
    <div className="flex justify-center items-center min-h-[50vh]">
      <div className="animate-spin w-12 h-12 border-4 border-primary-500 border-t-transparent rounded-full shadow-md"></div>
    </div>
  );

  return (
    <motion.div 
      initial="initial"
      animate="animate"
      variants={staggerContainer}
      className="max-w-4xl mx-auto space-y-8 pb-24 lg:pb-12"
    >
      {/* Profile Header */}
      <motion.div variants={fadeUp} className="glass dark:bg-dark-800 p-8 rounded-3xl shadow-sm border border-gray-100 dark:border-dark-700 transition-colors">
        <div className="flex flex-col md:flex-row items-start md:items-center md:justify-between mb-8">
          <div className="flex items-center mb-6 md:mb-0">
            <div className="w-24 h-24 bg-gradient-to-br from-primary-400 to-primary-600 text-white rounded-full flex items-center justify-center text-4xl font-black mr-6 shadow-lg shadow-primary-500/30">
              {user?.name?.charAt(0)}
            </div>
            <div>
              <h1 className="text-3xl font-black text-gray-900 dark:text-white tracking-tight">{user?.name}</h1>
              <p className="text-gray-500 dark:text-gray-400 font-medium mb-1">{user?.phone}</p>
              <p className="text-sm font-bold text-primary-600 dark:text-primary-400 tracking-wide">
                ID: {user?.customerId || 'Pending Generation'}
              </p>
            </div>
          </div>
          <div className="flex gap-4 w-full md:w-auto">
            <button 
              onClick={() => setIsEditing(!isEditing)}
              className="flex-1 md:flex-none flex justify-center items-center bg-gray-100 dark:bg-dark-700 text-gray-700 dark:text-gray-200 px-6 py-3 rounded-2xl font-bold hover:bg-gray-200 dark:hover:bg-dark-600 transition shadow-sm"
            >
              <Settings size={18} className="mr-2" />
              {isEditing ? 'Cancel Edit' : 'Edit Profile'}
            </button>
            <button 
              onClick={handleLogout}
              className="flex-1 md:flex-none flex justify-center items-center text-red-500 bg-red-50 dark:bg-red-900/20 px-6 py-3 rounded-2xl font-bold hover:bg-red-100 dark:hover:bg-red-900/40 transition shadow-sm"
            >
              <LogOut size={18} className="mr-2" />
              Logout
            </button>
          </div>
        </div>

        <AnimatePresence>
          {isEditing && (
            <motion.form 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              onSubmit={handleUpdateProfile} 
              className="bg-gray-50 dark:bg-dark-900 p-6 md:p-8 rounded-2xl border border-gray-100 dark:border-dark-700 space-y-4 shadow-inner overflow-hidden"
            >
              <h3 className="font-bold text-gray-800 dark:text-gray-200 mb-4 text-lg">Update Details</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Full Name</label>
                  <input type="text" required className="w-full px-4 py-3 bg-white dark:bg-dark-800 border-2 border-gray-200 dark:border-dark-700 rounded-xl focus:ring-4 focus:ring-primary-500/20 focus:border-primary-500 font-medium text-gray-900 dark:text-white transition-all" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Phone Number</label>
                  <input type="text" pattern="\d{10}" maxLength="10" required className="w-full px-4 py-3 bg-white dark:bg-dark-800 border-2 border-gray-200 dark:border-dark-700 rounded-xl focus:ring-4 focus:ring-primary-500/20 focus:border-primary-500 font-medium text-gray-900 dark:text-white transition-all" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value.replace(/\D/g, '')})} />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">New Password <span className="text-gray-400 dark:text-gray-500 font-medium ml-1">(Leave blank to keep current)</span></label>
                  <input type="password" minLength="6" className="w-full px-4 py-3 bg-white dark:bg-dark-800 border-2 border-gray-200 dark:border-dark-700 rounded-xl focus:ring-4 focus:ring-primary-500/20 focus:border-primary-500 font-medium text-gray-900 dark:text-white transition-all" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} />
                </div>
              </div>
              <div className="flex justify-end pt-4 mt-4 border-t border-gray-200 dark:border-dark-700">
                <button type="submit" className="bg-primary-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-primary-500 transition shadow-md shadow-primary-500/30">Save Changes</button>
              </div>
            </motion.form>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Saved Addresses Section */}
      <motion.div variants={fadeUp} className="glass dark:bg-dark-800 p-8 rounded-3xl shadow-sm border border-gray-100 dark:border-dark-700 transition-colors">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 gap-4">
          <h2 className="text-2xl font-black text-gray-900 dark:text-white flex items-center tracking-tight">
            <div className="w-10 h-10 bg-blue-50 dark:bg-blue-900/30 rounded-full flex items-center justify-center mr-3 shadow-inner">
              <MapPin className="text-blue-600 dark:text-blue-400" size={20} />
            </div>
            Saved Addresses
          </h2>
          <button 
            onClick={() => {
              if (showAddressForm) {
                setShowAddressForm(false);
              } else {
                setEditingAddressIndex(null);
                setNewAddress({ street: '', city: '', state: '', postalCode: '', country: 'India', location: { lat: 17.3850, lng: 78.4867 } });
                setShowAddressForm(true);
              }
            }}
            className="flex items-center w-full sm:w-auto justify-center text-sm font-bold text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 bg-primary-50 dark:bg-primary-900/20 px-5 py-3 rounded-xl shadow-sm transition-all"
          >
            {showAddressForm ? 'Cancel' : <><Plus size={18} className="mr-1" /> Add Address</>}
          </button>
        </div>

        <AnimatePresence>
          {showAddressForm && (
            <motion.form 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              onSubmit={handleAddAddress} 
              className="mb-8 p-6 md:p-8 bg-gray-50 dark:bg-dark-900 rounded-2xl border border-gray-200 dark:border-dark-700 space-y-4 shadow-inner overflow-hidden"
            >
              <h3 className="font-bold text-gray-800 dark:text-gray-200 mb-6 text-lg">{editingAddressIndex !== null ? 'Edit Address' : 'Add New Delivery Address'}</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="md:col-span-2">
                  <input type="text" required placeholder="Street Address" className="w-full px-4 py-3 bg-white dark:bg-dark-800 border-2 border-gray-200 dark:border-dark-700 rounded-xl focus:ring-4 focus:ring-primary-500/20 focus:border-primary-500 text-gray-900 dark:text-white transition-all font-medium" value={newAddress.street} onChange={e => setNewAddress({...newAddress, street: e.target.value})} />
                </div>
                <div>
                  <input type="text" required placeholder="City" className="w-full px-4 py-3 bg-white dark:bg-dark-800 border-2 border-gray-200 dark:border-dark-700 rounded-xl focus:ring-4 focus:ring-primary-500/20 focus:border-primary-500 text-gray-900 dark:text-white transition-all font-medium" value={newAddress.city} onChange={e => setNewAddress({...newAddress, city: e.target.value})} />
                </div>
                <div>
                  <input type="text" required placeholder="State" className="w-full px-4 py-3 bg-white dark:bg-dark-800 border-2 border-gray-200 dark:border-dark-700 rounded-xl focus:ring-4 focus:ring-primary-500/20 focus:border-primary-500 text-gray-900 dark:text-white transition-all font-medium" value={newAddress.state} onChange={e => setNewAddress({...newAddress, state: e.target.value})} />
                </div>
                <div>
                  <input type="text" required placeholder="Postal/ZIP Code" className="w-full px-4 py-3 bg-white dark:bg-dark-800 border-2 border-gray-200 dark:border-dark-700 rounded-xl focus:ring-4 focus:ring-primary-500/20 focus:border-primary-500 text-gray-900 dark:text-white transition-all font-medium" value={newAddress.postalCode} onChange={e => setNewAddress({...newAddress, postalCode: e.target.value})} />
                </div>
              </div>
              
              <div className="mt-6">
                <div className="flex justify-between items-center mb-3">
                  <label className="block text-sm font-bold text-gray-700 dark:text-gray-300">Pin Location on Map</label>
                  <button type="button" onClick={handleUseCurrentLocation} className="text-sm font-bold text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 flex items-center bg-primary-50 dark:bg-primary-900/20 px-3 py-1.5 rounded-lg transition-colors">
                    <MapPin size={14} className="mr-1" /> Use Current Location
                  </button>
                </div>
                <div className="h-72 rounded-2xl overflow-hidden border-2 border-gray-200 dark:border-dark-700 relative z-0 shadow-inner">
                  <LocationPicker position={newAddress} setPosition={setNewAddress} />
                </div>
                <p className="text-xs font-medium text-primary-600 dark:text-primary-400 mt-3 flex items-center">
                  <MapPin size={14} className="mr-1" /> Click on the map to accurately pin your delivery location.
                </p>
              </div>
              
              <div className="flex justify-end pt-6 mt-6 border-t border-gray-200 dark:border-dark-700">
                <button type="submit" className="px-8 py-3 bg-primary-600 text-white rounded-xl font-bold hover:bg-primary-500 transition shadow-md shadow-primary-500/30">Save Address</button>
              </div>
            </motion.form>
          )}
        </AnimatePresence>

        {addresses.length === 0 && !showAddressForm ? (
          <div className="text-center p-8 bg-yellow-50 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-500 rounded-2xl font-medium border border-yellow-100 dark:border-yellow-900/50 border-dashed">
            You don't have any saved addresses yet.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {addresses.map((addr, index) => (
              <div key={index} className={`p-6 rounded-2xl border-2 ${addr.isDefault ? 'border-primary-500 bg-primary-50/50 dark:bg-primary-900/20 shadow-md shadow-primary-500/10' : 'border-gray-200 dark:border-dark-700 bg-white dark:bg-dark-800 hover:border-primary-300 dark:hover:border-primary-700'} transition-all duration-300 relative group flex flex-col h-full`}>
                {addr.isDefault && <span className="absolute top-4 left-4 bg-primary-100 dark:bg-primary-900/50 text-primary-700 dark:text-primary-300 text-xs font-black uppercase tracking-wider px-3 py-1 rounded-full shadow-sm">Default</span>}
                
                <div className={`flex-1 ${addr.isDefault ? "mt-8" : ""}`}>
                  <p className="font-bold text-gray-900 dark:text-white mb-2 text-lg leading-tight pr-8">{addr.street}</p>
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{addr.city}, {addr.state} {addr.postalCode}</p>
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mt-1">{addr.country}</p>
                </div>
                
                <div className="absolute top-4 right-4 flex space-x-3 opacity-0 group-hover:opacity-100 transition-opacity bg-white/90 dark:bg-dark-800/90 backdrop-blur-sm p-1.5 rounded-lg shadow-sm border border-gray-100 dark:border-dark-700">
                  <button 
                    onClick={() => handleEditAddress(addr, index)}
                    className="text-primary-600 hover:text-primary-800 dark:text-primary-400 dark:hover:text-primary-300 text-sm font-bold px-2 py-1"
                  >
                    Edit
                  </button>
                  <button 
                    onClick={() => handleDeleteAddress(index)}
                    className="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 text-sm font-bold px-2 py-1"
                  >
                    Delete
                  </button>
                </div>
                
                {!addr.isDefault && (
                  <button 
                    onClick={() => handleSetDefaultAddress(index)}
                    className="mt-6 w-full text-center text-sm text-gray-600 dark:text-gray-300 hover:text-primary-600 dark:hover:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/20 font-bold py-3 border-2 border-gray-200 dark:border-dark-600 rounded-xl transition-colors"
                  >
                    Set as Default
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </motion.div>

      <motion.h2 variants={fadeUp} className="text-2xl font-black text-gray-900 dark:text-white flex items-center tracking-tight pt-4">
        <div className="w-10 h-10 bg-purple-50 dark:bg-purple-900/30 rounded-full flex items-center justify-center mr-3 shadow-inner">
          <Package className="text-purple-600 dark:text-purple-400" size={20} />
        </div>
        Order History
      </motion.h2>

      <div className="flex flex-wrap items-center justify-end gap-2 mb-4">
        <select
          value={orderFilter}
          onChange={(e) => setOrderFilter(e.target.value)}
          className="px-4 py-2 border-2 border-gray-200 dark:border-dark-700 rounded-xl bg-white dark:bg-dark-800 text-gray-800 dark:text-white focus:ring-primary-500 font-medium"
        >
          <option value="All">All Orders</option>
          <option value="Pending">Pending</option>
          <option value="Out for Delivery">Out for Delivery</option>
          <option value="Completed">Completed</option>
          <option value="Delivered">Delivered</option>
          <option value="Cancelled">Cancelled</option>
        </select>
        <select
          value={dateFilter}
          onChange={(e) => setDateFilter(e.target.value)}
          className="px-4 py-2 border-2 border-gray-200 dark:border-dark-700 rounded-xl bg-white dark:bg-dark-800 text-gray-800 dark:text-white focus:ring-primary-500 font-medium"
        >
          <option value="All Time">All Time</option>
          <option value="Today">Today</option>
          <option value="Last 7 Days">Last 7 Days</option>
          <option value="This Month">This Month</option>
          <option value="Custom Range">Custom Range</option>
        </select>
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
                className="px-3 py-2 border-2 border-gray-200 dark:border-dark-700 rounded-xl bg-white dark:bg-dark-800 text-gray-800 dark:text-white focus:ring-primary-500 font-medium" 
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
                className="px-3 py-2 border-2 border-gray-200 dark:border-dark-700 rounded-xl bg-white dark:bg-dark-800 text-gray-800 dark:text-white focus:ring-primary-500 font-medium" 
              />
            </div>
            {startDate && endDate && new Date(startDate) > new Date(endDate) && (
              <span className="text-red-500 text-xs font-bold px-1">To date cannot be before From date.</span>
            )}
          </div>
        )}
      </div>

      {orders.length === 0 ? (
        <motion.div variants={fadeUp} className="glass dark:bg-dark-800 p-12 rounded-3xl shadow-sm border border-gray-100 dark:border-dark-700 text-center">
          <div className="w-24 h-24 bg-gray-50 dark:bg-dark-900 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner border border-gray-100 dark:border-dark-700">
            <Package size={48} className="text-gray-300 dark:text-gray-600" />
          </div>
          <h3 className="text-2xl font-black text-gray-800 dark:text-gray-200 mb-3 tracking-tight">No orders yet</h3>
          <p className="text-gray-500 dark:text-gray-400 mb-8 font-medium">You haven't placed any orders with us yet.</p>
          <button onClick={() => navigate('/')} className="bg-primary-600 text-white px-8 py-3 rounded-2xl font-bold hover:bg-primary-500 transition shadow-lg shadow-primary-500/30">
            Start Shopping
          </button>
        </motion.div>
      ) : (
        <div className="space-y-8">
          {orders.filter(o => {
            let match = true;
            if (orderFilter !== 'All' && o.status !== orderFilter) match = false;
            if (dateFilter !== 'All Time') {
              const orderDate = new Date(o.createdAt);
              const now = new Date();
              if (dateFilter === 'Today') {
                match = match && orderDate.toDateString() === now.toDateString();
              } else if (dateFilter === 'Last 7 Days') {
                const last7 = new Date(now);
                last7.setDate(last7.getDate() - 7);
                match = match && orderDate >= last7;
              } else if (dateFilter === 'This Month') {
                match = match && orderDate.getMonth() === now.getMonth() && orderDate.getFullYear() === now.getFullYear();
              } else if (dateFilter === 'Custom Range') {
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
              }
            }
            return match;
          }).map((order) => {
            const isExpanded = expandedOrderId === order._id;
            return (
            <motion.div 
              variants={fadeUp} 
              key={order._id} 
              ref={(el) => orderRefs.current[order._id] = el}
              className={`glass dark:bg-dark-800 rounded-3xl shadow-sm border ${isExpanded ? 'border-primary-500 ring-2 ring-primary-500/20' : 'border-gray-100 dark:border-dark-700'} overflow-hidden transition-all duration-300`}
            >
              <div 
                className={`p-6 md:p-8 cursor-pointer transition-colors ${isExpanded ? 'bg-primary-50/50 dark:bg-primary-900/10 border-b border-primary-100 dark:border-primary-900/30' : 'bg-gray-50/50 dark:bg-dark-800/50 border-b border-gray-100 dark:border-dark-700 hover:bg-gray-100/50 dark:hover:bg-dark-700/50'} flex flex-col sm:flex-row sm:items-center justify-between`}
                onClick={() => setExpandedOrderId(isExpanded ? null : order._id)}
              >
                <div>
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1.5 flex items-center">
                    <Clock size={14} className="mr-1" />
                    Placed on {new Date(order.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}
                  </p>
                  <p className="text-xl font-black text-gray-900 dark:text-white tracking-tight flex items-center">
                    {order.orderId || `Order #${order._id.substring(18)}`}
                    <ChevronRight size={20} className={`ml-2 text-gray-400 transition-transform duration-300 ${isExpanded ? 'rotate-90' : ''}`} />
                  </p>
                </div>
                <div className="mt-4 sm:mt-0 sm:text-right flex flex-col sm:items-end">
                  <p className="font-black text-primary-600 dark:text-primary-400 text-2xl mb-2">₹{order.totalAmount}</p>
                  <span className={`inline-flex items-center px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-widest shadow-sm
                    ${order.status === 'Pending' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400 border border-yellow-200 dark:border-yellow-800/50' : 
                      order.status === 'Completed' || order.status === 'Delivered' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border border-green-200 dark:border-green-800/50' : 
                      order.status === 'Cancelled' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border border-red-200 dark:border-red-800/50' :
                      'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border border-blue-200 dark:border-blue-800/50'}`}>
                    {order.status === 'Delivered' ? <CheckCircle size={14} className="mr-1" /> : null}
                    {order.status === 'Cancelled' ? <XCircle size={14} className="mr-1" /> : null}
                    {order.status}
                  </span>
                </div>
              </div>
              
              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
              
              {order.status === 'Cancelled' && order.cancelReason && (
                <div className="bg-red-50 dark:bg-red-900/20 px-6 md:px-8 py-4 border-b border-red-100 dark:border-red-900/50">
                  <p className="text-sm font-medium text-red-700 dark:text-red-400 flex items-start">
                    <span className="font-bold mr-2 mt-0.5 whitespace-nowrap">Cancellation Reason:</span> 
                    {order.cancelReason}
                  </p>
                </div>
              )}

              {order.modificationLogs && order.modificationLogs.length > 0 && (
                <div className="bg-blue-50 dark:bg-blue-900/20 px-6 md:px-8 py-5 border-b border-blue-100 dark:border-blue-900/50">
                  <p className="text-sm font-bold text-blue-800 dark:text-blue-300 mb-3 tracking-wide">Order Modifications History</p>
                  <ul className="text-sm font-medium text-blue-700 dark:text-blue-400 space-y-4">
                    {order.modificationLogs.map((log, idx) => {
                      const changes = [];
                      if (log.previousSnapshot && log.newSnapshot) {
                        if (log.previousSnapshot.totalAmount !== log.newSnapshot.totalAmount) {
                          changes.push(`Total Amount: ₹${log.previousSnapshot.totalAmount} → ₹${log.newSnapshot.totalAmount}`);
                        }
                        const oldMap = {}; (log.previousSnapshot.orderItems || []).forEach(i => oldMap[i.product] = i);
                        const newMap = {}; (log.newSnapshot.orderItems || []).forEach(i => newMap[i.product] = i);
                        for (let id in newMap) {
                          if (!oldMap[id]) changes.push(`Added item: ${newMap[id].name} (x${newMap[id].quantity})`);
                          else if (oldMap[id].quantity !== newMap[id].quantity) changes.push(`Updated ${newMap[id].name}: x${oldMap[id].quantity} → x${newMap[id].quantity}`);
                        }
                        for (let id in oldMap) {
                          if (!newMap[id]) changes.push(`Removed item: ${oldMap[id].name}`);
                        }
                      }
                      
                      return (
                        <li key={idx} className="pb-4 border-b border-blue-200 dark:border-blue-800/50 last:border-0 last:pb-0 bg-white/50 dark:bg-dark-800/50 p-4 rounded-xl">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-2">
                            <span className="font-bold text-gray-900 dark:text-white mb-1 sm:mb-0">Reason: {log.reason}</span>
                            <span className="text-xs font-bold bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-300 px-2 py-1 rounded">{new Date(log.timestamp).toLocaleDateString()}</span>
                          </div>
                          {changes.length > 0 && (
                            <ul className="list-none space-y-1 mt-2">
                              {changes.map((c, i) => (
                                <li key={i} className="flex items-start text-xs sm:text-sm">
                                  <ChevronRight size={14} className="mr-1 mt-0.5 text-blue-400 shrink-0" />
                                  <span className="text-gray-700 dark:text-gray-300">{c}</span>
                                </li>
                              ))}
                            </ul>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}
              
              <div className="p-6 md:p-8 grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-12">
                <div>
                  <h4 className="text-lg font-black text-gray-900 dark:text-white mb-4 tracking-tight border-b border-gray-100 dark:border-dark-700 pb-2">Order Items</h4>
                  <ul className="space-y-3">
                    {order.orderItems.map((item, idx) => (
                      <li key={idx} className="flex justify-between items-center text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-dark-900 p-3 rounded-xl border border-gray-100 dark:border-dark-700">
                        <div className="flex items-center">
                          <span className="font-black text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-900/30 px-2 py-0.5 rounded mr-3 shadow-sm">{item.quantity}x</span> 
                          <span className="truncate max-w-[150px] sm:max-w-[200px]">{item.name}</span>
                        </div>
                        <span className="font-black text-gray-900 dark:text-white">₹{item.price * item.quantity}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                
                <div className="flex flex-col h-full">
                  <div className="bg-gray-50 dark:bg-dark-900 p-5 md:p-6 rounded-2xl border border-gray-100 dark:border-dark-700 flex-1 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-primary-500/5 rounded-full blur-2xl transform translate-x-1/2 -translate-y-1/2"></div>
                    <h4 className="font-black text-gray-900 dark:text-white mb-4 flex items-center tracking-tight border-b border-gray-200 dark:border-dark-700 pb-2 relative z-10">
                      <MapPin size={18} className="mr-2 text-primary-600 dark:text-primary-400" /> Delivery Address
                    </h4>
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400 leading-relaxed relative z-10">
                      <span className="font-bold text-gray-800 dark:text-gray-200 block mb-1">{order.deliveryAddress?.street}</span>
                      {order.deliveryAddress?.city}, {order.deliveryAddress?.state}<br/>
                      {order.deliveryAddress?.postalCode}
                    </p>
                    
                    {order.deliveryOTP && order.status === 'Delivered' && (
                      <div className="mt-6 p-4 bg-white dark:bg-dark-800 rounded-xl border-2 border-primary-100 dark:border-primary-900/50 text-center shadow-sm relative z-10">
                        <p className="text-xs text-gray-500 dark:text-gray-400 font-bold uppercase tracking-widest mb-2">Delivery OTP Confirmed</p>
                        <p className="text-3xl font-black text-primary-600 dark:text-primary-400 tracking-[0.25em] drop-shadow-sm">{order.deliveryOTP}</p>
                      </div>
                    )}
                  </div>

                  <div className="mt-4 space-y-3">
                    {(order.status === 'Assigned' || order.status === 'Out for Delivery') && (
                      <button 
                        onClick={() => navigate(`/track/${order._id}`)}
                        className="w-full bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400 font-bold py-3.5 rounded-xl border-2 border-primary-100 dark:border-primary-900/50 hover:bg-primary-100 dark:hover:bg-primary-900/40 transition-colors shadow-sm flex items-center justify-center"
                      >
                        <MapPin size={18} className="mr-2" /> Track Order Live
                      </button>
                    )}

                    {['Pending', 'Assigned'].includes(order.status) && (
                      <button 
                        onClick={() => handleCancelOrder(order._id)}
                        className="w-full text-red-500 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 font-bold text-sm py-3 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/40 border-2 border-red-100 dark:border-red-900/50 rounded-xl transition-colors shadow-sm flex items-center justify-center"
                      >
                        <XCircle size={16} className="mr-2" /> Cancel Order
                      </button>
                    )}
                  </div>
                </div>
              </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )})}
        </div>
      )}
    </motion.div>
  );
};

export default Profile;
