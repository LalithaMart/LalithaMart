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

// Lazy Loaded Pages
const Login = lazy(() => import('./pages/Login'));
const Register = lazy(() => import('./pages/Register'));
const ForgotPassword = lazy(() => import('./pages/ForgotPassword'));

// Admin Pages
const AdminDashboard = lazy(() => import('./pages/admin/Dashboard'));
const AdminOrders = lazy(() => import('./pages/admin/AdminOrders'));
const Categories = lazy(() => import('./pages/admin/Categories'));
const Products = lazy(() => import('./pages/admin/Products'));
const Customers = lazy(() => import('./pages/admin/Customers'));
const Partners = lazy(() => import('./pages/admin/Partners'));
const Settlements = lazy(() => import('./pages/admin/Settlements'));
const StoreSettings = lazy(() => import('./pages/admin/StoreSettings'));
const Messages = lazy(() => import('./pages/admin/Messages'));

// Delivery Pages
const DeliveryDashboard = lazy(() => import('./pages/delivery/Dashboard'));
const DeliveryHistory = lazy(() => import('./pages/delivery/History'));
const DeliveryProfile = lazy(() => import('./pages/delivery/Profile'));

// Customer Pages
const Home = lazy(() => import('./pages/customer/Home'));
const ProductDetails = lazy(() => import('./pages/customer/ProductDetails'));
const Cart = lazy(() => import('./pages/customer/Cart'));
const Checkout = lazy(() => import('./pages/customer/Checkout'));
const Profile = lazy(() => import('./pages/customer/Profile'));
const OrderTracking = lazy(() => import('./pages/customer/OrderTracking'));
const Wishlist = lazy(() => import('./pages/customer/Wishlist'));
const ContactUs = lazy(() => import('./pages/customer/ContactUs'));

function App() {
  const { user, originalUser } = useAuthStore();
  const { socket, connect, disconnect } = useSocketStore();
  const { setCredentials, token } = useAuthStore();

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
      socket.on('user-updated', handleUserUpdated);
      return () => socket.off('user-updated', handleUserUpdated);
    }
  }, [socket, user, token, setCredentials]);

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
