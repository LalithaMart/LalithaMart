import { useState, useEffect } from 'react';
import api from '../../services/api';
import { Plus, Edit, Trash2, X, Box, Camera } from 'lucide-react';
import { compressImage } from '../../utils/imageCompression';

import { useUIStore } from '../../store/uiStore';
import { motion, AnimatePresence } from 'framer-motion';

const Categories = () => {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  
  const { showToast } = useUIStore();

  const [formData, setFormData] = useState({ name: '', description: '', priority: 0, isActive: true, image: null });
  const [editingId, setEditingId] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilterCategory, setSelectedFilterCategory] = useState('');
  const [fullscreenImage, setFullscreenImage] = useState(null);

  const fetchCategories = async () => {
    try {
      const { data } = await api.get('/categories');
      setCategories(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.imagePreview && !formData.image) {
      showToast('A category must have an image', 'error');
      return;
    }

    const data = new FormData();
    data.append('name', formData.name);
    data.append('description', formData.description);
    data.append('priority', formData.priority);
    data.append('isActive', formData.isActive);
    if (editingId) {
      data.append('existingImage', formData.imagePreview || '');
    }
    if (formData.image) {
      data.append('image', formData.image);
    }

    try {
      if (editingId) {
        await api.put(`/categories/${editingId}`, data);
      } else {
        await api.post('/categories', data);
      }
      setShowForm(false);
      setEditingId(null);
      setFormData({ name: '', description: '', priority: 0, isActive: true, image: null });
      fetchCategories();
      showToast('Category saved successfully', 'success');
    } catch (error) {
      console.error(error);
      showToast('Failed to save category', 'error');
    }
  };

  const handleEditClick = (cat) => {
    setFormData({ 
      name: cat.name, 
      description: cat.description || '', 
      priority: cat.priority || 0,
      isActive: cat.isActive !== undefined ? cat.isActive : true,
      image: null,
      imagePreview: cat.image
    });
    setEditingId(cat._id);
    setShowForm(true);
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingId(null);
    setFormData({ name: '', description: '', priority: 0, isActive: true, image: null });
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this category?')) {
      try {
        await api.delete(`/categories/${id}`);
        fetchCategories();
      } catch (error) {
        console.error(error);
      }
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:justify-between items-center bg-white dark:bg-dark-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-dark-700 gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100">Manage Categories</h2>
          <p className="text-gray-500 dark:text-gray-400 text-sm">Organize products and set display priorities.</p>
        </div>
        <div className="flex w-full md:w-auto space-x-3">
          <input 
            type="text" 
            placeholder="Search by name or priority..." 
            className="w-full md:w-64 px-4 py-2 border dark:border-dark-600 bg-white dark:bg-dark-900 text-gray-900 dark:text-white rounded-lg focus:ring-primary-500 focus:border-primary-500"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <select
            value={selectedFilterCategory}
            onChange={(e) => setSelectedFilterCategory(e.target.value)}
            className="px-4 py-2 border dark:border-dark-600 bg-white dark:bg-dark-900 text-gray-900 dark:text-white rounded-lg focus:ring-primary-500 focus:border-primary-500 max-w-xs"
          >
            <option value="">All Categories</option>
            {[...categories].sort((a, b) => a.name.localeCompare(b.name)).map(cat => (
              <option key={cat._id} value={cat._id}>{cat.name}</option>
            ))}
          </select>
          <button
            onClick={() => setShowForm(!showForm)}
            className="flex items-center bg-primary-600 whitespace-nowrap text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition"
          >
            <Plus size={20} className="mr-2" />
            Add Category
          </button>
        </div>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white dark:bg-dark-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-dark-700 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Category Name</label>
            <input
              type="text"
              required
              className="w-full px-4 py-2 border dark:border-dark-600 bg-white dark:bg-dark-900 text-gray-900 dark:text-white rounded-lg focus:ring-primary-500 focus:border-primary-500"
              value={formData.name}
              onChange={(e) => setFormData({...formData, name: e.target.value})}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description</label>
            <textarea
              className="w-full px-4 py-2 border dark:border-dark-600 bg-white dark:bg-dark-900 text-gray-900 dark:text-white rounded-lg focus:ring-primary-500 focus:border-primary-500"
              value={formData.description}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
            ></textarea>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Priority (Higher number = first)</label>
              <input type="number" onWheel={(e) => e.target.blur()}
                className="w-full px-4 py-2 border dark:border-dark-600 bg-white dark:bg-dark-900 text-gray-900 dark:text-white rounded-lg focus:ring-primary-500 focus:border-primary-500"
                value={formData.priority}
                onChange={(e) => setFormData({...formData, priority: e.target.value})}
              />
              {formData.priority !== '' && categories.some(c => String(c.priority) === String(formData.priority) && c._id !== editingId) && (
                <p className="text-red-500 text-xs mt-1">Warning: Priority already assigned to another category.</p>
              )}
            </div>
            <div className="flex items-end pb-2">
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  className="rounded border-gray-300 dark:border-dark-600 text-primary-600 focus:ring-primary-500 h-5 w-5"
                  checked={formData.isActive}
                  onChange={(e) => setFormData({...formData, isActive: e.target.checked})}
                />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Category is Active</span>
              </label>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Category Image {editingId && '(Leave blank to keep current)'}</label>
            <div className="flex gap-2 mb-3 flex-wrap">
              {formData.imagePreview && (
                <div className="relative group mt-2">
                  <img 
                    src={formData.imagePreview?.startsWith('http') ? formData.imagePreview : `${import.meta.env.VITE_BACKEND_URL || "http://localhost:5000"}${formData.imagePreview}`} 
                    alt="Category Preview" 
                    onClick={() => setFullscreenImage(formData.imagePreview)}
                    className="h-20 w-20 object-cover rounded-lg border-2 border-gray-200 dark:border-dark-700 cursor-pointer hover:opacity-80 transition" 
                  />
                  <div className="absolute inset-0 bg-black/40 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center pointer-events-none">
                     <span className="text-white text-xs font-bold px-1 text-center">Existing</span>
                  </div>
                  <button 
                    type="button"
                    onClick={async (e) => {
                      e.stopPropagation();
                      // Validation: prevent deleting the image if no new image is selected
                      if (!formData.image) {
                        showToast('A category must have an image', 'error');
                        return;
                      }

                      if (window.confirm("Remove this existing image?")) {
                        setFormData({ ...formData, imagePreview: null });
                        
                        if (editingId) {
                          try {
                            const instantData = new FormData();
                            instantData.append('existingImage', 'null');
                            await api.put(`/categories/${editingId}`, instantData);
                            showToast('Image deleted permanently', 'success');
                            fetchCategories();
                          } catch (err) {
                            console.error("Failed to delete image instantly", err.response?.data || err);
                            showToast(err.response?.data?.message || 'Failed to delete image instantly', 'error');
                          }
                        }
                      }
                    }}
                    className="absolute top-1 right-1 text-red-500 hover:text-red-700 bg-transparent p-1 drop-shadow-md transition z-10 opacity-0 group-hover:opacity-100"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              )}
              {formData.image && (
                <div className="relative group mt-2">
                  <img 
                    src={URL.createObjectURL(formData.image)} 
                    alt="New Preview" 
                    className="h-20 w-20 object-cover rounded-lg border-2 border-primary-300 dark:border-primary-700" 
                  />
                  <div className="absolute inset-0 bg-black/40 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center pointer-events-none">
                     <span className="text-white text-xs font-bold px-1 text-center">New</span>
                  </div>
                  <button 
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (window.confirm("Remove this newly captured image?")) {
                        setFormData({ ...formData, image: null });
                      }
                    }}
                    className="absolute top-1 right-1 text-red-500 hover:text-red-700 bg-transparent p-1 drop-shadow-md transition z-10 opacity-0 group-hover:opacity-100"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              )}
            </div>
            <div className="flex space-x-3">
              <label className="flex-1 cursor-pointer bg-gray-50 dark:bg-dark-900 border-2 border-dashed border-gray-300 dark:border-dark-700 rounded-xl p-4 flex flex-col items-center justify-center hover:border-primary-500 hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-all">
                <Box size={24} className="text-gray-400 dark:text-gray-500 mb-2" />
                <span className="text-sm font-medium text-gray-600 dark:text-gray-300">Upload Image</span>
                <input
                  type="file"
                  required={!editingId && !formData.image}
                  accept="image/*"
                  className="hidden"
                  onChange={async (e) => {
                    if (e.target.files[0]) {
                      const compressedFile = await compressImage(e.target.files[0]);
                      setFormData({...formData, image: compressedFile});
                    }
                  }}
                />
              </label>
              <label className="flex-1 cursor-pointer bg-gray-50 dark:bg-dark-900 border-2 border-dashed border-gray-300 dark:border-dark-700 rounded-xl p-4 flex flex-col items-center justify-center hover:border-primary-500 hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-all">
                <Camera size={24} className="text-gray-400 dark:text-gray-500 mb-2" />
                <span className="text-sm font-medium text-gray-600 dark:text-gray-300">Capture Image</span>
                <input
                  type="file"
                  required={!editingId && !formData.image}
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={async (e) => {
                    if (e.target.files[0]) {
                      const compressedFile = await compressImage(e.target.files[0]);
                      setFormData({...formData, image: compressedFile});
                    }
                  }}
                />
              </label>
            </div>
          </div>
          <div className="flex justify-end">
            <button type="button" onClick={handleCancel} className="px-4 py-2 text-gray-600 dark:text-gray-400 mr-2 hover:bg-gray-100 rounded-lg">Cancel</button>
            <button type="submit" className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700">
              {editingId ? 'Update Category' : 'Save Category'}
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <p className="text-gray-500 dark:text-gray-400">Loading categories...</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-4 gap-6">
          {categories
            .filter(cat => cat.name.toLowerCase().includes(searchQuery.toLowerCase()) || (cat.priority && cat.priority.toString().includes(searchQuery)))
            .filter(cat => selectedFilterCategory ? cat._id === selectedFilterCategory : true)
            .sort((a,b) => (a.priority || 0) - (b.priority || 0))
            .map((cat) => (
            <div key={cat._id} className="bg-white dark:bg-dark-800 rounded-xl shadow-sm border border-gray-100 dark:border-dark-700 overflow-hidden">
              <div className="relative">
                <img src={cat.image?.startsWith('http') ? cat.image : `${import.meta.env.VITE_BACKEND_URL || "http://localhost:5000"}${cat.image}`} alt={cat.name} className="w-full h-40 object-cover" />
                {!cat.isActive && (
                  <div className="absolute top-2 right-2 bg-red-100 text-red-800 text-xs px-2 py-1 rounded-full font-bold">
                    Inactive
                  </div>
                )}
              </div>
              <div className="p-4">
                <div className="flex justify-between items-start">
                  <h3 className="font-bold text-gray-800 dark:text-gray-100 text-lg">{cat.name}</h3>
                  <span className="text-xs text-gray-400 font-medium">Pri: {cat.priority}</span>
                </div>
                {cat.categoryId && <p className="text-xs text-gray-500 dark:text-gray-400 font-mono mt-1">{cat.categoryId}</p>}
                <p className="text-gray-500 dark:text-gray-400 text-sm mt-1 line-clamp-2">{cat.description}</p>
                <div className="flex justify-end mt-4 space-x-2">
                  <button onClick={() => handleEditClick(cat)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg">
                    <Edit size={18} />
                  </button>
                  <button onClick={() => handleDelete(cat._id)} className="p-2 text-red-600 hover:bg-red-50 dark:bg-red-900/20 rounded-lg">
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <AnimatePresence>
        {fullscreenImage && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setFullscreenImage(null)}
            className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-md flex items-center justify-center p-4"
          >
            <button 
              onClick={() => setFullscreenImage(null)}
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
              <img 
                src={fullscreenImage?.startsWith('http') ? fullscreenImage : `${import.meta.env.VITE_BACKEND_URL || "http://localhost:5000"}${fullscreenImage}`} 
                alt="Fullscreen Preview" 
                className="max-w-full max-h-[90vh] object-contain rounded-xl shadow-2xl"
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
};

export default Categories;
