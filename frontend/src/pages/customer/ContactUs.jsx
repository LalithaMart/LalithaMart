import React, { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import api from '../../services/api';
import { useUIStore } from '../../store/uiStore';
import { Mail, Phone, MapPin, Send, Clock } from 'lucide-react';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { motion } from 'framer-motion';
import { fadeUp, staggerContainer } from '../../animations/variants';

// Shared Map Component
function ContactMap({ lat, lng, storeName }) {
  const mapRef = useRef(null);
  const mapInstance = useRef(null);
  const markerInstance = useRef(null);

  useEffect(() => {
    if (!mapRef.current) return;
    if (!mapInstance.current) {
      mapInstance.current = L.map(mapRef.current).setView([lat, lng], 15);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap'
      }).addTo(mapInstance.current);
      
      markerInstance.current = L.marker([lat, lng]).addTo(mapInstance.current);
      if (storeName) {
        markerInstance.current.bindPopup(`<b style="font-family: sans-serif;">${storeName}</b>`).openPopup();
      }
    }
    return () => {
      if (mapInstance.current) {
        mapInstance.current.remove();
        mapInstance.current = null;
        markerInstance.current = null;
      }
    };
  }, [lat, lng, storeName]);

  return <div ref={mapRef} className="h-full w-full z-0" />;
}

const ContactUs = () => {
  const location = useLocation();
  const isDeliveryMode = location.pathname.startsWith('/delivery');
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const { showToast } = useUIStore();
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    subject: '',
    message: ''
  });

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const { data } = await api.get('/settings');
        setSettings(data);
      } catch (error) {
        showToast('Failed to load store details', 'error');
      } finally {
        setLoading(false);
      }
    };
    fetchSettings();
  }, []);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.post('/messages', formData);
      showToast('Message sent successfully. We will contact you soon.', 'success');
      setFormData({ name: '', phone: '', subject: '', message: '' });
    } catch (error) {
      showToast('Failed to send message', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[50vh]">
        <div className="animate-spin w-12 h-12 border-4 border-primary-500 border-t-transparent rounded-full shadow-md"></div>
      </div>
    );
  }

  return (
    <motion.div 
      initial="initial"
      animate="animate"
      variants={staggerContainer}
      className={`${isDeliveryMode ? "w-full pb-24" : "max-w-6xl mx-auto py-8 px-4 sm:px-6 lg:px-8 pb-24 lg:pb-12"}`}
    >
      <motion.div variants={fadeUp} className="text-center mb-12">
        <h1 className="text-4xl font-black text-gray-900 dark:text-white tracking-tight mb-4">Contact Us</h1>
        <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto font-medium">We'd love to hear from you. Have a question or feedback? Here's how you can reach us.</p>
      </motion.div>

      <div className={`grid grid-cols-1 ${!isDeliveryMode ? 'lg:grid-cols-3' : ''} gap-8`}>
        {/* Contact Info */}
        <motion.div variants={fadeUp} className={`${!isDeliveryMode ? 'lg:col-span-1' : ''} space-y-8`}>
          <div className="glass dark:bg-dark-800 p-8 rounded-3xl shadow-sm border border-gray-100 dark:border-dark-700 transition-colors">
            <h3 className="text-2xl font-black text-gray-900 dark:text-white mb-8 border-b border-gray-100 dark:border-dark-700 pb-4 tracking-tight">Get In Touch</h3>
            <div className="space-y-8 text-gray-600 dark:text-gray-300">
              <div className="flex items-start group">
                <div className="w-12 h-12 bg-primary-50 dark:bg-primary-900/30 rounded-2xl flex items-center justify-center mr-4 shrink-0 shadow-sm group-hover:scale-110 transition-transform">
                  <Phone className="text-primary-600 dark:text-primary-400" size={20} />
                </div>
                <div>
                  <p className="font-bold text-gray-900 dark:text-white mb-1">Phone Support</p>
                  <p className="font-medium">{settings?.phone}</p>
                  {settings?.altPhone && <p className="font-medium mt-1">{settings.altPhone}</p>}
                </div>
              </div>
              <div className="flex items-start group">
                <div className="w-12 h-12 bg-blue-50 dark:bg-blue-900/30 rounded-2xl flex items-center justify-center mr-4 shrink-0 shadow-sm group-hover:scale-110 transition-transform">
                  <Mail className="text-blue-600 dark:text-blue-400" size={20} />
                </div>
                <div>
                  <p className="font-bold text-gray-900 dark:text-white mb-1">Email Address</p>
                  <p className="font-medium break-all">{settings?.supportEmail}</p>
                </div>
              </div>
              <div className="flex items-start group">
                <div className="w-12 h-12 bg-red-50 dark:bg-red-900/30 rounded-2xl flex items-center justify-center mr-4 shrink-0 shadow-sm group-hover:scale-110 transition-transform">
                  <MapPin className="text-red-600 dark:text-red-400" size={20} />
                </div>
                <div>
                  <p className="font-bold text-gray-900 dark:text-white mb-1">Store Location</p>
                  <p className="font-medium">{settings?.address?.street}</p>
                  <p className="font-medium text-sm mt-1">{settings?.address?.city}, {settings?.address?.state} - {settings?.address?.postalCode}</p>
                </div>
              </div>
              <div className="flex items-start group">
                <div className="w-12 h-12 bg-green-50 dark:bg-green-900/30 rounded-2xl flex items-center justify-center mr-4 shrink-0 shadow-sm group-hover:scale-110 transition-transform">
                  <Clock className="text-green-600 dark:text-green-400" size={20} />
                </div>
                <div>
                  <p className="font-bold text-gray-900 dark:text-white mb-1">Working Hours</p>
                  <p className="font-medium">{settings?.openingHours} - {settings?.closingHours}</p>
                </div>
              </div>
            </div>
          </div>
          
          {settings?.location?.lat && (
            <div className="glass dark:bg-dark-800 p-2 rounded-3xl shadow-sm border border-gray-100 dark:border-dark-700 transition-colors h-72">
              <div className="w-full h-full rounded-2xl overflow-hidden border-2 border-white dark:border-dark-700 shadow-inner">
                <ContactMap lat={settings.location.lat} lng={settings.location.lng} storeName={settings.storeName} />
              </div>
            </div>
          )}
        </motion.div>

        {/* Contact Form */}
        <motion.div variants={fadeUp} className={`${!isDeliveryMode ? 'lg:col-span-2' : ''}`}>
          <div className="glass dark:bg-dark-800 p-8 sm:p-10 rounded-3xl shadow-sm border border-gray-100 dark:border-dark-700 transition-colors">
            <h3 className="text-2xl font-black text-gray-900 dark:text-white mb-8 tracking-tight">Send us a Message</h3>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className={`grid grid-cols-1 ${!isDeliveryMode ? 'md:grid-cols-2' : ''} gap-6`}>
                <div>
                  <label htmlFor="name" className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Full Name</label>
                  <input type="text" id="name" name="name" required value={formData.name} onChange={handleChange} className="w-full px-4 py-3 bg-gray-50 dark:bg-dark-900 border-2 border-gray-200 dark:border-dark-700 rounded-xl focus:ring-4 focus:ring-primary-500/20 focus:border-primary-500 text-gray-900 dark:text-white transition-all font-medium outline-none" placeholder="John Doe" />
                </div>
                <div>
                  <label htmlFor="phone" className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Phone Number</label>
                  <input type="text" id="phone" name="phone" required value={formData.phone} onChange={handleChange} className="w-full px-4 py-3 bg-gray-50 dark:bg-dark-900 border-2 border-gray-200 dark:border-dark-700 rounded-xl focus:ring-4 focus:ring-primary-500/20 focus:border-primary-500 text-gray-900 dark:text-white transition-all font-medium outline-none" placeholder="+91 9876543210" />
                </div>
              </div>
              <div>
                <label htmlFor="subject" className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Subject</label>
                <input type="text" id="subject" name="subject" required value={formData.subject} onChange={handleChange} className="w-full px-4 py-3 bg-gray-50 dark:bg-dark-900 border-2 border-gray-200 dark:border-dark-700 rounded-xl focus:ring-4 focus:ring-primary-500/20 focus:border-primary-500 text-gray-900 dark:text-white transition-all font-medium outline-none" placeholder="How can we help you?" />
              </div>
              <div>
                <label htmlFor="message" className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Message</label>
                <textarea id="message" name="message" rows={6} required value={formData.message} onChange={handleChange} className="w-full px-4 py-3 bg-gray-50 dark:bg-dark-900 border-2 border-gray-200 dark:border-dark-700 rounded-xl focus:ring-4 focus:ring-primary-500/20 focus:border-primary-500 text-gray-900 dark:text-white transition-all font-medium outline-none resize-none" placeholder="Write your message here..." />
              </div>
              <div className="pt-2">
                <button type="submit" disabled={submitting} className="w-full sm:w-auto px-8 py-4 bg-primary-600 text-white font-black text-lg rounded-2xl hover:bg-primary-500 focus:ring-4 focus:ring-primary-500/50 transition shadow-lg shadow-primary-500/30 disabled:opacity-70 disabled:cursor-not-allowed flex justify-center items-center group">
                  {submitting ? 'Sending...' : (
                    <>
                      <Send size={20} className="mr-3 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" /> 
                      Send Message
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
};

export default ContactUs;
