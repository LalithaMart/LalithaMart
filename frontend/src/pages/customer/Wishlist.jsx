import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useWishlistStore } from '../../store/wishlistStore';
import { Heart, Trash2, Plus, Minus, ShoppingBag } from 'lucide-react';
import { useUIStore } from '../../store/uiStore';
import { useCartStore } from '../../store/cartStore';
import { useSocketStore } from '../../store/socketStore';
import ProductImageCarousel from '../../components/ProductImageCarousel';
import { motion, AnimatePresence } from 'framer-motion';
import { fadeUp, staggerContainer } from '../../animations/variants';

const Wishlist = () => {
  const { wishlistItems, fetchWishlist, toggleWishlist, loading } = useWishlistStore();
  const { items, addToCart, updateQuantity } = useCartStore();
  const { showToast } = useUIStore();
  const { socket } = useSocketStore();

  useEffect(() => {
    fetchWishlist();
  }, [fetchWishlist]);

  useEffect(() => {
    if (socket) {
      const handleStockUpdated = ({ productId, newStock }) => {
        fetchWishlist();
      };
      socket.on('stock-updated', handleStockUpdated);
      return () => {
        socket.off('stock-updated', handleStockUpdated);
      };
    }
  }, [socket, fetchWishlist]);

  const handleRemove = async (e, productId) => {
    e.preventDefault();
    e.stopPropagation();
    await toggleWishlist(productId);
    showToast('Removed from wishlist', 'success');
  };

  const handleAddToCart = (productId, e, product) => {
    e.preventDefault();
    e.stopPropagation();
    addToCart(product, 1);
    showToast('Added to cart', 'success');
  };

  if (loading && wishlistItems.length === 0) {
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
      className="max-w-7xl mx-auto pb-24 lg:pb-12"
    >
      <motion.div variants={fadeUp} className="flex items-center justify-between mb-8 border-b border-gray-200 dark:border-dark-700 pb-6">
        <h1 className="text-3xl font-black text-gray-900 dark:text-white flex items-center tracking-tight">
          <Heart className="mr-3 text-red-500 drop-shadow-sm fill-red-500/20" size={32} /> My Wishlist
        </h1>
        <span className="text-primary-600 dark:text-primary-400 font-bold bg-primary-50 dark:bg-primary-900/20 border border-primary-100 dark:border-primary-900/50 px-4 py-1.5 rounded-xl shadow-sm text-sm">
          {wishlistItems.length} {wishlistItems.length === 1 ? 'item' : 'items'}
        </span>
      </motion.div>

      {wishlistItems.length === 0 ? (
        <motion.div variants={fadeUp} className="text-center py-20 glass dark:bg-dark-800 rounded-3xl shadow-sm border border-gray-100 dark:border-dark-700 transition-colors">
          <div className="w-24 h-24 bg-gray-50 dark:bg-dark-900 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner border border-gray-100 dark:border-dark-700">
            <Heart className="h-12 w-12 text-gray-300 dark:text-gray-600" />
          </div>
          <h2 className="text-2xl font-black text-gray-800 dark:text-gray-200 mb-3 tracking-tight">Your wishlist is empty</h2>
          <p className="text-gray-500 dark:text-gray-400 mb-8 font-medium">Save items you love to review them later.</p>
          <Link to="/" className="inline-flex items-center bg-primary-600 text-white px-8 py-3 rounded-2xl font-bold hover:bg-primary-500 transition shadow-lg shadow-primary-500/30 group">
            <ShoppingBag size={20} className="mr-2 group-hover:scale-110 transition-transform" />
            Continue Shopping
          </Link>
        </motion.div>
      ) : (
        <motion.div variants={fadeUp} className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 sm:gap-6">
          <AnimatePresence mode="popLayout">
            {wishlistItems.map((product) => (
              <motion.div 
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.2 }}
                key={product._id} 
              >
                <Link 
                  to={`/product/${product._id}`} 
                  className={`glass dark:bg-dark-800 rounded-3xl shadow-sm border border-gray-100 dark:border-dark-700 overflow-hidden hover:shadow-xl hover:border-primary-200 dark:hover:border-primary-900/50 transition-all duration-300 group block relative ${product.stock === 0 ? 'cursor-not-allowed opacity-90' : 'hover:-translate-y-1'}`}
                >
                  <div className="relative pb-[100%] overflow-hidden bg-gray-50 dark:bg-dark-900 border-b border-gray-100 dark:border-dark-700">
                    <ProductImageCarousel 
                      images={product.images} 
                      altText={product.name} 
                      className={`absolute inset-0 w-full h-full object-cover transform transition duration-500 ${product.stock === 0 ? 'grayscale filter blur-[2px]' : 'group-hover:scale-110'}`} 
                    />
                    {product.stock === 0 && (
                      <div className="absolute inset-0 bg-white/70 dark:bg-black/70 backdrop-blur-[2px] flex items-center justify-center z-10 transition-all duration-300 overflow-hidden">
                        <img src="/out-of-stock.png" alt="Out of Stock" className="w-3/4 object-contain opacity-90 drop-shadow-2xl transform -rotate-12" />
                      </div>
                    )}
                    {product.discountPrice > 0 && product.stock > 0 && (
                       <div className="absolute top-3 left-3 bg-red-500 text-white px-3 py-1 rounded-full font-black text-xs z-20 shadow-lg shadow-red-500/50">
                          -{Math.round((1 - product.discountPrice/product.price) * 100)}%
                       </div>
                    )}
                  </div>
                  
                  <div className="p-4 sm:p-5">
                    <p className="text-xs text-primary-600 dark:text-primary-400 font-bold mb-1.5 uppercase tracking-widest">{product.category?.name}</p>
                    <h3 className={`font-bold mb-3 truncate transition text-lg ${product.stock === 0 ? 'text-gray-500 dark:text-gray-400' : 'text-gray-800 dark:text-gray-200 group-hover:text-primary-600 dark:group-hover:text-primary-400'}`}>{product.name}</h3>
                    
                    <div className="flex items-center justify-between mt-auto relative z-20">
                      <div className="flex flex-col">
                        {product.discountPrice > 0 ? (
                          <>
                            <span className={`text-xl font-black ${product.stock === 0 ? 'text-gray-500 dark:text-gray-400' : 'text-primary-600 dark:text-primary-400'}`}>₹{product.discountPrice}</span>
                            <span className={`text-xs font-semibold line-through ${product.stock === 0 ? 'text-gray-300 dark:text-gray-600' : 'text-gray-400 dark:text-gray-500'}`}>₹{product.price}</span>
                          </>
                        ) : (
                          <span className={`text-xl font-black ${product.stock === 0 ? 'text-gray-500 dark:text-gray-400' : 'text-gray-900 dark:text-white'}`}>₹{product.price}</span>
                        )}
                      </div>
                      
                      {(() => {
                        const cartItem = items?.find(i => i.product._id === product._id || i.product === product._id);
                        if (cartItem) {
                          return (
                            <div className="flex items-center space-x-1 bg-gray-50 dark:bg-dark-900 rounded-xl px-1.5 py-1.5 border border-gray-100 dark:border-dark-700 shadow-inner" onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}>
                              <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); updateQuantity(product._id, cartItem.quantity - 1); }} className="w-8 h-8 rounded-lg bg-white dark:bg-dark-800 flex items-center justify-center text-gray-600 dark:text-gray-300 shadow-sm hover:text-primary-600 dark:hover:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/20 transition"><Minus size={14} /></button>
                              <span className="text-sm font-black w-6 text-center text-gray-900 dark:text-white">{cartItem.quantity}</span>
                              <button 
                                onClick={(e) => { 
                                  e.preventDefault(); 
                                  e.stopPropagation(); 
                                  if (cartItem.quantity >= product.stock) {
                                    showToast(`Thats all we have as of now`, 'error', { duration: 1000 });
                                  } else {
                                    updateQuantity(product._id, cartItem.quantity + 1); 
                                  }
                                }} 
                                disabled={product.stock <= cartItem.quantity} 
                                className="w-8 h-8 rounded-lg bg-white dark:bg-dark-800 flex items-center justify-center text-gray-600 dark:text-gray-300 shadow-sm hover:text-primary-600 dark:hover:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/20 disabled:opacity-50 disabled:cursor-not-allowed transition">
                                  <Plus size={14} />
                              </button>
                            </div>
                          );
                        } else {
                          return (
                            <button 
                              onClick={(e) => {
                                if(product.stock > 0) handleAddToCart(product._id, e, product);
                                else { e.preventDefault(); e.stopPropagation(); }
                              }}
                              disabled={product.stock === 0}
                              className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all shadow-sm
                                ${product.stock === 0 ? 'bg-gray-100 dark:bg-dark-700 text-gray-300 dark:text-gray-500 cursor-not-allowed' : 'bg-primary-600 text-white hover:bg-primary-500 shadow-primary-500/30'}`}
                            >
                              <Plus size={22} className={product.stock > 0 ? "group-hover:rotate-90 transition-transform duration-300" : ""} />
                            </button>
                          );
                        }
                      })()}
                    </div>
                  </div>
                  
                  {/* Remove Button */}
                  <button 
                    onClick={(e) => handleRemove(e, product._id)}
                    className="absolute top-3 right-3 bg-white/90 dark:bg-dark-800/90 backdrop-blur-sm p-2.5 rounded-full shadow-md text-red-500 dark:text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 transition-all opacity-100 lg:opacity-0 lg:group-hover:opacity-100 focus:opacity-100 z-10 hover:scale-110"
                    title="Remove from wishlist"
                  >
                    <Trash2 size={18} />
                  </button>
                </Link>
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>
      )}
    </motion.div>
  );
};

export default Wishlist;
