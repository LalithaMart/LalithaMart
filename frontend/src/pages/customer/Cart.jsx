import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Trash2, Plus, Minus, ShoppingBag, ArrowRight } from 'lucide-react';
import { useCartStore } from '../../store/cartStore';
import { useUIStore } from '../../store/uiStore';
import { motion, AnimatePresence } from 'framer-motion';
import { fadeUp, staggerContainer } from '../../animations/variants';

const Cart = () => {
  const navigate = useNavigate();
  const { items, fetchCart, updateQuantity, removeFromCart, clearCart, loading } = useCartStore();
  const { showToast } = useUIStore();

  useEffect(() => {
    fetchCart();
  }, [fetchCart]);

  const calculateTotal = () => {
    return items.reduce((total, item) => {
      const p = item.product.discountPrice > 0 ? item.product.discountPrice : item.product.price;
      return total + (p * item.quantity);
    }, 0);
  };

  if (loading && items.length === 0) return (
    <div className="flex justify-center items-center min-h-[50vh]">
      <div className="animate-spin w-12 h-12 border-4 border-primary-500 border-t-transparent rounded-full shadow-md"></div>
    </div>
  );

  return (
    <motion.div 
      initial="initial"
      animate="animate"
      variants={staggerContainer}
      className="max-w-5xl mx-auto space-y-8 pb-24 lg:pb-12"
    >
      <motion.div variants={fadeUp} className="flex items-center justify-between pb-6 border-b border-gray-200 dark:border-dark-700">
        <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white flex items-center tracking-tight">
          <ShoppingBag className="mr-3 text-primary-600 dark:text-primary-400 drop-shadow-sm" size={32} />
          Your Cart
        </h1>
        {items.length > 0 && (
          <button onClick={clearCart} className="text-red-500 dark:text-red-400 text-sm font-bold hover:bg-red-50 dark:hover:bg-red-900/30 px-4 py-2 rounded-xl transition-colors">
            Empty Cart
          </button>
        )}
      </motion.div>

      {items.length === 0 ? (
        <motion.div variants={fadeUp} className="text-center py-20 glass dark:bg-dark-800 rounded-3xl shadow-sm border border-gray-100 dark:border-dark-700">
          <div className="w-24 h-24 bg-gray-50 dark:bg-dark-900 border border-gray-100 dark:border-dark-700 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner">
            <ShoppingBag size={40} className="text-gray-300 dark:text-gray-600" />
          </div>
          <h2 className="text-2xl font-black text-gray-800 dark:text-gray-200 mb-2">Your cart is empty</h2>
          <p className="text-gray-500 dark:text-gray-400 mb-8 font-medium">Looks like you haven't added anything yet.</p>
          <button onClick={() => navigate('/')} className="bg-primary-600 text-white px-8 py-3 rounded-2xl font-bold hover:bg-primary-500 transition shadow-lg shadow-primary-500/30">
            Start Shopping
          </button>
        </motion.div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <motion.div variants={fadeUp} className="lg:col-span-2 space-y-4">
            <AnimatePresence mode="popLayout">
              {items.map((item) => {
                const actualPrice = item.product.discountPrice > 0 ? item.product.discountPrice : item.product.price;
                return (
                  <motion.div 
                    layout
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.2 }}
                    key={item._id} 
                    className="glass dark:bg-dark-800 p-4 rounded-3xl shadow-sm border border-gray-100 dark:border-dark-700 flex flex-col sm:flex-row items-center sm:items-stretch gap-4"
                  >
                    <div className="relative shrink-0">
                      <img 
                        src={item.product.images[0]?.startsWith('http') ? item.product.images[0] : `${import.meta.env.VITE_BACKEND_URL || "http://localhost:5000"}${item.product.images[0]}`} 
                        alt={item.product.name} 
                        className="w-28 h-28 object-cover rounded-2xl bg-gray-50 dark:bg-dark-900 border border-gray-100 dark:border-dark-700 shadow-inner"
                      />
                    </div>
                    
                    <div className="flex-1 flex flex-col justify-between w-full">
                      <div className="text-center sm:text-left mb-4 sm:mb-0">
                        <h3 className="font-bold text-gray-800 dark:text-gray-100 text-lg leading-tight mb-1 truncate max-w-[200px] sm:max-w-md">{item.product.name}</h3>
                        <div className="flex items-center justify-center sm:justify-start">
                          <p className="text-primary-600 dark:text-primary-400 font-black text-xl">₹{actualPrice}</p>
                          {item.product.discountPrice > 0 && (
                            <p className="text-gray-400 dark:text-gray-500 text-sm line-through font-semibold ml-2">₹{item.product.price}</p>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between w-full mt-auto">
                        <div className="flex items-center bg-gray-50 dark:bg-dark-900 rounded-xl p-1 border border-gray-200 dark:border-dark-700 shadow-sm">
                          <button onClick={() => updateQuantity(item._id, Math.max(1, item.quantity - 1))} className="w-10 h-10 flex items-center justify-center text-gray-500 dark:text-gray-400 hover:text-primary-600 dark:hover:text-primary-400 hover:bg-white dark:hover:bg-dark-700 rounded-lg transition-colors">
                            <Minus size={18} />
                          </button>
                          <span className="w-10 text-center font-black text-gray-900 dark:text-white">{item.quantity}</span>
                          <button 
                            onClick={() => {
                              if (item.quantity >= item.product.stock) {
                                showToast(`We only have ${item.product.stock} items available right now.`, 'error');
                                return;
                              }
                              updateQuantity(item._id, item.quantity + 1);
                            }} 
                            className="w-10 h-10 flex items-center justify-center text-gray-500 dark:text-gray-400 hover:text-primary-600 dark:hover:text-primary-400 hover:bg-white dark:hover:bg-dark-700 rounded-lg transition-colors"
                            title={item.quantity >= item.product.stock ? "Maximum stock reached" : "Increase quantity"}
                          >
                            <Plus size={18} />
                          </button>
                        </div>
                        
                        <button onClick={() => removeFromCart(item._id)} className="text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 p-3 rounded-xl transition-colors">
                          <Trash2 size={22} />
                        </button>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </motion.div>

          {/* Order Summary */}
          <motion.div variants={fadeUp} className="lg:col-span-1">
            <div className="glass dark:bg-dark-800 p-6 sm:p-8 rounded-3xl shadow-sm border border-gray-100 dark:border-dark-700 sticky top-24">
              <h2 className="text-2xl font-black text-gray-900 dark:text-white mb-6 pb-4 border-b border-gray-100 dark:border-dark-700 tracking-tight">Order Summary</h2>
              
              <div className="space-y-4 text-gray-600 dark:text-gray-300 mb-6 font-medium">
                <div className="flex justify-between items-center">
                  <span>Subtotal ({items.reduce((acc, item) => acc + item.quantity, 0)} items)</span>
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
                onClick={() => navigate('/checkout')}
                className="w-full bg-primary-600 text-white py-4 rounded-2xl font-black text-lg flex items-center justify-center hover:bg-primary-500 transition shadow-lg shadow-primary-500/30 group"
              >
                Checkout
                <ArrowRight size={20} className="ml-2 group-hover:translate-x-1 transition-transform" />
              </button>
              
              <p className="text-center text-xs font-bold text-gray-400 dark:text-gray-500 mt-6 uppercase tracking-wider">
                Only Cash on Delivery available
              </p>
            </div>
          </motion.div>
        </div>
      )}
    </motion.div>
  );
};

export default Cart;
