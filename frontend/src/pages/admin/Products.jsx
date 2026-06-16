import { useState, useEffect } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import api from '../../services/api';
import { Plus, Edit, Trash2, X, ChevronLeft, ChevronRight } from 'lucide-react';
import ProductImageCarousel from '../../components/ProductImageCarousel';
import { useUIStore } from '../../store/uiStore';
import { motion, AnimatePresence } from 'framer-motion';

const Products = () => {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [stats, setStats] = useState({ totalProducts: 0, availableStock: 0, outOfStockCount: 0, lowStockCount: 0 });
  const { showToast } = useUIStore();
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [fullscreenImages, setFullscreenImages] = useState([]);
  const [fullscreenIndex, setFullscreenIndex] = useState(0);

  const openFullscreen = (images, index) => {
    setFullscreenImages(images);
    setFullscreenIndex(index);
  };

  const nextImage = (e) => {
    e.stopPropagation();
    setFullscreenIndex((prev) => (prev + 1) % fullscreenImages.length);
  };

  const prevImage = (e) => {
    e.stopPropagation();
    setFullscreenIndex((prev) => (prev - 1 + fullscreenImages.length) % fullscreenImages.length);
  };

  const [formData, setFormData] = useState({ 
    name: '', 
    price: '', 
    discountPrice: '',
    unit: 'pcs',
    sku: '',
    description: '', 
    category: '', 
    stock: '', 
    priority: 0,
    images: null 
  });

  const [showLowStock, setShowLowStock] = useState(false);

  const fetchData = async () => {
    try {
      const [prodRes, catRes, statsRes] = await Promise.all([
        api.get('/products'),
        api.get('/categories'),
        api.get('/products/inventory/stats')
      ]);
      setProducts(prodRes.data);
      setCategories(catRes.data);
      setStats(statsRes.data);
      if(catRes.data.length > 0) {
        setFormData(prev => ({ ...prev, category: catRes.data[0]._id }));
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (!loading && products.length > 0) {
      const params = new URLSearchParams(location.search);
      const editId = params.get('edit');
      if (editId) {
        const productToEdit = products.find(p => p._id === editId || p.productId === editId);
        if (productToEdit) {
          // Open edit modal directly
          setFormData({ 
            name: productToEdit.name, 
            price: productToEdit.price, 
            discountPrice: productToEdit.discountPrice || '',
            unit: productToEdit.unit || 'pcs',
            sku: productToEdit.sku || '',
            description: productToEdit.description, 
            category: productToEdit.category?._id || productToEdit.category, 
            stock: productToEdit.stock, 
            priority: productToEdit.priority || 0,
            images: null,
            imagesPreview: productToEdit.images
          });
          setEditingId(productToEdit._id);
          setShowForm(true);
        }
      }
    }
  }, [location.search, loading, products]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (formData.discountPrice && Number(formData.discountPrice) >= Number(formData.price)) {
      showToast('Discount price must be less than the actual price', 'error');
      return;
    }

    const data = new FormData();
    data.append('name', formData.name);
    data.append('price', formData.price);
    data.append('discountPrice', formData.discountPrice || 0);
    data.append('unit', formData.unit);
    data.append('sku', formData.sku);
    data.append('description', formData.description);
    data.append('category', formData.category);
    data.append('stock', formData.stock);
    data.append('priority', formData.priority || 0);
    
    if (formData.images) {
      for(let i=0; i<formData.images.length; i++){
        data.append('images', formData.images[i]);
      }
    }

    try {
      if (editingId) {
        await api.put(`/products/${editingId}`, data);
      } else {
        await api.post('/products', data);
      }
      setShowForm(false);
      setEditingId(null);
      setFormData({ name: '', price: '', discountPrice: '', unit: 'pcs', sku: '', description: '', category: categories[0]?._id, stock: '', priority: 0, images: null });
      fetchData();
      showToast('Product saved successfully', 'success');
    } catch (error) {
      console.error(error);
      showToast('Failed to save product: ' + (error.response?.data?.message || error.message), 'error');
    }
  };

  const handleEditClick = (product) => {
    setFormData({ 
      name: product.name, 
      price: product.price, 
      discountPrice: product.discountPrice || '',
      unit: product.unit || 'pcs',
      sku: product.sku || '',
      description: product.description, 
      category: product.category._id, 
      stock: product.stock, 
      priority: product.priority || 0,
      images: null,
      imagesPreview: product.images
    });
    setEditingId(product._id);
    setShowForm(true);
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingId(null);
    setFormData({ name: '', price: '', discountPrice: '', unit: 'pcs', sku: '', description: '', category: categories[0]?._id, stock: '', priority: 0, images: null });
    if (location.search.includes('edit=')) {
      navigate('/admin/products', { replace: true });
    }
  };


  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this product?')) {
      try {
        await api.delete(`/products/${id}`);
        fetchData();
      } catch (error) {
        console.error(error);
      }
    }
  };

  const filteredProducts = products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) || p.category?.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStock = showLowStock ? p.stock <= 5 : true;
    return matchesSearch && matchesStock;
  });

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-dark-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-dark-700 transition-colors">
          <p className="text-gray-500 dark:text-gray-400 text-sm font-medium">Total Products</p>
          <p className="text-2xl font-bold text-gray-800 dark:text-gray-100">{stats.totalProducts}</p>
        </div>
        <div className="bg-white dark:bg-dark-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-dark-700 transition-colors">
          <p className="text-gray-500 dark:text-gray-400 text-sm font-medium">Available Stock</p>
          <p className="text-2xl font-bold text-primary-600 dark:text-primary-400">{stats.availableStock}</p>
        </div>
        <div className="bg-white dark:bg-dark-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-dark-700 transition-colors">
          <p className="text-gray-500 dark:text-gray-400 text-sm font-medium">Low Stock Items</p>
          <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">{stats.lowStockCount}</p>
        </div>
        <div className="bg-white dark:bg-dark-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-dark-700 transition-colors">
          <p className="text-gray-500 dark:text-gray-400 text-sm font-medium">Out of Stock</p>
          <p className="text-2xl font-bold text-red-600 dark:text-red-400">{stats.outOfStockCount}</p>
        </div>
      </div>

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white dark:bg-dark-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-dark-700 gap-4 transition-colors">
        <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100">Manage Products</h2>
        <div className="flex flex-wrap items-center gap-4 w-full md:w-auto">
          <input 
            type="text" 
            placeholder="Search products..." 
            className="flex-1 md:w-64 px-4 py-2 bg-transparent border border-gray-200 dark:border-dark-600 rounded-lg focus:ring-primary-500 focus:border-primary-500 text-gray-900 dark:text-gray-100"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <label className="flex items-center space-x-2 cursor-pointer bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 px-3 py-2 rounded-lg border border-red-100 dark:border-red-900/30">
            <input 
              type="checkbox" 
              className="rounded text-red-600 dark:text-red-500 focus:ring-red-500" 
              checked={showLowStock} 
              onChange={(e) => setShowLowStock(e.target.checked)} 
            />
            <span className="text-sm font-bold">Low Stock Alerts</span>
          </label>
          <button
            onClick={() => { setShowForm(!showForm); setEditingId(null); setFormData({ name: '', price: '', discountPrice: '', unit: 'pcs', sku: '', description: '', category: categories[0]?._id, stock: '', images: null }); }}
            className="flex items-center whitespace-nowrap bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition"
          >
            <Plus size={20} className="mr-2" />
            Add Product
          </button>
        </div>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white dark:bg-dark-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-dark-700 space-y-4 transition-colors">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Product Name</label>
              <input type="text" required className="w-full px-4 py-2 bg-transparent border border-gray-200 dark:border-dark-600 rounded-lg focus:ring-primary-500 focus:border-primary-500 text-gray-900 dark:text-white" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Category</label>
              <select required className="w-full px-4 py-2 bg-transparent border border-gray-200 dark:border-dark-600 rounded-lg focus:ring-primary-500 focus:border-primary-500 text-gray-900 dark:text-white" value={formData.category} onChange={(e) => setFormData({...formData, category: e.target.value})}>
                {categories.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Stock Availability</label>
              <input type="number" onWheel={(e) => e.target.blur()} min="0" required className="w-full px-4 py-2 bg-transparent border border-gray-200 dark:border-dark-600 rounded-lg focus:ring-primary-500 focus:border-primary-500 text-gray-900 dark:text-white" value={formData.stock} onChange={(e) => setFormData({...formData, stock: e.target.value})} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Price (₹)</label>
              <input type="number" onWheel={(e) => e.target.blur()} min="0" required className="w-full px-4 py-2 bg-transparent border border-gray-200 dark:border-dark-600 rounded-lg focus:ring-primary-500 focus:border-primary-500 text-gray-900 dark:text-white" value={formData.price} onChange={(e) => setFormData({...formData, price: e.target.value})} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Discount Price (₹) <span className="text-gray-400 font-normal">(Optional)</span></label>
              <input type="number" onWheel={(e) => e.target.blur()} min="0" className="w-full px-4 py-2 bg-transparent border border-gray-200 dark:border-dark-600 rounded-lg focus:ring-primary-500 focus:border-primary-500 text-gray-900 dark:text-white" value={formData.discountPrice} onChange={(e) => setFormData({...formData, discountPrice: e.target.value})} />
              {formData.discountPrice !== '' && formData.price !== '' && Number(formData.discountPrice) >= Number(formData.price) && (
                <p className="text-red-500 text-xs mt-1">Warning: Discount price must be less than actual price.</p>
              )}
            </div>
            <div className="flex gap-2">
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Unit</label>
                <select className="w-full px-4 py-2 bg-transparent border border-gray-200 dark:border-dark-600 rounded-lg focus:ring-primary-500 focus:border-primary-500 text-gray-900 dark:text-white" value={formData.unit} onChange={(e) => setFormData({...formData, unit: e.target.value})}>
                  <option value="pcs">Pieces (pcs)</option>
                  <option value="kg">Kilograms (kg)</option>
                  <option value="g">Grams (g)</option>
                  <option value="ltr">Liters (ltr)</option>
                  <option value="ml">Milliliters (ml)</option>
                </select>
              </div>
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">SKU</label>
                <input type="text" className="w-full px-4 py-2 bg-transparent border border-gray-200 dark:border-dark-600 rounded-lg focus:ring-primary-500 focus:border-primary-500 text-gray-900 dark:text-white" value={formData.sku} onChange={(e) => setFormData({...formData, sku: e.target.value})} />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Priority No.</label>
              <input type="number" onWheel={(e) => e.target.blur()} className="w-full px-4 py-2 bg-transparent border border-gray-200 dark:border-dark-600 rounded-lg focus:ring-primary-500 focus:border-primary-500 text-gray-900 dark:text-white" value={formData.priority} onChange={(e) => setFormData({...formData, priority: e.target.value})} placeholder="Auto-assigned if empty" />
              {formData.priority !== '' && products.some(p => (p.category?._id === formData.category || p.category === formData.category) && String(p.priority) === String(formData.priority) && p._id !== editingId) && (
                <p className="text-red-500 text-xs mt-1">Warning: Priority already assigned in this category.</p>
              )}
            </div>
            <div className="md:col-span-2 lg:col-span-3">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description</label>
              <textarea rows="3" required className="w-full px-4 py-2 bg-transparent border border-gray-200 dark:border-dark-600 rounded-lg focus:ring-primary-500 focus:border-primary-500 text-gray-900 dark:text-white" value={formData.description} onChange={(e) => setFormData({...formData, description: e.target.value})}></textarea>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Product Images {editingId && '(Leave blank to keep current)'}</label>
            {editingId && formData.imagesPreview && formData.imagesPreview.length > 0 && (
              <div className="flex gap-2 mb-2 flex-wrap">
                {formData.imagesPreview.map((img, idx) => (
                  <img 
                    key={idx} 
                    src={img?.startsWith('http') ? img : `${import.meta.env.VITE_BACKEND_URL || "http://localhost:5000"}${img}`} 
                    alt="Preview" 
                    onClick={() => openFullscreen(formData.imagesPreview, idx)}
                    className="h-16 w-16 object-cover rounded-lg border border-gray-200 dark:border-dark-700 cursor-pointer hover:opacity-80 transition" 
                  />
                ))}
              </div>
            )}
            <input type="file" multiple required={!editingId} accept="image/*" className="w-full text-gray-700 dark:text-gray-300" onChange={(e) => setFormData({...formData, images: e.target.files})} />
          </div>
          <div className="flex justify-end pt-2">
            <button type="button" onClick={handleCancel} className="px-4 py-2 text-gray-600 mr-2 hover:bg-gray-100 rounded-lg">Cancel</button>
            <button type="submit" className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700">
              {editingId ? 'Update Product' : 'Save Product'}
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <p className="text-gray-500 dark:text-gray-400">Loading products...</p>
      ) : (
        <div className="space-y-4">
          {categories.map((cat) => {
            const catProducts = filteredProducts.filter(p => p.category?._id === cat._id).sort((a,b) => (a.priority || 0) - (b.priority || 0));
            if (catProducts.length === 0) return null;

            return (
              <div key={cat._id} className="bg-white dark:bg-dark-800 rounded-xl shadow-sm border border-gray-100 dark:border-dark-700 overflow-hidden transition-colors">
                <div className="bg-gray-50 dark:bg-dark-900/50 px-6 py-4 border-b border-gray-100 dark:border-dark-700 flex justify-between items-center cursor-pointer">
                  <h3 className="font-bold text-gray-800 dark:text-gray-100 text-lg">{cat.name} <span className="text-sm font-normal text-gray-500 dark:text-gray-400 ml-2">({catProducts.length} items)</span></h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="text-gray-500 dark:text-gray-400 text-sm border-b border-gray-100 dark:border-dark-700">
                        <th className="p-4 font-medium w-1/2">Product</th>
                        <th className="p-4 font-medium">Price</th>
                        <th className="p-4 font-medium">Stock</th>
                        <th className="p-4 font-medium text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-dark-700">
                      {catProducts.map((product) => (
                        <tr key={product._id} className="hover:bg-gray-50 dark:hover:bg-dark-700/50 transition-colors">
                          <td className="p-4">
                            <div className="flex items-center">
                              <div className="w-10 h-10 mr-3 relative rounded overflow-hidden">
                                <ProductImageCarousel 
                                  images={product.images} 
                                  altText={product.name} 
                                  className="absolute inset-0 w-full h-full object-contain" 
                                />
                              </div>
                              <div>
                                <p className="font-medium text-gray-800 dark:text-gray-100">{product.name} {product.priority > 0 && <span className="text-xs text-primary-600 dark:text-primary-400 font-bold ml-1">P{product.priority}</span>}</p>
                                {product.productId && <p className="text-xs text-gray-400 font-mono">{product.productId}</p>}
                                <p className="text-xs text-gray-500 dark:text-gray-400 truncate w-48">{product.description}</p>
                              </div>
                            </div>
                          </td>
                          <td className="p-4 text-sm font-medium text-gray-800 dark:text-gray-100">
                            {product.discountPrice > 0 ? (
                                <><span className="line-through text-gray-400 dark:text-gray-500 mr-1">₹{product.price}</span> ₹{product.discountPrice}</>
                            ) : `₹${product.price}`}
                          </td>
                          <td className="p-4 text-sm text-gray-600 dark:text-gray-300">{product.stock}</td>
                          <td className="p-4 text-right">
                            <button onClick={() => handleEditClick(product)} className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg mr-1"><Edit size={18} /></button>
                            <button onClick={() => handleDelete(product._id)} className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg"><Trash2 size={18} /></button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })}
          {filteredProducts.length === 0 && (
            <div className="p-8 text-center bg-white dark:bg-dark-800 rounded-xl text-gray-500 dark:text-gray-400 border border-gray-100 dark:border-dark-700 shadow-sm transition-colors">No products found matching your search.</div>
          )}
        </div>
      )}

      <AnimatePresence>
        {fullscreenImages.length > 0 && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setFullscreenImages([])}
            className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-md flex items-center justify-center p-4"
          >
            <button 
              onClick={() => setFullscreenImages([])}
              className="absolute top-4 right-4 text-white hover:text-red-500 transition w-10 h-10 flex items-center justify-center bg-white/10 hover:bg-white/20 rounded-full"
            >
              <X size={24} />
            </button>
            
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative max-w-5xl w-full max-h-[90vh] flex items-center justify-center"
              onClick={(e) => e.stopPropagation()}
            >
              {fullscreenImages.length > 1 && (
                <button 
                  onClick={prevImage}
                  className="absolute left-4 z-10 text-white bg-black/50 hover:bg-black/80 p-3 rounded-full transition"
                >
                  <ChevronLeft size={32} />
                </button>
              )}
              
              <img 
                src={fullscreenImages[fullscreenIndex]?.startsWith('http') ? fullscreenImages[fullscreenIndex] : `${import.meta.env.VITE_BACKEND_URL || "http://localhost:5000"}${fullscreenImages[fullscreenIndex]}`} 
                alt="Fullscreen Preview" 
                className="max-w-full max-h-[90vh] object-contain rounded-xl shadow-2xl"
              />
              
              {fullscreenImages.length > 1 && (
                <button 
                  onClick={nextImage}
                  className="absolute right-4 z-10 text-white bg-black/50 hover:bg-black/80 p-3 rounded-full transition"
                >
                  <ChevronRight size={32} />
                </button>
              )}
              
              {fullscreenImages.length > 1 && (
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/60 px-4 py-2 rounded-full text-white text-sm font-bold shadow-lg backdrop-blur-sm">
                  {fullscreenIndex + 1} / {fullscreenImages.length}
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
};

export default Products;
