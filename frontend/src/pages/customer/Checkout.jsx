import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { MapPin, Truck, CheckCircle, Plus } from 'lucide-react';
import React, { useRef } from 'react';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { useUIStore } from '../../store/uiStore';
import { useAuthStore } from '../../store/authStore';
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

const Checkout = () => {
  const [cart, setCart] = useState({ items: [] });
  const [addresses, setAddresses] = useState([]);
  const [selectedAddress, setSelectedAddress] = useState(null);
  const [loading, setLoading] = useState(true);
  const [orderPlaced, setOrderPlaced] = useState(false);
  const [newAddress, setNewAddress] = useState({ street: '', city: '', state: '', postalCode: '', country: 'India', location: { lat: 17.3850, lng: 78.4867 } });
  const [showAddressForm, setShowAddressForm] = useState(false);
  
  const navigate = useNavigate();
  const { showToast } = useUIStore();
  const { setCredentials } = useAuthStore();

  useEffect(() => {
    const fetchCheckoutData = async () => {
      try {
        const [cartRes, userRes] = await Promise.all([
          api.get('/cart'),
          api.get('/users/profile')
        ]);
        
        setCart(cartRes.data);
        setAddresses(userRes.data.savedAddresses || []);
        
        if (userRes.data.savedAddresses?.length > 0) {
          const defaultAddr = userRes.data.savedAddresses.find(a => a.isDefault);
          setSelectedAddress(defaultAddr || userRes.data.savedAddresses[0]);
        } else {
          setShowAddressForm(true);
        }
        
        if (cartRes.data.items.length === 0) {
          navigate('/cart');
        }
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };

    fetchCheckoutData();
  }, [navigate]);

  const handleAddAddress = async (e) => {
    e.preventDefault();
    try {
      const { data } = await api.put('/users/profile', { address: newAddress });
      setCredentials({ user: data, token: localStorage.getItem('token') });
      setAddresses(data.savedAddresses);
      setSelectedAddress(data.savedAddresses[data.savedAddresses.length - 1]);
      setShowAddressForm(false);
      setNewAddress({ street: '', city: '', state: '', postalCode: '', country: 'India', location: { lat: 17.3850, lng: 78.4867 } });
      showToast('Address added successfully', 'success');
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

  const calculateTotal = () => {
    return cart.items.reduce((total, item) => {
      const priceToUse = item.product.discountPrice > 0 ? item.product.discountPrice : item.product.price;
      return total + (priceToUse * item.quantity);
    }, 0);
  };

  const handlePlaceOrder = async () => {
    if (!selectedAddress) {
      showToast('Please select a delivery address', 'error');
      return;
    }

    try {
      const orderItems = cart.items.map(item => ({
        name: item.product.name,
        quantity: item.quantity,
        price: item.product.discountPrice > 0 ? item.product.discountPrice : item.product.price,
        product: item.product._id
      }));

      await api.post('/orders', {
        orderItems,
        deliveryAddress: selectedAddress,
        paymentMethod: 'COD',
        totalAmount: calculateTotal()
      });

      setOrderPlaced(true);
      showToast('Order placed successfully!', 'success');
      
      setTimeout(() => {
        navigate('/');
      }, 3000);

    } catch (error) {
      console.error(error);
      showToast('Failed to place order', 'error');
    }
  };

  if (loading) return (
    <div className="flex justify-center items-center min-h-[50vh]">
      <div className="animate-spin w-12 h-12 border-4 border-primary-500 border-t-transparent rounded-full shadow-md"></div>
    </div>
  );

  if (orderPlaced) {
    return (
      <motion.div 
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="max-w-xl mx-auto mt-20 glass dark:bg-dark-800 p-12 rounded-[3rem] shadow-xl border border-green-100 dark:border-green-900/30 text-center relative overflow-hidden"
      >
        <div className="absolute top-0 right-0 w-64 h-64 bg-green-400/20 rounded-full filter blur-3xl transform translate-x-1/2 -translate-y-1/2"></div>
        <div className="relative z-10">
          <div className="w-28 h-28 bg-gradient-to-tr from-green-400 to-green-500 text-white rounded-full flex items-center justify-center mx-auto mb-8 shadow-lg shadow-green-500/40">
            <CheckCircle size={56} />
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-gray-900 dark:text-white mb-4 tracking-tight">Order Placed! 🎉</h1>
          <p className="text-gray-600 dark:text-gray-300 mb-10 text-lg font-medium leading-relaxed">Thank you for shopping with Lalitha Mart. Your fresh groceries will be delivered soon.</p>
          <button onClick={() => navigate('/profile')} className="bg-primary-600 text-white px-8 py-4 rounded-2xl font-bold hover:bg-primary-500 transition shadow-lg shadow-primary-500/30 w-full sm:w-auto">
            View Order History
          </button>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div 
      initial="initial"
      animate="animate"
      variants={staggerContainer}
      className="max-w-5xl mx-auto pb-24 lg:pb-12"
    >
      <motion.h1 variants={fadeUp} className="text-3xl font-black text-gray-900 dark:text-white mb-8 tracking-tight">Checkout</motion.h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <motion.div variants={fadeUp} className="lg:col-span-2 space-y-6">
          
          {/* Delivery Address Section */}
          <div className="glass dark:bg-dark-800 p-6 sm:p-8 rounded-3xl shadow-sm border border-gray-100 dark:border-dark-700 transition-colors">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100 flex items-center">
                <div className="w-10 h-10 bg-primary-50 dark:bg-primary-900/30 rounded-full flex items-center justify-center mr-3 shadow-inner">
                  <MapPin className="text-primary-600 dark:text-primary-400" size={20} />
                </div>
                Delivery Address
              </h2>
              <button 
                onClick={() => setShowAddressForm(!showAddressForm)}
                className="text-sm font-bold text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 bg-primary-50 dark:bg-primary-900/20 px-4 py-2 rounded-xl transition-colors flex items-center shadow-sm"
              >
                <Plus size={16} className="mr-1" /> Add New
              </button>
            </div>

            <AnimatePresence>
              {showAddressForm && (
                <motion.form 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  onSubmit={handleAddAddress} 
                  className="mb-8 p-6 bg-gray-50 dark:bg-dark-900 rounded-2xl border border-gray-100 dark:border-dark-700 space-y-4 shadow-inner overflow-hidden"
                >
                  <h3 className="font-bold text-gray-800 dark:text-gray-200 mb-4">Add a new delivery address</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                      <input type="text" required placeholder="Postal/ZIP Code" className="w-full px-4 py-3 bg-white dark:bg-dark-800 border-2 border-gray-200 dark:border-dark-700 rounded-xl focus:ring-4 focus:ring-primary-500/20 focus:border-primary-500 text-gray-900 dark:text-white transition-all font-medium" value={newAddress.postalCode} onChange={e => setNewAddress({...newAddress, postalCode: e.target.value.replace(/\D/g, '')})} />
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
                  <div className="flex justify-end mt-6 pt-4 border-t border-gray-200 dark:border-dark-700 space-x-3">
                    <button type="button" onClick={() => setShowAddressForm(false)} className="px-6 py-3 text-gray-600 dark:text-gray-300 font-bold hover:bg-gray-200 dark:hover:bg-dark-700 rounded-xl transition">Cancel</button>
                    <button type="submit" className="px-6 py-3 bg-primary-600 text-white font-bold rounded-xl hover:bg-primary-500 transition shadow-md shadow-primary-500/30">Save Address</button>
                  </div>
                </motion.form>
              )}
            </AnimatePresence>

            {addresses.length === 0 && !showAddressForm ? (
              <div className="text-center p-8 bg-yellow-50 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-500 rounded-2xl font-medium border border-yellow-100 dark:border-yellow-900/50 border-dashed">
                Please add a delivery address to continue.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {addresses.map((addr, index) => (
                  <div 
                    key={index}
                    onClick={() => setSelectedAddress(addr)}
                    className={`cursor-pointer p-5 rounded-2xl border-2 transition-all duration-300 relative overflow-hidden group ${
                      selectedAddress?._id === addr._id ? 'border-primary-500 bg-primary-50/50 dark:bg-primary-900/20 shadow-md shadow-primary-500/10 scale-[1.02]' : 'border-gray-200 dark:border-dark-700 bg-white dark:bg-dark-800 hover:border-primary-300 dark:hover:border-primary-700'
                    }`}
                  >
                    {selectedAddress?._id === addr._id && (
                       <div className="absolute top-3 right-3 text-primary-600 dark:text-primary-400">
                          <CheckCircle size={20} className="drop-shadow-sm" />
                       </div>
                    )}
                    <p className="font-bold text-gray-900 dark:text-white mb-1 pr-6">{addr.street}</p>
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{addr.city}, {addr.state} {addr.postalCode}</p>
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mt-1">{addr.country}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Payment Method */}
          <div className="glass dark:bg-dark-800 p-6 sm:p-8 rounded-3xl shadow-sm border border-gray-100 dark:border-dark-700 transition-colors">
            <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100 flex items-center mb-6">
              <div className="w-10 h-10 bg-green-50 dark:bg-green-900/30 rounded-full flex items-center justify-center mr-3 shadow-inner">
                <Truck className="text-green-600 dark:text-green-400" size={20} />
              </div>
              Payment Method
            </h2>
            
            <div className="p-5 rounded-2xl border-2 border-primary-500 bg-primary-50 dark:bg-primary-900/20 shadow-sm flex items-center justify-between relative overflow-hidden">
              <div className="absolute right-0 top-0 w-32 h-32 bg-primary-500/10 rounded-full blur-2xl translate-x-1/2 -translate-y-1/2"></div>
              <div className="relative z-10">
                <p className="font-black text-gray-900 dark:text-white text-lg">Cash on Delivery (COD)</p>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mt-1">Pay with Cash or UPI when your order arrives.</p>
              </div>
              <div className="w-8 h-8 rounded-full bg-primary-600 text-white flex items-center justify-center shadow-md relative z-10">
                <CheckCircle size={16} />
              </div>
            </div>
          </div>
        </motion.div>

        {/* Order Summary Sidebar */}
        <motion.div variants={fadeUp} className="lg:col-span-1">
          <div className="glass dark:bg-dark-800 p-6 sm:p-8 rounded-3xl shadow-sm border border-gray-100 dark:border-dark-700 sticky top-24 transition-colors">
            <h2 className="text-xl font-black text-gray-900 dark:text-white mb-6 pb-4 border-b border-gray-100 dark:border-dark-700 tracking-tight">
              Order Items ({cart.items.reduce((a,b)=>a+b.quantity,0)})
            </h2>
            
            <div className="space-y-4 mb-6 max-h-60 overflow-y-auto pr-2 scrollbar-hide">
              {cart.items.map(item => (
                <div key={item._id} className="flex justify-between items-center text-sm bg-gray-50 dark:bg-dark-900 p-3 rounded-xl border border-gray-100 dark:border-dark-700">
                  <div className="flex items-center w-2/3">
                    <span className="font-black text-primary-600 dark:text-primary-400 w-6 bg-primary-50 dark:bg-primary-900/30 rounded flex justify-center py-0.5">{item.quantity}x</span>
                    <span className="font-bold text-gray-800 dark:text-gray-200 truncate ml-3">{item.product.name}</span>
                  </div>
                  <span className="font-black text-gray-900 dark:text-white">
                    ₹{((item.product.discountPrice > 0 ? item.product.discountPrice : item.product.price) * item.quantity).toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
            
            <div className="space-y-4 text-gray-600 dark:text-gray-300 font-medium mb-6 pt-6 border-t border-gray-100 dark:border-dark-700">
              <div className="flex justify-between items-center">
                <span>Subtotal</span>
                <span className="font-bold text-gray-900 dark:text-white">₹{calculateTotal().toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span>Delivery Fee</span>
                <span className="text-green-600 dark:text-green-400 font-bold bg-green-50 dark:bg-green-900/20 px-2 py-0.5 rounded-md text-sm">Free</span>
              </div>
            </div>
            
            <div className="flex justify-between items-center pt-6 border-t border-gray-100 dark:border-dark-700 mb-8">
              <span className="text-xl font-bold text-gray-800 dark:text-gray-200">Total</span>
              <span className="text-3xl font-black text-primary-600 dark:text-primary-400">₹{calculateTotal().toFixed(2)}</span>
            </div>
            
            <button 
              onClick={handlePlaceOrder}
              disabled={!selectedAddress}
              className={`w-full py-4 rounded-2xl font-black text-lg flex items-center justify-center transition-all duration-300
                ${selectedAddress ? 'bg-primary-600 text-white hover:bg-primary-500 shadow-lg shadow-primary-500/30' : 'bg-gray-200 dark:bg-dark-700 text-gray-400 dark:text-gray-500 cursor-not-allowed border border-gray-300 dark:border-dark-600'}`}
            >
              Place Order Now
            </button>
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
};

export default Checkout;
