import { Outlet, Link, useNavigate, useLocation, Navigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { useCartStore } from '../store/cartStore';
import { useUIStore } from '../store/uiStore';
import { ShoppingCart, User, LogOut, CheckCircle, ArrowLeft, Heart, Home as HomeIcon } from 'lucide-react';
import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { pageTransition } from '../animations/variants';
import { useTheme } from '../themes/ThemeProvider';
import { Moon, Sun } from 'lucide-react';
import NotificationCenter from '../components/NotificationCenter';

const MainLayout = () => {
  const { user, logout, originalUser, stopImpersonating } = useAuthStore();
  const { items, fetchCart } = useCartStore();
  const { toast } = useUIStore();
  const navigate = useNavigate();
  const location = useLocation();
  const { theme, toggleTheme } = useTheme();

  useEffect(() => {
    if (user && user.role !== 'delivery') {
      fetchCart();
    }
  }, [user, fetchCart]);

  if (user?.role === 'delivery') {
    return <Navigate to="/delivery" />;
  }

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const cartCount = items.reduce((total, item) => total + item.quantity, 0);

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-dark-900 text-gray-900 dark:text-gray-100 transition-colors duration-300 pb-16 md:pb-0">
      {originalUser ? (
        <div className="bg-orange-500 text-white px-4 py-2 text-center text-sm font-bold flex justify-center items-center z-[70] relative">
          <User size={18} className="mr-2" />
          You are impersonating {user?.name}
          <button onClick={() => { stopImpersonating(); window.location.href = '/admin/customers'; }} className="ml-4 underline hover:text-orange-200">
            Return to Admin
          </button>
        </div>
      ) : user?.role === 'admin' ? (
        <div className="bg-blue-600 text-white px-4 py-2 text-center text-sm font-bold flex justify-center items-center z-[70] relative shadow-md">
          <User size={18} className="mr-2" />
          You are viewing as Customer
          <button onClick={() => { window.location.href = '/admin'; }} className="ml-4 underline hover:text-blue-200">
            Return to Admin Dashboard
          </button>
        </div>
      ) : null}
      {user?.isBlocked && (
        <div className="bg-red-600 text-white text-center py-2 px-4 font-bold text-sm shadow-md z-[60] relative">
          ⚠️ Your account has been blocked. Contact support.
        </div>
      )}

      {/* Desktop Header & Mobile Top Bar */}
      <header className="glass sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center">
            {location.pathname !== '/' && (
              <button onClick={() => navigate(-1)} className="mr-3 text-gray-600 dark:text-gray-300 hover:text-primary-600 transition" title="Go Back">
                <ArrowLeft size={24} />
              </button>
            )}
            <Link to="/" className="text-2xl font-extrabold text-primary-600 dark:text-primary-400 mr-8 tracking-tight">
              Lalitha Mart
            </Link>
            <nav className="hidden md:flex space-x-6">
              <Link to="/contact" className="text-gray-600 dark:text-gray-300 hover:text-primary-600 font-medium transition-colors">Contact</Link>
            </nav>
          </div>
          
          <div className="flex items-center space-x-4 md:space-x-6">
            <button onClick={toggleTheme} className="text-gray-600 dark:text-gray-300 hover:text-primary-600 transition-colors p-2 rounded-full hover:bg-gray-100 dark:hover:bg-dark-700">
              {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
            </button>

            <Link to="/cart" className="text-gray-600 dark:text-gray-300 hover:text-primary-600 relative hidden md:block">
              <ShoppingCart size={24} />
              {cartCount > 0 && (
                <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center shadow-sm">
                  {cartCount}
                </span>
              )}
            </Link>
            
            {user ? (
          <div className="hidden md:flex items-center space-x-4">
            <NotificationCenter />
            <Link to="/wishlist" className="text-gray-600 dark:text-gray-300 hover:text-primary-600" title="Wishlist">
              <Heart size={20} />
            </Link>
                <Link to="/profile" className="flex items-center text-gray-600 dark:text-gray-300 hover:text-primary-600 font-medium">
                  <User size={20} className="mr-1" />
                  <span>{user.name ? user.name.split(' ')[0] : 'User'}</span>
                </Link>
                <button onClick={handleLogout} className="text-gray-600 dark:text-gray-300 hover:text-red-500 transition-colors p-2">
                  <LogOut size={20} />
                </button>
              </div>
            ) : (
              <Link to="/login" className="hidden md:inline-flex bg-primary-600 text-white px-5 py-2 rounded-xl hover:bg-primary-700 transition-all font-medium shadow-md shadow-primary-500/20">
                Login
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* Main Content with Page Transitions */}
      <AnimatePresence mode="wait">
        <motion.main 
          key={location.pathname}
          initial="initial"
          animate="animate"
          exit="exit"
          variants={pageTransition}
          className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-8"
        >
          <Outlet />
        </motion.main>
      </AnimatePresence>

      {/* Footer (Desktop Only) */}
      <footer className="hidden md:block bg-white dark:bg-dark-800 border-t border-gray-100 dark:border-dark-700 mt-auto transition-colors duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 text-center text-gray-500 dark:text-gray-400 font-medium">
          &copy; {new Date().getFullYear()} Lalitha Mart. All rights reserved.
        </div>
      </footer>

      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden glass fixed bottom-0 w-full z-50 border-t border-gray-200 dark:border-dark-700 pb-safe">
        <div className="flex justify-around items-center h-16">
          <Link to="/" className={`flex flex-col items-center justify-center w-full h-full ${location.pathname === '/' ? 'text-primary-600' : 'text-gray-500 dark:text-gray-400'}`}>
            <HomeIcon size={20} />
            <span className="text-[10px] mt-1 font-medium">Home</span>
          </Link>
          <Link to="/wishlist" className={`flex flex-col items-center justify-center w-full h-full ${location.pathname === '/wishlist' ? 'text-primary-600' : 'text-gray-500 dark:text-gray-400'}`}>
          <Heart size={20} />
          <span className="text-[10px] mt-1 font-medium">Saved</span>
        </Link>
        {user && (
          <div className="flex flex-col items-center justify-center w-full h-full">
            <NotificationCenter />
            <span className="text-[10px] mt-0.5 font-medium text-gray-500">Alerts</span>
          </div>
        )}
          <Link to="/cart" className={`flex flex-col items-center justify-center w-full h-full relative ${location.pathname === '/cart' ? 'text-primary-600' : 'text-gray-500 dark:text-gray-400'}`}>
            <div className="relative">
              <ShoppingCart size={20} />
              {cartCount > 0 && (
                <span className="absolute -top-2 -right-2 bg-red-500 text-white text-[9px] font-bold rounded-full h-4 w-4 flex items-center justify-center">
                  {cartCount}
                </span>
              )}
            </div>
            <span className="text-[10px] mt-1 font-medium">Cart</span>
          </Link>
          <Link to={user ? "/profile" : "/login"} className={`flex flex-col items-center justify-center w-full h-full ${location.pathname === '/profile' ? 'text-primary-600' : 'text-gray-500 dark:text-gray-400'}`}>
            <User size={20} />
            <span className="text-[10px] mt-1 font-medium">{user ? 'Profile' : 'Login'}</span>
          </Link>
        </div>
      </nav>

      {/* Global Toast Notification */}
      <AnimatePresence>
        {toast && (
          <motion.div 
            initial={{ opacity: 0, y: -50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -50 }}
            className="fixed top-20 left-1/2 transform -translate-x-1/2 z-[100]"
          >
            <div className="glass !bg-gray-900/90 dark:!bg-white/90 text-white dark:text-gray-900 px-6 py-3 rounded-full shadow-lg flex items-center">
              {toast.type === 'success' && <CheckCircle size={18} className="text-green-400 dark:text-green-600 mr-2" />}
              <span className="font-medium text-sm">{toast.message}</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default MainLayout;
