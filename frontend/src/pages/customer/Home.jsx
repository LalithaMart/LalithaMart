import { useState, useEffect } from 'react';
import api from '../../services/api';
import { Search, Plus, Minus, Heart, ArrowRight, Bell } from 'lucide-react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useCartStore } from '../../store/cartStore';
import { useUIStore } from '../../store/uiStore';
import { useAuthStore } from '../../store/authStore';
import { useWishlistStore } from '../../store/wishlistStore';
import { useSocketStore } from '../../store/socketStore';
import ProductImageCarousel from '../../components/ProductImageCarousel';
import { motion } from 'framer-motion';
import { fadeUp, staggerContainer } from '../../animations/variants';

const banners = [
  { id: 1, image: 'https://images.unsplash.com/photo-1583258292688-d0213dc5a3a8?auto=format&fit=crop&w=1200&q=80', title: 'Daily Grocery Essentials' },
  { id: 2, image: 'https://images.unsplash.com/photo-1578916171728-46686eac8d58?auto=format&fit=crop&w=1200&q=80', title: 'Stock Up Your Pantry' },
];

const Home = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialCategory = searchParams.get('category') || '';
  
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [activeCategory, setActiveCategory] = useState(initialCategory);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [currentBanner, setCurrentBanner] = useState(0);
  const navigate = useNavigate();
  const { items, addToCart, updateQuantity } = useCartStore();
  const { showToast } = useUIStore();
  const { user } = useAuthStore();
  const [alertedProductIds, setAlertedProductIds] = useState([]);
  const { wishlistIds, fetchWishlist, toggleWishlist } = useWishlistStore();
  const { socket } = useSocketStore();

  useEffect(() => {
    const bannerInterval = setInterval(() => {
      setCurrentBanner(prev => (prev + 1) % banners.length);
    }, 4000);
    return () => clearInterval(bannerInterval);
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const productUrl = activeCategory 
          ? `/products?category=${activeCategory}` 
          : '/products';
          
        const [catRes, prodRes] = await Promise.all([
          api.get('/categories'),
          api.get(productUrl)
        ]);
        
        // Sort categories by priority ascending
        const sortedCats = catRes.data.sort((a, b) => (a.priority || 0) - (b.priority || 0));
        setCategories(sortedCats);
        
        // Sort products by priority ascending
        const sortedProds = prodRes.data.sort((a, b) => (a.priority || 0) - (b.priority || 0));
        setProducts(sortedProds);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
    if (user) {
      fetchWishlist();
      api.get('/stock-alerts/my-alerts')
        .then(res => setAlertedProductIds(res.data))
        .catch(console.error);
    }
  }, [activeCategory, searchParams, user, fetchWishlist]);

  useEffect(() => {
    if (socket) {
      const handleStockUpdated = ({ productId, newStock }) => {
        setProducts(prev => prev.map(p => p._id === productId ? { ...p, stock: newStock } : p));
      };
      socket.on('stock-updated', handleStockUpdated);
      return () => {
        socket.off('stock-updated', handleStockUpdated);
      };
    }
  }, [socket]);

  const handleSearch = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data } = await api.get(`/products?keyword=${search}`);
      const sortedProds = data.sort((a, b) => (a.priority || 0) - (b.priority || 0));
      setProducts(sortedProds);
      setActiveCategory(''); // Reset category filter on search
      setSearchParams({});
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleCategoryClick = (categoryId) => {
    setActiveCategory(categoryId);
    setSearch('');
    setSearchParams({ category: categoryId });
  };

  const clearFilters = () => {
    setActiveCategory('');
    setSearch('');
    setSearchParams({});
  };

  const handleAddToCart = async (productId, e) => {
    e.stopPropagation();
    e.preventDefault();
    try {
      await addToCart(productId, 1);
      showToast('Added to cart!', 'success');
    } catch (error) {
      if (error.response?.status === 401) {
        navigate('/login');
      } else {
        showToast(error.response?.data?.message || 'Thats all we have as of now', 'error', { duration: 1000 });
      }
    }
  };

  const handleNotifyMe = async (productId, e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!user) {
      navigate('/login');
      return;
    }
    try {
      if (alertedProductIds.includes(productId)) {
        await api.delete(`/stock-alerts/${productId}`);
        setAlertedProductIds(prev => prev.filter(id => id !== productId));
        showToast('Alert removed', 'success');
      } else {
        await api.post('/stock-alerts', { productId }).catch(err => {
          if (err.response?.status === 400 && err.response?.data?.message?.includes('already')) {
            return; // Ignore if already subscribed on backend but not in frontend state yet
          }
          throw err;
        });
        setAlertedProductIds(prev => [...prev, productId]);
        showToast('You will be notified when this is back in stock!', 'success');
      }
    } catch (error) {
      showToast(error.response?.data?.message || 'Failed to update alert', 'error');
    }
  };

  return (
    <motion.div 
      initial="initial"
      animate="animate"
      variants={staggerContainer}
      className="space-y-8"
    >
      {user?.isBlocked && (
        <motion.div variants={fadeUp} className="bg-red-50 border-l-4 border-red-500 p-4 rounded-r shadow-sm">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-red-700 font-bold">
                Your account has been blocked. You will not be able to place new orders.
              </p>
            </div>
          </div>
        </motion.div>
      )}

      {/* Banner Carousel */}
      <motion.div variants={fadeUp} className="relative h-48 md:h-80 w-full rounded-2xl overflow-hidden shadow-xl shadow-primary-500/10 group">
        {banners.map((banner, idx) => (
          <div key={banner.id} className={`absolute inset-0 transition-opacity duration-1000 ${idx === currentBanner ? 'opacity-100 z-10' : 'opacity-0 z-0'}`}>
            <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/40 to-transparent z-10"></div>
            <img src={banner.image} alt={banner.title} className="w-full h-full object-cover transform scale-105 group-hover:scale-110 transition duration-700" />
            <div className="absolute top-1/2 left-6 md:left-16 transform -translate-y-1/2 z-20">
              <h2 className="text-white text-3xl md:text-5xl font-black mb-4 tracking-tight drop-shadow-lg">{banner.title}</h2>
              <button className="bg-primary-600 hover:bg-primary-500 text-white px-6 py-2 md:px-8 md:py-3 rounded-xl font-bold transition shadow-lg shadow-primary-500/50 flex items-center">
                Shop Now <ArrowRight size={18} className="ml-2" />
              </button>
            </div>
          </div>
        ))}
        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex space-x-2 z-20">
          {banners.map((_, idx) => (
            <button key={idx} onClick={() => setCurrentBanner(idx)} className={`w-2 h-2 rounded-full transition-all ${idx === currentBanner ? 'w-8 bg-white' : 'w-2 bg-white/50 hover:bg-white/80'}`}></button>
          ))}
        </div>
      </motion.div>

      {/* Search Bar */}
      <motion.div variants={fadeUp} className="glass dark:bg-dark-800 p-4 sm:p-6 rounded-3xl shadow-sm border border-gray-100 dark:border-dark-700 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary-500/10 rounded-full mix-blend-multiply dark:mix-blend-lighten filter blur-3xl transform translate-x-1/2 -translate-y-1/2"></div>
        <div className="relative z-10 max-w-3xl mx-auto">
          <h1 className="text-2xl sm:text-3xl font-black text-gray-900 dark:text-white text-center mb-6 tracking-tight">What are you looking for?</h1>
          <form onSubmit={handleSearch} className="flex relative group">
            <input
              type="text"
              placeholder="Search for fresh groceries..."
              className="w-full pl-12 pr-4 py-4 rounded-2xl border-2 border-transparent bg-gray-100 dark:bg-dark-900 focus:bg-white dark:focus:bg-dark-800 focus:border-primary-500 focus:ring-4 focus:ring-primary-500/20 text-lg shadow-inner transition-all dark:text-white"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 group-focus-within:text-primary-500 transition-colors" size={24} />
            <button type="submit" className="absolute right-2 top-2 bottom-2 bg-primary-600 text-white px-6 rounded-xl font-bold hover:bg-primary-500 transition shadow-md shadow-primary-500/30">
              Search
            </button>
          </form>
        </div>
      </motion.div>

      {/* Categories */}
      <motion.div variants={fadeUp}>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-extrabold text-gray-900 dark:text-white tracking-tight">Categories</h2>
          {(activeCategory || search) && (
            <button onClick={clearFilters} className="text-primary-600 dark:text-primary-400 text-sm font-bold hover:text-primary-700 dark:hover:text-primary-300">
              Clear Filters
            </button>
          )}
        </div>
        
        <div className="flex overflow-x-auto pb-4 gap-4 scrollbar-hide snap-x">
          <div 
            onClick={clearFilters}
            className={`snap-start min-w-[100px] sm:min-w-[120px] flex-shrink-0 cursor-pointer rounded-2xl p-4 text-center border-2 transition-all ${!activeCategory && !search ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20 shadow-md shadow-primary-500/10 scale-105' : 'border-transparent bg-white dark:bg-dark-800 hover:border-gray-200 dark:hover:border-dark-600 shadow-sm'}`}
          >
            <div className="w-14 h-14 mx-auto bg-gray-100 dark:bg-dark-700 rounded-full flex items-center justify-center mb-3 shadow-inner">
              <span className="text-xl">🛒</span>
            </div>
            <p className="font-bold text-gray-800 dark:text-gray-200 text-xs sm:text-sm">All</p>
          </div>
          
          {categories.map((cat) => (
            <div 
              key={cat._id} 
              onClick={() => handleCategoryClick(cat._id)}
              className={`snap-start min-w-[100px] sm:min-w-[120px] flex-shrink-0 cursor-pointer rounded-2xl p-4 text-center border-2 transition-all ${activeCategory === cat._id ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20 shadow-md shadow-primary-500/10 scale-105' : 'border-transparent bg-white dark:bg-dark-800 hover:border-gray-200 dark:hover:border-dark-600 shadow-sm hover:-translate-y-1'}`}
            >
              <div className="w-14 h-14 mx-auto rounded-full p-0.5 border-2 border-transparent bg-gradient-to-tr from-primary-400 to-primary-600 mb-3">
                 <img src={cat.image?.startsWith('http') ? cat.image : `${import.meta.env.VITE_BACKEND_URL || "http://localhost:5000"}${cat.image}`} alt={cat.name} className="w-full h-full object-cover rounded-full border-2 border-white dark:border-dark-800" />
              </div>
              <p className="font-bold text-gray-800 dark:text-gray-200 text-xs sm:text-sm truncate">{cat.name}</p>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Products */}
      <motion.div variants={fadeUp} className="pb-24 lg:pb-8">
        <h2 className="text-2xl font-extrabold text-gray-900 dark:text-white mb-6 tracking-tight">
          {search ? `Search Results for "${search}"` : activeCategory ? `${categories.find(c => c._id === activeCategory)?.name} Products` : 'Trending Now'}
        </h2>
        
        {loading ? (
          <div className="flex justify-center py-20"><div className="animate-spin w-10 h-10 border-4 border-primary-500 border-t-transparent rounded-full drop-shadow-md"></div></div>
        ) : products.length === 0 ? (
          <div className="text-center py-20 glass rounded-3xl border border-gray-100 dark:border-dark-700">
            <span className="text-5xl mb-4 block">😕</span>
            <p className="text-gray-500 dark:text-gray-400 font-bold text-lg">No products found.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 sm:gap-6">
            {products.map((product) => (
              <Link key={product._id} to={`/product/${product._id}`} className={`bg-white dark:bg-dark-800 rounded-3xl shadow-sm border border-gray-100 dark:border-dark-700 overflow-hidden hover:shadow-xl transition-all duration-300 group block relative ${product.stock === 0 ? 'cursor-not-allowed opacity-90' : 'hover:-translate-y-1'}`}>
                <div className="relative pb-[100%] overflow-hidden bg-gray-50 dark:bg-dark-900">
                  <ProductImageCarousel 
                    images={product.images} 
                    altText={product.name} 
                    className={`absolute inset-0 w-full h-full object-contain transform transition-transform duration-700 ${product.stock === 0 ? 'grayscale filter blur-[2px]' : 'group-hover:scale-110'}`} 
                  />
                  {product.stock === 0 && (
                    <div className="absolute inset-0 bg-white/50 dark:bg-black/50 backdrop-blur-[2px] flex items-center justify-center z-10 transition-all duration-300 overflow-hidden">
                      <img src="/out-of-stock.png" alt="Out of Stock" className="w-3/4 object-contain opacity-90 drop-shadow-2xl transform -rotate-12" />
                    </div>
                  )}
                  {product.discountPrice > 0 && product.stock > 0 && (
                     <div className="absolute top-3 left-3 bg-red-500 text-white px-3 py-1 rounded-full font-black text-xs z-20 shadow-md shadow-red-500/50">
                        -{Math.round((1 - product.discountPrice/product.price) * 100)}%
                     </div>
                  )}
                </div>
                
                <div className="p-4 md:p-5">
                  <p className="text-[10px] sm:text-xs text-primary-600 dark:text-primary-400 font-black mb-1.5 uppercase tracking-wider">{product.category?.name}</p>
                  <h3 className={`font-bold text-sm sm:text-base mb-2 truncate transition-colors ${product.stock === 0 ? 'text-gray-400 dark:text-gray-500' : 'text-gray-800 dark:text-gray-100 group-hover:text-primary-600 dark:group-hover:text-primary-400'}`}>{product.name}</h3>
                  
                  <div className="flex items-center justify-between mt-4 relative z-20">
                    <div className="flex flex-col">
                      {product.discountPrice > 0 ? (
                        <>
                          <span className={`text-xs sm:text-sm line-through font-semibold ${product.stock === 0 ? 'text-gray-300 dark:text-gray-600' : 'text-gray-400 dark:text-gray-500'}`}>₹{product.price}</span>
                          <span className={`text-lg sm:text-xl font-black ${product.stock === 0 ? 'text-gray-500' : 'text-primary-600 dark:text-primary-400'}`}>₹{product.discountPrice}</span>
                        </>
                      ) : (
                        <span className={`text-lg sm:text-xl font-black ${product.stock === 0 ? 'text-gray-500' : 'text-gray-900 dark:text-white'}`}>₹{product.price}</span>
                      )}
                    </div>
                    
                    {(() => {
                      const cartItem = items?.find(i => i.product._id === product._id || i.product === product._id);
                      if (cartItem) {
                        return (
                          <div className="flex items-center space-x-1 bg-gray-100 dark:bg-dark-700 rounded-full p-1" onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}>
                            <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); updateQuantity(product._id, cartItem.quantity - 1); }} className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-white dark:bg-dark-600 flex items-center justify-center text-gray-700 dark:text-gray-200 shadow-sm hover:text-primary-600 transition-colors"><Minus size={14} /></button>
                            <span className="text-sm font-black w-4 text-center text-gray-900 dark:text-white">{cartItem.quantity}</span>
                            <button
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                if (cartItem.quantity >= product.stock) {
                                  showToast(`We only have ${product.stock} items available right now.`, 'error', { duration: 1500 });
                                } else {
                                  updateQuantity(product._id, cartItem.quantity + 1);
                                }
                              }}
                              className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-white dark:bg-dark-600 flex items-center justify-center text-gray-700 dark:text-gray-200 shadow-sm hover:text-primary-600 transition-colors"
                            >
                              <Plus size={14} />
                            </button>
                          </div>
                        );
                      } else {
                        return (
                          <button
                            onClick={(e) => {
                              if (product.stock > 0) handleAddToCart(product._id, e);
                              else handleNotifyMe(product._id, e);
                            }}
                            className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center transition-all shadow-sm
                              ${product.stock === 0 ? (alertedProductIds.includes(product._id) ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-gray-800 dark:bg-gray-200 text-white dark:text-gray-900 hover:scale-105') : 'bg-primary-50 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 hover:bg-primary-600 hover:text-white dark:hover:bg-primary-600 hover:shadow-primary-500/30'}`}
                            title={product.stock === 0 ? (alertedProductIds.includes(product._id) ? 'Alert Set' : 'Notify Me When Available') : 'Add to Cart'}
                          >
                            {product.stock === 0 ? (alertedProductIds.includes(product._id) ? <span className="font-bold text-xs">✓</span> : <Bell size={18} />) : <Plus size={20} />}
                          </button>
                        );
                      }
                    })()}
                  </div>
                </div>
                {/* Wishlist Button */}
                <button 
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    toggleWishlist(product._id);
                  }}
                  className={`absolute top-3 right-3 p-2 rounded-full shadow-lg transition-all z-10 backdrop-blur-md
                    ${wishlistIds.includes(product._id) ? 'bg-red-50 text-red-500 opacity-100 scale-110' : 'bg-white/80 dark:bg-dark-800/80 text-gray-400 opacity-0 group-hover:opacity-100 hover:text-red-500 hover:bg-white hover:scale-110'}`}
                  title={wishlistIds.includes(product._id) ? "Remove from wishlist" : "Add to wishlist"}
                >
                  <Heart size={18} fill={wishlistIds.includes(product._id) ? "currentColor" : "none"} className={wishlistIds.includes(product._id) ? 'drop-shadow-sm' : ''} />
                </button>
              </Link>
            ))}
          </div>
        )}
      </motion.div>
    </motion.div>
  );
};

export default Home;
