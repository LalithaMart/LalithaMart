import { useEffect, lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/authStore';
import { useSocketStore } from './store/socketStore';
import ErrorBoundary from './components/ErrorBoundary';

// Layouts
import MainLayout from './layouts/MainLayout';
import AdminLayout from './layouts/AdminLayout';
import DeliveryLayout from './layouts/DeliveryLayout';

// Loading Fallback
const LoadingScreen = () => (
  <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-dark-900">
    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500"></div>
  </div>
);

// Wrapper for lazy to handle chunk loading errors (Vite updates)
const lazyRetry = (componentImport) => {
  return lazy(async () => {
    const pageHasAlreadyBeenForceRefreshed = JSON.parse(
      window.sessionStorage.getItem('page-has-been-force-refreshed') || 'false'
    );
    try {
      const component = await componentImport();
      window.sessionStorage.setItem('page-has-been-force-refreshed', 'false');
      return component;
    } catch (error) {
      if (!pageHasAlreadyBeenForceRefreshed) {
        window.sessionStorage.setItem('page-has-been-force-refreshed', 'true');
        window.location.reload();
      }
      throw error;
    }
  });
};

// Lazy Loaded Pages
const Login = lazyRetry(() => import('./pages/Login'));
const Register = lazyRetry(() => import('./pages/Register'));
const ForgotPassword = lazyRetry(() => import('./pages/ForgotPassword'));

// Admin Pages
const AdminDashboard = lazyRetry(() => import('./pages/admin/Dashboard'));
const AdminOrders = lazyRetry(() => import('./pages/admin/AdminOrders'));
const Categories = lazyRetry(() => import('./pages/admin/Categories'));
const Products = lazyRetry(() => import('./pages/admin/Products'));
const Customers = lazyRetry(() => import('./pages/admin/Customers'));
const Partners = lazyRetry(() => import('./pages/admin/Partners'));
const Settlements = lazyRetry(() => import('./pages/admin/Settlements'));
const StoreSettings = lazyRetry(() => import('./pages/admin/StoreSettings'));
const Messages = lazyRetry(() => import('./pages/admin/Messages'));

// Delivery Pages
const DeliveryDashboard = lazyRetry(() => import('./pages/delivery/Dashboard'));
const DeliveryHistory = lazyRetry(() => import('./pages/delivery/History'));
const DeliveryProfile = lazyRetry(() => import('./pages/delivery/Profile'));

// Customer Pages
const Home = lazyRetry(() => import('./pages/customer/Home'));
const ProductDetails = lazyRetry(() => import('./pages/customer/ProductDetails'));
const Cart = lazyRetry(() => import('./pages/customer/Cart'));
const Checkout = lazyRetry(() => import('./pages/customer/Checkout'));
const Profile = lazyRetry(() => import('./pages/customer/Profile'));
const OrderTracking = lazyRetry(() => import('./pages/customer/OrderTracking'));
const Wishlist = lazyRetry(() => import('./pages/customer/Wishlist'));
const ContactUs = lazyRetry(() => import('./pages/customer/ContactUs'));

function App() {
  const { user, originalUser } = useAuthStore();
  const { socket, connect, disconnect } = useSocketStore();
  const { setCredentials, token, logout } = useAuthStore();

  useEffect(() => {
    if (user) {
      connect();
    } else {
      disconnect();
    }
    return () => disconnect();
  }, [user, connect, disconnect]);

  useEffect(() => {
    if (socket) {
      const handleUserUpdated = (updatedUser) => {
        if (user && updatedUser._id === user._id) {
          setCredentials(updatedUser, token);
        }
      };
      
      const handleForceLogout = (data) => {
        alert(data.message || 'You have been logged out.');
        logout();
        window.location.href = data.redirectUrl || '/login';
      };

      socket.on('user-updated', handleUserUpdated);
      socket.on('force-logout', handleForceLogout);
      
      return () => {
        socket.off('user-updated', handleUserUpdated);
        socket.off('force-logout', handleForceLogout);
      };
    }
  }, [socket, user, token, setCredentials, logout]);

  const isAdmin = user?.role === 'admin' || originalUser?.role === 'admin';

  return (
    <ErrorBoundary>
      <Router>
        <Suspense fallback={<LoadingScreen />}>
          <Routes>
            {/* Public / Customer Routes */}
            <Route path="/" element={<MainLayout />}>
              <Route index element={<Home />} />
              <Route path="product/:id" element={<ProductDetails />} />
              <Route path="login" element={<Login />} />
              <Route path="register" element={<Register />} />
              <Route path="forgot-password" element={<ForgotPassword />} />
              <Route path="cart" element={<Cart />} />
              <Route path="checkout" element={user ? <Checkout /> : <Navigate to="/login" />} />
              <Route path="profile" element={user ? <Profile /> : <Navigate to="/login" />} />
              <Route path="track/:id" element={user ? <OrderTracking /> : <Navigate to="/login" />} />
              <Route path="wishlist" element={user ? <Wishlist /> : <Navigate to="/login" />} />
              <Route path="contact" element={<ContactUs />} />
            </Route>

            {/* Separate Register Routes */}
            <Route path="/delivery/register" element={<Register targetRole="delivery" />} />

            {/* Admin Routes */}
            <Route path="/admin" element={isAdmin ? <AdminLayout /> : <Navigate to="/login" />}>
              <Route index element={<AdminDashboard />} />
              <Route path="orders" element={<AdminOrders />} />
              <Route path="categories" element={<Categories />} />
              <Route path="products" element={<Products />} />
              <Route path="customers" element={<Customers />} />
              <Route path="partners" element={<Partners />} />
              <Route path="settlements" element={<Settlements />} />
              <Route path="settings" element={<StoreSettings />} />
              <Route path="messages" element={<Messages />} />
            </Route>

            {/* Delivery Partner Routes */}
            <Route path="/delivery" element={user?.role === 'delivery' || isAdmin ? <DeliveryLayout /> : <Navigate to="/login" />}>
              <Route index element={<DeliveryDashboard />} />
              <Route path="dashboard" element={<DeliveryDashboard />} />
              <Route path="history" element={<DeliveryHistory />} />
              <Route path="profile" element={<DeliveryProfile />} />
              <Route path="contact" element={<ContactUs />} />
            </Route>
          </Routes>
        </Suspense>
      </Router>
    </ErrorBoundary>
  );
}

export default App;
