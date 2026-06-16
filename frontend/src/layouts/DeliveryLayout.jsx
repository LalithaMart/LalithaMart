import { Outlet, Link, useNavigate, useLocation, Navigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { MapPin, PackageCheck, LogOut, ClipboardList, User, ArrowLeft, Phone, Moon, Sun } from 'lucide-react';
import api from '../services/api';
import { useUIStore } from '../store/uiStore';
import { motion, AnimatePresence } from 'framer-motion';
import { pageTransition } from '../animations/variants';
import { useTheme } from '../themes/ThemeProvider';
import NotificationCenter from '../components/NotificationCenter';

const DeliveryLayout = () => {
  const { logout, user, token, originalUser, stopImpersonating, setCredentials } = useAuthStore();
  const { showToast } = useUIStore();
  const navigate = useNavigate();
  const location = useLocation();
  const { theme, toggleTheme } = useTheme();

  if (user?.role === 'customer') {
    return <Navigate to="/" />;
  }

  const handleLogout = () => {
    logout();
    navigate('/delivery/login');
  };

  const handleToggleAvailability = async () => {
    try {
      const { data } = await api.put('/users/profile', { isAvailable: !user.isAvailable });
      setCredentials(data, token);
      showToast(data.isAvailable ? 'You are now online' : 'You are now offline', 'success');
    } catch (error) {
      console.error(error);
      showToast('Failed to update status', 'error');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-dark-900 text-gray-900 dark:text-gray-100 flex flex-col transition-colors duration-300 pb-16">
      {originalUser ? (
        <div className="bg-orange-500 text-white px-4 py-2 text-center text-sm font-bold flex justify-center items-center z-[70] relative">
          <User size={18} className="mr-2" />
          You are impersonating {user?.name}
          <button onClick={() => { stopImpersonating(); window.location.href = '/admin/partners'; }} className="ml-4 underline hover:text-orange-200">
            Return to Admin
          </button>
        </div>
      ) : user?.role === 'admin' ? (
        <div className="bg-orange-600 text-white px-4 py-2 text-center text-sm font-bold flex justify-center items-center z-[70] relative shadow-md">
          <User size={18} className="mr-2" />
          You are viewing as Delivery Partner
          <button onClick={() => { window.location.href = '/admin'; }} className="ml-4 underline hover:text-orange-200">
            Return to Admin Dashboard
          </button>
        </div>
      ) : null}
      {user?.isSuspended && (
        <div className="bg-red-600 text-white text-center py-2 px-4 font-bold text-sm shadow-md z-[60] relative">
          ⚠️ Your delivery partner account has been suspended. Contact support.
        </div>
      )}
      
      {/* Header */}
      <header className="glass sticky top-0 z-50">
        <div className="px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center text-primary-600 dark:text-primary-400">
            {location.pathname !== '/delivery' && (
              <button onClick={() => navigate(-1)} className="mr-3 text-gray-600 dark:text-gray-400 hover:text-primary-600 transition" title="Go Back">
                <ArrowLeft size={20} />
              </button>
            )}
            <PackageCheck size={28} className="mr-2" />
            <span className="text-xl font-bold tracking-tight hidden sm:block">Delivery Portal</span>
            <span className="text-xl font-bold tracking-tight sm:hidden">Delivery</span>
          </div>
          
          <div className="flex items-center space-x-2 sm:space-x-4">
          <NotificationCenter />
          <button onClick={toggleTheme} className="text-gray-500 dark:text-gray-400 hover:text-primary-600 p-2 rounded-full hover:bg-gray-100 dark:hover:bg-dark-700 transition-colors">
            {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
          </button>
            <button onClick={handleLogout} className="text-gray-500 dark:text-gray-400 hover:text-red-500 p-2 rounded-full hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
              <LogOut size={20} />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 w-full max-w-lg mx-auto py-6 px-4">
        {/* Welcome Card */}
        <div className="bg-white dark:bg-dark-800 p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-dark-700 mb-6 flex items-center justify-between transition-colors">
          <div className="flex items-center space-x-4">
            <div className="h-12 w-12 bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 rounded-full flex items-center justify-center font-bold text-xl shadow-sm">
              {user?.name?.charAt(0)}
            </div>
            <div>
              <h2 className="font-bold text-gray-800 dark:text-gray-100 text-sm sm:text-base">Hello, {user?.name.split(' ')[0]}</h2>
              <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 flex items-center font-medium mt-0.5">
                <span className={`w-2 h-2 rounded-full mr-2 shadow-sm ${user?.isAvailable ? 'bg-green-500 shadow-green-500/50' : 'bg-red-500 shadow-red-500/50'}`}></span>
                {user?.isAvailable ? 'Online & Ready' : 'Currently Offline'}
              </p>
            </div>
          </div>
          <button 
            onClick={handleToggleAvailability}
            className={`px-4 py-2 rounded-xl font-bold text-xs sm:text-sm transition-all shadow-sm ${user?.isAvailable ? 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 hover:bg-red-200' : 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 hover:bg-green-200'}`}
          >
            Go {user?.isAvailable ? 'Offline' : 'Online'}
          </button>
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={location.pathname}
            initial="initial"
            animate="animate"
            exit="exit"
            variants={pageTransition}
          >
            <Outlet />
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Bottom Navigation for Mobile */}
      <nav className="glass fixed bottom-0 w-full z-50 border-t border-gray-200 dark:border-dark-700 pb-safe">
        <div className="flex justify-around items-center h-16 max-w-lg mx-auto">
          <Link to="/delivery" className={`flex flex-col items-center justify-center w-full h-full ${location.pathname === '/delivery' ? 'text-primary-600 dark:text-primary-400' : 'text-gray-400 hover:text-primary-600'}`}>
            <ClipboardList size={22} />
            <span className="text-[10px] font-bold mt-1">Orders</span>
          </Link>
          <Link to="/delivery/history" className={`flex flex-col items-center justify-center w-full h-full ${location.pathname.includes('/history') ? 'text-primary-600 dark:text-primary-400' : 'text-gray-400 hover:text-primary-600'}`}>
            <MapPin size={22} />
            <span className="text-[10px] font-bold mt-1">History</span>
          </Link>
          <Link to="/delivery/contact" className={`flex flex-col items-center justify-center w-full h-full ${location.pathname.includes('/contact') ? 'text-primary-600 dark:text-primary-400' : 'text-gray-400 hover:text-primary-600'}`}>
            <Phone size={22} />
            <span className="text-[10px] font-bold mt-1">Support</span>
          </Link>
          <Link to="/delivery/profile" className={`flex flex-col items-center justify-center w-full h-full ${location.pathname.includes('/profile') ? 'text-primary-600 dark:text-primary-400' : 'text-gray-400 hover:text-primary-600'}`}>
            <User size={22} />
            <span className="text-[10px] font-bold mt-1">Profile</span>
          </Link>
        </div>
      </nav>
    </div>
  );
};

export default DeliveryLayout;
