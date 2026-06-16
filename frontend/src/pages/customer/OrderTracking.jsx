import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useSocketStore } from '../../store/socketStore';
import api from '../../services/api';
import { ArrowLeft, PhoneCall, Copy, MapPin, Truck, CheckCircle } from 'lucide-react';
import { useUIStore } from '../../store/uiStore';
import { motion } from 'framer-motion';
import { fadeUp, staggerContainer } from '../../animations/variants';

// Custom icons
const customerIcon = L.divIcon({
  className: 'custom-icon',
  html: `<div style="background-color: #ef4444; width: 24px; height: 24px; border-radius: 50%; border: 3px solid white; box-shadow: 0 0 8px rgba(239, 68, 68, 0.6);"></div>`,
  iconSize: [24, 24],
  iconAnchor: [12, 12]
});

const deliveryIcon = L.divIcon({
  className: 'custom-icon',
  html: `<div style="background-color: #3b82f6; width: 36px; height: 36px; border-radius: 50%; border: 3px solid white; box-shadow: 0 0 10px rgba(59, 130, 246, 0.6); display: flex; align-items: center; justify-content: center; font-size: 16px;">🛵</div>`,
  iconSize: [36, 36],
  iconAnchor: [18, 18]
});

function NativeTrackingMap({ customerLocation, partnerLocation }) {
  const mapRef = useRef(null);
  const mapInstance = useRef(null);
  const customerMarkerInstance = useRef(null);
  const partnerMarkerInstance = useRef(null);
  const polylineInstance = useRef(null);

  useEffect(() => {
    if (!mapRef.current) return;
    
    const centerLat = partnerLocation ? partnerLocation.lat : customerLocation.lat;
    const centerLng = partnerLocation ? partnerLocation.lng : customerLocation.lng;

    if (!mapInstance.current) {
      mapInstance.current = L.map(mapRef.current).setView([centerLat, centerLng], 14);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap'
      }).addTo(mapInstance.current);

      customerMarkerInstance.current = L.marker([customerLocation.lat, customerLocation.lng], { icon: customerIcon })
        .addTo(mapInstance.current)
        .bindPopup('<div style="font-weight: bold; font-family: sans-serif;">Delivery Address</div>');
    }

    if (partnerLocation) {
      if (partnerMarkerInstance.current) {
        partnerMarkerInstance.current.setLatLng([partnerLocation.lat, partnerLocation.lng]);
      } else {
        partnerMarkerInstance.current = L.marker([partnerLocation.lat, partnerLocation.lng], { icon: deliveryIcon })
          .addTo(mapInstance.current)
          .bindPopup('<div style="font-weight: bold; font-family: sans-serif; color: #3b82f6;">Delivery Partner</div>');
      }

      const linePoints = [
        [partnerLocation.lat, partnerLocation.lng],
        [customerLocation.lat, customerLocation.lng]
      ];

      if (polylineInstance.current) {
        polylineInstance.current.setLatLngs(linePoints);
      } else {
        polylineInstance.current = L.polyline(linePoints, { color: '#3b82f6', dashArray: '5, 10', weight: 4 }).addTo(mapInstance.current);
      }
    }
  }, [customerLocation, partnerLocation]);

  useEffect(() => {
    return () => {
      if (mapInstance.current) {
        mapInstance.current.remove();
        mapInstance.current = null;
      }
    };
  }, []);

  return <div ref={mapRef} className="w-full h-full" />;
}

const OrderTracking = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { socket } = useSocketStore();
  const { showToast } = useUIStore();
  
  const [order, setOrder] = useState(null);
  const [partnerLocation, setPartnerLocation] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchOrder = async () => {
      try {
        const { data } = await api.get(`/orders/${id}`);
        setOrder(data);
      } catch (error) {
        console.error(error);
        showToast('Failed to load order', 'error');
      } finally {
        setLoading(false);
      }
    };
    fetchOrder();
  }, [id, showToast]);

  useEffect(() => {
    if (socket && order) {
      socket.emit('track-order', order._id);

      const handleLocationUpdate = (data) => {
        if (data.partnerId === order.deliveryPartner?._id) {
          setPartnerLocation({ lat: data.lat, lng: data.lng });
        }
      };

      socket.on('partner-location-update', handleLocationUpdate);

      return () => {
        socket.off('partner-location-update', handleLocationUpdate);
      };
    }
  }, [socket, order]);

  const copyPhone = () => {
    navigator.clipboard.writeText(order.deliveryPartner?.phone);
    showToast('Phone number copied', 'success');
  };

  if (loading) return (
    <div className="flex justify-center items-center min-h-[50vh]">
      <div className="animate-spin w-12 h-12 border-4 border-primary-500 border-t-transparent rounded-full shadow-md"></div>
    </div>
  );
  
  if (!order) return (
    <div className="text-center py-20">
      <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-200">Order not found</h2>
      <button onClick={() => navigate(-1)} className="mt-4 text-primary-600 font-bold hover:underline">Go Back</button>
    </div>
  );

  const customerLocation = order.deliveryAddress?.location;

  return (
    <motion.div 
      initial="initial"
      animate="animate"
      variants={staggerContainer}
      className="max-w-4xl mx-auto space-y-6 pb-24 lg:pb-12"
    >
      <button onClick={() => navigate('/profile')} className="flex items-center text-gray-500 dark:text-gray-400 hover:text-primary-600 dark:hover:text-primary-400 font-bold transition">
        <ArrowLeft size={20} className="mr-1" /> Back to Profile
      </button>

      <motion.div variants={fadeUp} className="glass dark:bg-dark-800 rounded-3xl shadow-sm border border-gray-100 dark:border-dark-700 p-6 md:p-8 transition-colors">
        <div className="flex flex-col md:flex-row justify-between md:items-center mb-8">
          <div>
            <h1 className="text-3xl font-black text-gray-900 dark:text-white mb-2 tracking-tight">Live Tracking</h1>
            <p className="text-gray-500 dark:text-gray-400 font-medium">{order.orderId || `Order #${order._id.substring(18)}`}</p>
          </div>
          <div className="mt-4 md:mt-0">
            <span className={`inline-flex items-center px-4 py-2 rounded-full text-sm font-black uppercase tracking-widest shadow-sm
              ${order.status === 'Completed' || order.status === 'Delivered' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border border-green-200 dark:border-green-800/50' : 
                'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border border-blue-200 dark:border-blue-800/50'}`}>
              {order.status === 'Delivered' && <CheckCircle size={16} className="mr-1" />}
              {order.status}
            </span>
          </div>
        </div>

        {/* Map Container */}
        <div className="h-96 w-full bg-gray-50 dark:bg-dark-900 rounded-2xl overflow-hidden border-2 border-gray-200 dark:border-dark-700 mb-8 relative z-0 shadow-inner">
          {customerLocation ? (
            <NativeTrackingMap 
              customerLocation={customerLocation} 
              partnerLocation={partnerLocation} 
            />
          ) : (
            <div className="flex items-center justify-center h-full text-gray-500 dark:text-gray-400 font-medium bg-gray-50 dark:bg-dark-900">
              <MapPin size={24} className="mr-2 text-gray-400" />
              No location data available for this order.
            </div>
          )}
          
          {/* Tracking Status Overlay */}
          {partnerLocation && order.status !== 'Delivered' && (
            <div className="absolute top-4 left-4 right-4 z-10">
              <div className="bg-white/90 dark:bg-dark-800/90 backdrop-blur-md px-6 py-3 rounded-2xl shadow-lg border border-gray-100 dark:border-dark-700 flex items-center justify-center">
                <div className="w-2.5 h-2.5 bg-green-500 rounded-full animate-ping mr-3"></div>
                <p className="font-bold text-gray-900 dark:text-white">Partner is on the way to you</p>
              </div>
            </div>
          )}
        </div>

        {/* Delivery Partner Details */}
        {order.deliveryPartner && (
          <motion.div variants={fadeUp} className="bg-blue-50 dark:bg-blue-900/20 border-2 border-blue-100 dark:border-blue-900/50 rounded-2xl p-6 sm:p-8 flex flex-col sm:flex-row items-center justify-between shadow-sm relative overflow-hidden">
            <div className="absolute right-0 top-0 w-32 h-32 bg-blue-500/10 rounded-full blur-2xl translate-x-1/2 -translate-y-1/2 pointer-events-none"></div>
            
            <div className="flex items-center mb-6 sm:mb-0 relative z-10 w-full sm:w-auto">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-400 to-blue-600 text-white rounded-full flex items-center justify-center text-2xl font-black mr-5 shadow-lg shadow-blue-500/30">
                {order.deliveryPartner.name.charAt(0)}
              </div>
              <div>
                <p className="text-xs text-blue-600 dark:text-blue-400 font-bold uppercase tracking-wider mb-1 flex items-center"><Truck size={14} className="mr-1" /> Delivery Partner</p>
                <h3 className="text-xl font-black text-gray-900 dark:text-white">{order.deliveryPartner.name}</h3>
                <p className="text-gray-600 dark:text-gray-300 font-medium mt-1">{order.deliveryPartner.phone}</p>
              </div>
            </div>
            
            <div className="flex space-x-3 w-full sm:w-auto relative z-10">
              <a href={`tel:${order.deliveryPartner.phone}`} className="flex-1 sm:flex-none flex items-center justify-center bg-blue-600 text-white px-6 py-3.5 rounded-xl font-bold hover:bg-blue-500 transition shadow-lg shadow-blue-500/30">
                <PhoneCall size={20} className="mr-2" /> Call
              </a>
              <button onClick={copyPhone} className="flex-1 sm:flex-none flex items-center justify-center bg-white dark:bg-dark-800 text-blue-600 dark:text-blue-400 border-2 border-blue-200 dark:border-blue-900/50 px-4 py-3.5 rounded-xl font-bold hover:bg-blue-50 dark:hover:bg-dark-700 transition shadow-sm">
                <Copy size={20} />
              </button>
            </div>
          </motion.div>
        )}
      </motion.div>
    </motion.div>
  );
};

export default OrderTracking;
