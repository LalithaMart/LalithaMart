import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import api from '../../services/api';
import { useAuthStore } from '../../store/authStore';
import { useCartStore } from '../../store/cartStore';
import { useWishlistStore } from '../../store/wishlistStore';
import { useUIStore } from '../../store/uiStore';
import { useSocketStore } from '../../store/socketStore';
import ProductImageCarousel from '../../components/ProductImageCarousel';
import { Star, ShoppingCart, ArrowLeft, Plus, Minus, Heart, Bell } from 'lucide-react';
import { motion } from 'framer-motion';
import { fadeUp, staggerContainer } from '../../animations/variants';

const ProductDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { items, addToCart, updateQuantity } = useCartStore();
  const { showToast } = useUIStore();
  const { socket } = useSocketStore();

  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [alertLoading, setAlertLoading] = useState(false);
  const [qty, setQty] = useState(1);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [reviewError, setReviewError] = useState('');
  const { wishlistIds, fetchWishlist, toggleWishlist } = useWishlistStore();

  const fetchProduct = async () => {
    try {
      const { data } = await api.get(`/products/${id}`);
      setProduct(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProduct();
    if (user) {
      fetchWishlist();
    }
  }, [id, user, fetchWishlist]);

  useEffect(() => {
    if (socket) {
      const handleStockUpdated = ({ productId, newStock }) => {
        if (product && product._id === productId) {
          setProduct(prev => ({ ...prev, stock: newStock }));
        }
      };
      socket.on('stock-updated', handleStockUpdated);
      return () => {
        socket.off('stock-updated', handleStockUpdated);
      };
    }
  }, [socket, product]);

  const submitReview = async (e) => {
    e.preventDefault();
    if (!user) {
      navigate('/login');
      return;
    }
    try {
      await api.post(`/products/${id}/reviews`, { rating, comment });
      showToast('Review submitted successfully', 'success');
      setRating(0);
      setComment('');
      fetchProduct();
    } catch (error) {
      setReviewError(error.response?.data?.message || 'Failed to submit review');
    }
  };

  const cartItem = items.find(i => (i.product._id === product?._id) || (i.product === product?._id));
  const inCartQty = cartItem ? cartItem.quantity : 0;

  const handleAddToCart = async () => {
    try {
      await addToCart(product._id, qty);
      showToast('Added to cart!', 'success');
    } catch (error) {
      if (error.response?.status === 401) {
        navigate('/login');
      } else {
        showToast(error.response?.data?.message || 'Thats all we have as of now', 'error', { duration: 1000 });
      }
    }
  };

  const handleUpdateCart = async (newQty) => {
    if (newQty === 0) {
      return;
    }
    try {
      await updateQuantity(product._id, newQty);
      showToast('Cart updated', 'success');
    } catch (error) {
      showToast(error.response?.data?.message || 'Thats all we have as of now', 'error', { duration: 1000 });
    }
  };

  const [isAlertSet, setIsAlertSet] = useState(false);

  useEffect(() => {
    if (product && product.stock === 0 && user) {
      const checkAlert = async () => {
        try {
          const { data } = await api.get(`/stock-alerts/check/${product._id}`);
          setIsAlertSet(data.isSubscribed);
        } catch (error) {
          console.error('Failed to check alert status:', error);
        }
      };
      checkAlert();
    }
  }, [product, user]);

  const handleNotifyMe = async () => {
    if (!user) {
      navigate('/login');
      return;
    }
    setAlertLoading(true);
    try {
      if (isAlertSet) {
        await api.delete(`/stock-alerts/${product._id}`);
        setIsAlertSet(false);
        showToast('Alert removed', 'success');
      } else {
        await api.post('/stock-alerts', { productId: product._id });
        setIsAlertSet(true);
        showToast('You’ll be notified when this product is back in stock 🔔', 'success');
      }
    } catch (error) {
      showToast(error.response?.data?.message || 'Failed to update alert', 'error');
    } finally {
      setAlertLoading(false);
    }
  };

  if (loading) return (
    <div className="flex justify-center items-center min-h-[50vh]">
      <div className="animate-spin w-12 h-12 border-4 border-primary-500 border-t-transparent rounded-full shadow-md"></div>
    </div>
  );
  
  if (!product) return (
    <div className="text-center py-20">
      <span className="text-5xl block mb-4">😕</span>
      <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-200">Product not found</h2>
      <button onClick={() => navigate(-1)} className="mt-4 text-primary-600 font-bold hover:underline">Go Back</button>
    </div>
  );

  return (
    <motion.div 
      initial="initial"
      animate="animate"
      variants={staggerContainer}
      className="max-w-6xl mx-auto space-y-8 pb-24 lg:pb-12"
    >
      <button onClick={() => navigate(-1)} className="flex items-center text-gray-500 dark:text-gray-400 hover:text-primary-600 dark:hover:text-primary-400 font-bold transition">
        <ArrowLeft size={20} className="mr-1" /> Back
      </button>

      <motion.div variants={fadeUp} className="glass dark:bg-dark-800 rounded-3xl shadow-sm border border-gray-100 dark:border-dark-700 p-6 md:p-8 flex flex-col md:flex-row gap-8 lg:gap-12">
        
        {/* Product Images */}
        <div className="w-full md:w-1/2 aspect-square relative rounded-2xl overflow-hidden bg-gray-50 dark:bg-dark-900 border border-gray-100 dark:border-dark-700 shadow-inner">
          <ProductImageCarousel 
            images={product.images} 
            altText={product.name} 
            className={`absolute inset-0 w-full h-full object-contain ${product.stock === 0 ? 'grayscale filter blur-[2px]' : ''}`} 
          />
          {product.stock === 0 && (
            <div className="absolute inset-0 bg-white/70 dark:bg-black/70 backdrop-blur-[2px] flex items-center justify-center z-10 transition-all duration-300 overflow-hidden">
              <img src="/out-of-stock.png" alt="Out of Stock" className="w-3/4 object-contain opacity-90 drop-shadow-2xl transform -rotate-12" />
            </div>
          )}
          {product.discountPrice > 0 && product.stock > 0 && (
             <div className="absolute top-4 left-4 bg-red-500 text-white px-4 py-2 rounded-full font-black text-sm z-20 shadow-lg shadow-red-500/50 whitespace-nowrap inline-block">
                Sale -{Math.round((1 - product.discountPrice/product.price) * 100)}%
             </div>
          )}
        </div>
        
        {/* Product Info */}
        <div className="w-full md:w-1/2 flex flex-col">
          <div className="mb-6">
            <p className="text-primary-600 dark:text-primary-400 font-black mb-2 uppercase tracking-widest text-sm">{product.category?.name}</p>
            <div className="flex justify-between items-start">
              <h1 className="text-3xl md:text-4xl font-extrabold text-gray-900 dark:text-white w-4/5 leading-tight tracking-tight">{product.name}</h1>
              <button 
                onClick={() => toggleWishlist(product._id)}
                className={`p-3 rounded-full border-2 transition-all shadow-sm ${wishlistIds.includes(product._id) ? 'border-red-200 bg-red-50 dark:bg-red-900/30 text-red-500 dark:border-red-800' : 'border-gray-200 dark:border-dark-600 hover:border-red-200 dark:hover:border-red-800 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-500 text-gray-400'}`}
                title={wishlistIds.includes(product._id) ? "Remove from wishlist" : "Add to wishlist"}
              >
                <Heart size={24} fill={wishlistIds.includes(product._id) ? "currentColor" : "none"} />
              </button>
            </div>
            
            <div className="flex items-center mt-3 space-x-3">
              <div className="flex text-yellow-400">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} size={20} fill={i < Math.round(product.rating || 0) ? "currentColor" : "none"} className="drop-shadow-sm" />
                ))}
              </div>
              <span className="text-gray-500 dark:text-gray-400 font-medium bg-gray-100 dark:bg-dark-700 px-2 py-0.5 rounded-lg text-sm">
                {product.reviews?.length || 0} reviews
              </span>
            </div>
          </div>

          <div className="flex items-end space-x-4 mb-6 bg-gray-50 dark:bg-dark-900 p-4 rounded-2xl border border-gray-100 dark:border-dark-700">
            {product.discountPrice > 0 ? (
              <>
                <h2 className="text-4xl lg:text-5xl font-black text-primary-600 dark:text-primary-400">₹{product.discountPrice}</h2>
                <span className="text-xl lg:text-2xl text-gray-400 dark:text-gray-500 line-through mb-1.5 font-bold">₹{product.price}</span>
              </>
            ) : (
              <h2 className="text-4xl lg:text-5xl font-black text-gray-900 dark:text-white">₹{product.price}</h2>
            )}
            <span className="text-gray-500 dark:text-gray-400 mb-1.5 font-medium">/ {product.unit || 'item'}</span>
          </div>

          <p className="text-gray-600 dark:text-gray-300 leading-relaxed text-lg mb-8 flex-1">{product.description}</p>
          
          <div className="pt-6 border-t border-gray-100 dark:border-dark-700 mt-auto">
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4 flex items-center font-medium">
              Availability: 
              <span className={`font-bold ml-2 px-3 py-1 rounded-full text-xs shadow-sm whitespace-nowrap inline-block ${product.stock > 0 ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'}`}>
                {product.stock > 0 ? `In Stock` : 'Out of Stock'}
              </span>
            </p>

            {product.stock > 0 && (
              <div className="mt-4">
                {inCartQty > 0 ? (
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center border-2 border-primary-200 dark:border-primary-900/50 rounded-2xl bg-white dark:bg-dark-800 shadow-sm p-1">
                      <button onClick={() => handleUpdateCart(inCartQty - 1)} className="p-3 bg-gray-50 dark:bg-dark-700 rounded-xl text-gray-600 dark:text-gray-300 hover:text-primary-600 dark:hover:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/20 transition">
                        <Minus size={20} />
                      </button>
                      <span className="px-6 font-black text-xl w-16 text-center text-gray-900 dark:text-white">{inCartQty}</span>
                      <button 
                        onClick={() => {
                          if (inCartQty >= product.stock) {
                            showToast(`We only have ${product.stock} items available right now.`, 'error');
                          } else {
                            handleUpdateCart(inCartQty + 1);
                          }
                        }} 
                        className="p-3 bg-gray-50 dark:bg-dark-700 rounded-xl text-gray-600 dark:text-gray-300 hover:text-primary-600 dark:hover:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/20 transition"
                      >
                        <Plus size={20} />
                      </button>
                    </div>
                    <span className="text-sm font-bold text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-900/20 border border-primary-100 dark:border-primary-900/50 px-4 py-3 rounded-2xl hidden sm:block">
                      {inCartQty} in your Cart
                    </span>
                  </div>
                ) : (
                  <div className="flex space-x-4">
                    <div className="relative">
                      <select 
                        value={qty} 
                        onChange={(e) => setQty(Number(e.target.value))}
                        className="appearance-none px-6 py-4 bg-gray-50 dark:bg-dark-900 border-2 border-gray-200 dark:border-dark-700 rounded-2xl focus:ring-4 focus:ring-primary-500/20 focus:border-primary-500 w-28 text-center font-black text-lg text-gray-900 dark:text-white cursor-pointer transition-all"
                      >
                        {[...Array(Math.min(product.stock, 10)).keys()].map((x) => (
                          <option key={x + 1} value={x + 1}>{x + 1}</option>
                        ))}
                      </select>
                      <div className="absolute right-4 top-1/2 transform -translate-y-1/2 pointer-events-none text-gray-400">
                        ▼
                      </div>
                    </div>
                    
                    <button 
                      onClick={handleAddToCart}
                      className="flex-1 flex items-center justify-center bg-primary-600 text-white font-black text-lg rounded-2xl hover:bg-primary-500 transition shadow-lg shadow-primary-500/30 px-6 py-4"
                    >
                      <ShoppingCart size={24} className="mr-3" /> Add to Cart
                    </button>
                  </div>
                )}
              </div>
            )}
            
            {product.stock === 0 && (
              <div className="mt-8">
                <button
                  onClick={handleNotifyMe}
                  disabled={alertLoading}
                  className={`w-full sm:w-auto flex items-center justify-center font-black text-lg rounded-2xl transition shadow-lg px-8 py-4 disabled:opacity-70 ${isAlertSet ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 hover:bg-green-200 dark:hover:bg-green-900/50' : 'bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 hover:bg-gray-800 dark:hover:bg-gray-200'}`}
                >
                  <Bell size={24} className="mr-3" /> 
                  {alertLoading ? 'Processing...' : isAlertSet ? 'Alert Set ✓' : 'Notify Me'}
                </button>
                {isAlertSet && (
                  <p className="text-xs font-bold text-center mt-2 text-gray-500 cursor-pointer hover:text-red-500" onClick={handleNotifyMe}>Unset Alert</p>
                )}
              </div>
            )}
          </div>
        </div>
      </motion.div>

      {/* Reviews Section */}
      <motion.div variants={fadeUp} className="bg-white dark:bg-dark-800 rounded-3xl shadow-sm border border-gray-100 dark:border-dark-700 p-6 md:p-8 transition-colors">
        <h3 className="text-2xl font-black text-gray-900 dark:text-white mb-8 tracking-tight">Customer Reviews</h3>
        
        {user ? (
          <form onSubmit={submitReview} className="mb-10 bg-gray-50 dark:bg-dark-900 p-6 md:p-8 rounded-3xl border border-gray-100 dark:border-dark-700 shadow-inner">
            <h4 className="font-bold text-lg text-gray-800 dark:text-gray-200 mb-6">Write a Review</h4>
            {reviewError && <div className="bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 p-4 rounded-xl mb-6 text-sm font-medium border border-red-200 dark:border-red-800/50">{reviewError}</div>}
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="col-span-1">
                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Rating</label>
                <div className="relative">
                  <select 
                    value={rating} 
                    onChange={(e) => setRating(e.target.value)}
                    required
                    className="w-full appearance-none px-4 py-3 bg-white dark:bg-dark-800 border-2 border-gray-200 dark:border-dark-700 rounded-xl focus:ring-4 focus:ring-primary-500/20 focus:border-primary-500 font-medium text-gray-900 dark:text-white transition-all cursor-pointer"
                  >
                    <option value="">Select rating...</option>
                    <option value="1">1 - Poor 😞</option>
                    <option value="2">2 - Fair 😐</option>
                    <option value="3">3 - Good 🙂</option>
                    <option value="4">4 - Very Good 😄</option>
                    <option value="5">5 - Excellent 🤩</option>
                  </select>
                  <div className="absolute right-4 top-1/2 transform -translate-y-1/2 pointer-events-none text-gray-400">▼</div>
                </div>
              </div>
              <div className="col-span-1 md:col-span-2">
                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Comment</label>
                <textarea 
                  value={comment} 
                  onChange={(e) => setComment(e.target.value)}
                  required
                  rows="3"
                  className="w-full px-4 py-3 bg-white dark:bg-dark-800 border-2 border-gray-200 dark:border-dark-700 rounded-xl focus:ring-4 focus:ring-primary-500/20 focus:border-primary-500 text-gray-900 dark:text-white transition-all"
                  placeholder="Share your thoughts about this product..."
                ></textarea>
              </div>
            </div>
            <div className="mt-6 flex justify-end">
              <button type="submit" className="bg-gray-900 dark:bg-primary-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-gray-800 dark:hover:bg-primary-500 transition shadow-md">
                Submit Review
              </button>
            </div>
          </form>
        ) : (
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-900/50 text-blue-800 dark:text-blue-400 p-6 rounded-2xl mb-10 font-medium text-center">
            Want to share your thoughts? Please <Link to="/login" className="underline font-black text-blue-700 dark:text-blue-300 hover:text-blue-900 dark:hover:text-blue-200">login</Link> to write a review.
          </div>
        )}

        <div className="space-y-6">
          {product.reviews?.length === 0 ? (
            <div className="text-center py-10 bg-gray-50 dark:bg-dark-900 rounded-2xl border border-dashed border-gray-200 dark:border-dark-700">
              <span className="text-4xl block mb-3">📝</span>
              <p className="text-gray-500 dark:text-gray-400 font-medium">No reviews yet. Be the first to review this product!</p>
            </div>
          ) : (
            product.reviews.map((rev, index) => (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                key={index} 
                className="bg-gray-50 dark:bg-dark-900 p-5 rounded-2xl border border-gray-100 dark:border-dark-700"
              >
                <div className="flex flex-wrap items-center justify-between mb-3 gap-2">
                  <div className="flex items-center space-x-3">
                    <div className="h-10 w-10 rounded-full bg-primary-100 dark:bg-primary-900/50 text-primary-600 dark:text-primary-400 flex items-center justify-center font-bold text-lg shadow-sm border border-primary-200 dark:border-primary-900">
                      {rev.name.charAt(0)}
                    </div>
                    <div>
                      <p className="font-bold text-gray-800 dark:text-gray-200 leading-none mb-1">{rev.name}</p>
                      <span className="text-xs text-gray-400 font-medium">{new Date(rev.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}</span>
                    </div>
                  </div>
                  <div className="flex text-yellow-400 bg-white dark:bg-dark-800 px-3 py-1.5 rounded-full shadow-sm border border-gray-100 dark:border-dark-700">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} size={14} fill={i < rev.rating ? "currentColor" : "none"} className={i < rev.rating ? 'drop-shadow-sm' : ''} />
                    ))}
                  </div>
                </div>
                <p className="text-gray-700 dark:text-gray-300 ml-14 leading-relaxed bg-white dark:bg-dark-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-dark-700">{rev.comment}</p>
              </motion.div>
            ))
          )}
        </div>
      </motion.div>
    </motion.div>
  );
};

export default ProductDetails;
