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
            images: null 
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

