import { useState, useEffect } from 'react';
import { useAuthStore } from '../../store/authStore';
import { useUIStore } from '../../store/uiStore';
import api from '../../services/api';
import { Phone, Mail, FileText, CheckCircle, ShieldCheck } from 'lucide-react';
import { motion } from 'framer-motion';
import { fadeUp, staggerContainer } from '../../animations/variants';

const DeliveryProfile = () => {
  const { user, token, setCredentials } = useAuthStore();
  const { showToast } = useUIStore();
  
  
  // We re-fetch to make sure we have the latest generated partnerId/email from the backend
  useEffect(() => {
    const fetchLatestProfile = async () => {
      try {
        const { data } = await api.get('/users/profile');
        setCredentials(data, token);
      } catch (error) {
        console.error(error);
      }
    };
    fetchLatestProfile();
  }, [setCredentials, token]);

  return (
    <motion.div 
      initial="initial"
      animate="animate"
      variants={staggerContainer}
      className="space-y-6 pb-24"
    >
      <motion.h2 variants={fadeUp} className="text-3xl font-black text-gray-900 dark:text-white mb-6 tracking-tight">Personal Details</motion.h2>
      
      <motion.div variants={fadeUp} className="glass dark:bg-dark-800 rounded-3xl shadow-sm border border-gray-100 dark:border-dark-700 p-6 sm:p-8 space-y-8 transition-colors relative overflow-hidden">
        <div className="absolute right-0 top-0 w-32 h-32 bg-primary-500/10 rounded-full blur-2xl translate-x-1/2 -translate-y-1/2 pointer-events-none"></div>

        {/* Basic Info */}
        <div className="flex items-center space-x-5 relative z-10">
          <div className="w-20 h-20 bg-gradient-to-br from-primary-400 to-primary-600 rounded-full flex items-center justify-center text-white font-black text-3xl shadow-lg shadow-primary-500/30">
            {user?.name?.charAt(0)}
          </div>
          <div>
            <h3 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight mb-1">{user?.name}</h3>
            {user?.partnerId ? (
              <span className="inline-flex items-center px-3 py-1 rounded-xl text-xs font-black bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400 uppercase tracking-widest border border-primary-100 dark:border-primary-800/50 shadow-sm">
                ID: {user.partnerId}
              </span>
            ) : (
              <span className="inline-flex items-center px-3 py-1 rounded-xl text-xs font-black bg-gray-100 dark:bg-dark-700 text-gray-600 dark:text-gray-400 uppercase tracking-widest border border-gray-200 dark:border-dark-600 shadow-sm">
                ID: Pending
              </span>
            )}
          </div>
        </div>

        <hr className="border-gray-100 dark:border-dark-700" />

        {/* Contact Info */}
        <div className="space-y-5 relative z-10">
          <div className="flex items-center justify-between group">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-gray-50 dark:bg-dark-900 rounded-2xl flex items-center justify-center border border-gray-100 dark:border-dark-700 shadow-sm group-hover:scale-110 transition-transform">
                <Phone className="text-gray-400 dark:text-gray-500" size={20} />
              </div>
              <div>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-0.5">Phone Number</p>
                <p className="text-gray-900 dark:text-white font-bold text-lg">{user?.phone}</p>
              </div>
            </div>
            <span className="text-xs font-bold text-gray-400 bg-gray-50 dark:bg-dark-900 px-2 py-1 rounded-lg uppercase tracking-wider hidden sm:block">Uneditable</span>
          </div>

          <div className="flex items-center justify-between group">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-gray-50 dark:bg-dark-900 rounded-2xl flex items-center justify-center border border-gray-100 dark:border-dark-700 shadow-sm group-hover:scale-110 transition-transform">
                <Mail className="text-gray-400 dark:text-gray-500" size={20} />
              </div>
              <div>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-0.5">Email Address</p>
                <p className="text-gray-900 dark:text-white font-bold text-lg break-all">{user?.email || 'Not provided'}</p>
              </div>
            </div>
          </div>
        </div>

        <hr className="border-gray-100 dark:border-dark-700" />

        {/* ID Verification */}
        <div className="relative z-10">
          <h4 className="text-sm font-black text-gray-800 dark:text-gray-200 mb-4 uppercase tracking-widest flex items-center">
            <ShieldCheck className="mr-2 text-primary-500" size={18} />
            Identity Verification
          </h4>
          
          <div className="bg-gray-50 dark:bg-dark-900 rounded-2xl p-5 flex items-start justify-between border border-gray-100 dark:border-dark-700 shadow-inner">
            <div className="flex items-start space-x-4">
              <div className="mt-0.5 bg-primary-100 dark:bg-primary-900/30 p-2 rounded-xl text-primary-600 dark:text-primary-400 border border-primary-200 dark:border-primary-900/50 shadow-sm">
                <FileText size={20} />
              </div>
              <div>
                <p className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-wider">
                  {user?.verifiedId?.idType || 'Govt ID'}
                </p>
                <p className="text-base text-gray-500 dark:text-gray-400 font-mono font-bold mt-1 tracking-widest">
                  {user?.verifiedId?.idNumber ? user.verifiedId.idNumber.replace(/.(?=.{4})/g, '*') : 'Not added yet'}
                </p>
              </div>
            </div>
            {user?.verifiedId?.idNumber ? (
              <div className="flex items-center text-green-600 dark:text-green-400 text-xs font-black uppercase tracking-wider bg-green-50 dark:bg-green-900/20 px-3 py-1.5 rounded-xl border border-green-200 dark:border-green-800/50 shadow-sm">
                <CheckCircle size={14} className="mr-1" /> Verified
              </div>
            ) : (
              <span className="text-xs font-black bg-yellow-50 dark:bg-yellow-900/20 text-yellow-600 dark:text-yellow-500 px-3 py-1.5 rounded-xl uppercase tracking-wider border border-yellow-200 dark:border-yellow-800/50 shadow-sm">Pending</span>
            )}
          </div>
          <p className="text-xs font-bold text-gray-400 dark:text-gray-500 mt-4 text-center">To update your phone number or identity details, please contact Administrator.</p>
        </div>

      </motion.div>
    </motion.div>
  );
};

export default DeliveryProfile;
