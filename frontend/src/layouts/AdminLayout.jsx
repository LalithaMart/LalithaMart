import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { useSocketStore } from '../store/socketStore';
import { useUIStore } from '../store/uiStore';
import { LayoutDashboard, Package, Users, Truck, LogOut, ArrowLeft, DollarSign, Layers, Settings, MessageSquare, CheckCircle, X, ShoppingBag, Menu, Moon, Sun } from 'lucide-react';
import { useEffect, useState, useRef } from 'react';
import api from '../services/api';
import { motion, AnimatePresence } from 'framer-motion';
import { pageTransition } from '../animations/variants';
import { useTheme } from '../themes/ThemeProvider';
import NotificationCenter from '../components/NotificationCenter';

const AdminLayout = () => {
  const { logout } = useAuthStore();
  const { socket } = useSocketStore();
  const { toast, showToast, hideToast } = useUIStore();
  const navigate = useNavigate();
  const location = useLocation();
  const { theme, toggleTheme } = useTheme();
  
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const dropdownRef = useRef(null);
  const sidebarRef = useRef(null);

  const fetchNotifications = async () => {
    try {
      const { data } = await api.get('/notifications');
      setNotifications(data);
    } catch (e) {
      console.error('Failed to fetch notifications', e);
    }
  };

  const handleClearReadNotifications = async () => {
    try {
      await api.delete('/notifications/read');
      fetchNotifications();
    } catch (error) {
      console.error('Failed to clear read notifications', error);
    }
  };

  const handleClearAllNotifications = async () => {
    try {
      await api.delete('/notifications/all');
      fetchNotifications();
    } catch (error) {
      console.error('Failed to clear all notifications', error);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (sidebarRef.current && !sidebarRef.current.contains(event.target) && window.innerWidth < 1024) {
        setSidebarOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (socket) {
      const handleAdminNotification = (data) => {
        fetchNotifications();
        showToast(
          data.message, 
          'info',
          data.relatedId ? { label: 'View', onClick: async () => {
            try {
              if (data._id) await api.put(`/notifications/${data._id}/read`);
              fetchNotifications();
            } catch(e) {}
            if (data.type === 'System' || (data.message && data.message.includes('stock'))) {
              navigate(`/admin/products?edit=${data.relatedId}`);
            } else if (data.title && data.title.includes('Partner')) {
              navigate(`/admin/partners`);
            } else {
              navigate(`/admin/orders?open=${data.relatedId}`);
            }
          }} : null
        );
      };

      const handleDeliveryCancelled = (data) => {
        fetchNotifications();
        showToast(
          data.reason, 
          'error', 
          { label: 'View', duration: 0, onClick: () => navigate(`/admin/orders?open=${data.order._id}`) }
        );
      };

      socket.on('admin-notification', handleAdminNotification);
      socket.on('delivery-cancelled', handleDeliveryCancelled);

      return () => {
        socket.off('admin-notification', handleAdminNotification);
        socket.off('delivery-cancelled', handleDeliveryCancelled);
      };
    }
  }, [socket, showToast, navigate]);

  const handleLogout = () => {
    logout();
    navigate('/admin/login');
  };

  const navItems = [
    { name: 'Dashboard', path: '/admin', icon: <LayoutDashboard size={20} /> },
    { name: 'Orders', path: '/admin/orders', icon: <ShoppingBag size={20} /> },
    { name: 'Products', path: '/admin/products', icon: <Package size={20} /> },
    { name: 'Categories', path: '/admin/categories', icon: <Layers size={20} /> },
    { name: 'Customers', path: '/admin/customers', icon: <Users size={20} /> },
    { name: 'Partners', path: '/admin/partners', icon: <Truck size={20} /> },
    { name: 'Settlements', path: '/admin/settlements', icon: <DollarSign size={20} /> },
    { name: 'Messages', path: '/admin/messages', icon: <MessageSquare size={20} /> },
    { name: 'Settings', path: '/admin/settings', icon: <Settings size={20} /> }
  ];

  return (
    <>
    <div className="min-h-screen flex bg-gray-50 dark:bg-dark-900 text-gray-900 dark:text-gray-100 transition-colors duration-300">
      
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside 
        ref={sidebarRef}
        className={`fixed lg:sticky top-0 h-screen w-64 bg-white dark:bg-dark-800 shadow-xl lg:shadow-md flex flex-col z-50 transform transition-transform duration-300 ease-in-out border-r border-gray-100 dark:border-dark-700
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}
      >
        <div className="p-6 border-b border-gray-100 dark:border-dark-700 flex justify-between items-center">
          <h2 className="text-2xl font-extrabold text-primary-600 dark:text-primary-400 tracking-tight">Admin Portal</h2>
          <button className="lg:hidden text-gray-500 hover:text-gray-900 dark:hover:text-white" onClick={() => setSidebarOpen(false)}>
            <X size={24} />
          </button>
        </div>
        
        <nav className="flex-1 overflow-y-auto p-4 space-y-1 scrollbar-hide">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path || (item.path !== '/admin' && location.pathname.startsWith(item.path));
            return (
              <Link
                key={item.name}
                to={item.path}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center px-4 py-3 rounded-xl transition-all font-medium ${
                  isActive 
                    ? 'bg-primary-600 text-white shadow-md shadow-primary-500/20' 
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-dark-700 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                {item.icon}
                <span className="ml-3">{item.name}</span>
              </Link>
            )
          })}
        </nav>
        
        <div className="p-4 border-t border-gray-100 dark:border-dark-700">
          <button
            onClick={handleLogout}
            className="flex items-center w-full px-4 py-3 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-colors font-medium"
          >
            <LogOut size={20} />
            <span className="ml-3">Logout</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col w-full overflow-hidden">
        <header className="glass sticky top-0 z-30 h-16 flex items-center px-4 md:px-8 justify-between border-b border-gray-200 dark:border-dark-700">
          <div className="flex items-center">
            <button onClick={() => setSidebarOpen(true)} className="mr-4 lg:hidden text-gray-600 dark:text-gray-300">
              <Menu size={24} />
            </button>
            {location.pathname !== '/admin' && (
              <button onClick={() => navigate(-1)} className="mr-3 hidden md:block text-gray-600 dark:text-gray-400 hover:text-primary-600 transition" title="Go Back">
                <ArrowLeft size={20} />
              </button>
            )}
            <h1 className="text-lg md:text-xl font-bold text-gray-800 dark:text-gray-100 tracking-tight">Overview</h1>
          </div>
          
          <div className="flex items-center space-x-2 md:space-x-4">
            <button onClick={toggleTheme} className="p-2 text-gray-600 dark:text-gray-300 hover:text-primary-600 hover:bg-gray-100 dark:hover:bg-dark-700 rounded-full transition-colors">
              {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
            </button>

            <Link to="/" className="flex items-center justify-center text-sm font-bold text-gray-600 dark:text-gray-300 hover:text-blue-600 bg-gray-50 dark:bg-dark-800 p-2 md:px-4 md:py-2 rounded-xl md:border border-gray-200 dark:border-dark-600 transition-all hover:border-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/20" title="View as Customer">
              <span className="hidden md:block">View as Customer</span>
              <ShoppingBag className="md:hidden" size={20} />
            </Link>

            <Link to="/delivery" className="flex items-center justify-center text-sm font-bold text-gray-600 dark:text-gray-300 hover:text-orange-600 bg-gray-50 dark:bg-dark-800 p-2 md:px-4 md:py-2 rounded-xl md:border border-gray-200 dark:border-dark-600 transition-all hover:border-orange-300 hover:bg-orange-50 dark:hover:bg-orange-900/20" title="View as Partner">
              <span className="hidden md:block">View as Partner</span>
              <Truck className="md:hidden" size={20} />
            </Link>
            <div className="relative">
              <NotificationCenter />
            </div>
          </div>
        </header>
        
        <div className="p-4 md:p-8 overflow-y-auto flex-1 scrollbar-hide">
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
        </div>
      </main>
    </div>

    {/* Global Toast Notification */}
    <AnimatePresence>
      {toast && (
        <motion.div 
          initial={{ opacity: 0, y: -50 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -50 }}
          className="fixed top-20 left-1/2 transform -translate-x-1/2 z-[100]"
        >
          <div className="glass !bg-gray-900/90 dark:!bg-white/90 text-white dark:text-gray-900 px-6 py-3 rounded-full shadow-lg flex items-center cursor-pointer" onClick={() => {
            if (toast.action) {
              toast.action.onClick();
              hideToast();
            }
          }}>
            {toast.type === 'success' && <CheckCircle size={18} className="text-green-400 dark:text-green-600 mr-2" />}
            {toast.type === 'error' && <X size={18} className="text-red-400 dark:text-red-600 mr-2" />}
            <span className="font-medium text-sm mr-3">{toast.message}</span>
            {toast.action && (
              <span className="text-primary-400 dark:text-primary-600 font-bold hover:underline text-sm ml-2">{toast.action.label}</span>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
    </>
  );
};

export default AdminLayout;
