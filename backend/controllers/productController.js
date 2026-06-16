import Product from '../models/Product.js';
import StockAlert from '../models/StockAlert.js';
import Notification from '../models/Notification.js';
import { getIO } from '../config/socket.js';
import { clearCache } from '../middleware/cacheMiddleware.js';

/**
 * @desc    Get all products (with search and category filter)
 * @route   GET /api/products
 * @access  Public
 */
const getProducts = async (req, res) => {
  const keyword = req.query.keyword
    ? {
        name: {
          $regex: req.query.keyword,
          $options: 'i',
        },
      }
    : {};

  const categoryFilter = req.query.category ? { category: req.query.category } : {};

  const products = await Product.find({ ...keyword, ...categoryFilter })
    .populate('category', 'name')
    .sort({ priority: 1 })
    .lean();
  res.json(products);
};

/**
 * @desc    Get single product
 * @route   GET /api/products/:id
 * @access  Public
 */
const getProductById = async (req, res) => {
  const product = await Product.findById(req.params.id).populate('category', 'name');

  if (product) {
    res.json(product);
  } else {
    res.status(404);
    throw new Error('Product not found');
  }
};

/**
 * @desc    Create a product
 * @route   POST /api/products
 * @access  Private/Admin
 */
const createProduct = async (req, res) => {
  const { name, price, discountPrice, unit, sku, description, category, stock, priority } = req.body;
  
  const images = req.files ? req.files.map(file => file.path) : [];

  // Validate unique priority within category
  let assignedPriority = priority;
  if (assignedPriority !== undefined && assignedPriority !== '') {
    assignedPriority = Number(assignedPriority);
    const priorityExists = await Product.findOne({ category, priority: assignedPriority });
    if (priorityExists) {
      res.status(400);
      throw new Error(`Priority ${assignedPriority} is already assigned to another product in this category. Please choose a different priority.`);
    }
  } else {
    // Auto-suggest next priority
    const lastProd = await Product.findOne({ category }).sort('-priority');
    assignedPriority = lastProd ? lastProd.priority + 1 : 1;
  }

  const productId = `PRD-${Math.floor(10000 + Math.random() * 90000)}`;

  const product = new Product({
    productId,
    name,
    price,
    discountPrice,
    unit,
    sku,
    description,
    category,
    stock,
    priority: assignedPriority,
    images,
  });

  const createdProduct = await product.save();
  await clearCache('/api/products*');
  res.status(201).json(createdProduct);
};

/**
 * @desc    Update a product
 * @route   PUT /api/products/:id
 * @access  Private/Admin
 */
const updateProduct = async (req, res) => {
  const { name, price, discountPrice, unit, sku, description, category, stock, priority } = req.body;

  const product = await Product.findById(req.params.id);

  if (product) {
    const wasOutOfStock = product.stock === 0;
    
    if (priority !== undefined && priority !== '') {
      const newPriority = Number(priority);
      if (newPriority !== product.priority || category !== product.category.toString()) {
        const priorityExists = await Product.findOne({ category: category || product.category, priority: newPriority, _id: { $ne: product._id } });
        if (priorityExists) {
          res.status(400);
          throw new Error(`Priority ${newPriority} is already assigned to another product in this category. Please choose a different priority.`);
        }
      }
      product.priority = newPriority;
    }

    product.name = name || product.name;
    product.price = price || product.price;
    if (discountPrice !== undefined) product.discountPrice = discountPrice;
    if (unit !== undefined) product.unit = unit;
    if (sku !== undefined) product.sku = sku;
    product.description = description || product.description;
    product.category = category || product.category;
    product.stock = stock !== undefined ? stock : product.stock;

    if (req.files && req.files.length > 0) {
      product.images = req.files.map(file => file.path);
    }

    const updatedProduct = await product.save();

    if (wasOutOfStock && updatedProduct.stock > 0) {
      const alerts = await StockAlert.find({ product: updatedProduct._id, isActive: true }).populate('user');
      const io = getIO();
      
      for (const alert of alerts) {
        const notification = await Notification.create({
          title: 'Back in Stock 🎉',
          message: `${updatedProduct.name} is now back in stock! Grab it before it's gone.`,
          type: 'Stock',
          userId: alert.user._id,
          link: `/product/${updatedProduct._id}`,
          relatedId: updatedProduct._id,
          targetRole: 'specific'
        });
        
        io.to(alert.user._id.toString()).emit('new-notification', notification);
        
        alert.isActive = false;
        await alert.save();
      }
    }

    await clearCache('/api/products*');
    res.json(updatedProduct);
  } else {
    res.status(404);
    throw new Error('Product not found');
  }
};

/**
 * @desc    Delete a product
 * @route   DELETE /api/products/:id
 * @access  Private/Admin
 */
const deleteProduct = async (req, res) => {
  const product = await Product.findById(req.params.id);

  if (product) {
    await Product.deleteOne({ _id: product._id });
    await clearCache('/api/products*');
    res.json({ message: 'Product removed' });
  } else {
    res.status(404);
    throw new Error('Product not found');
  }
};

/**
 * @desc    Create new review
 * @route   POST /api/products/:id/reviews
 * @access  Private
 */
const createProductReview = async (req, res) => {
  const { rating, comment } = req.body;

  const product = await Product.findById(req.params.id);

  if (product) {
    const alreadyReviewed = product.reviews.find(
      (r) => r.user.toString() === req.user._id.toString()
    );

    if (alreadyReviewed) {
      res.status(400);
      throw new Error('Product already reviewed');
    }

    const review = {
      name: req.user.name,
      rating: Number(rating),
      comment,
      user: req.user._id,
    };

    product.reviews.push(review);

    product.rating =
      product.reviews.reduce((acc, item) => item.rating + acc, 0) /
      product.reviews.length;

    await product.save();
    res.status(201).json({ message: 'Review added' });
  } else {
    res.status(404);
    throw new Error('Product not found');
  }
};

/**
 * @desc    Update priorities of multiple products
 * @route   PUT /api/products/priority
 * @access  Private/Admin
 */
const updateProductPriorities = async (req, res) => {
  const { priorities } = req.body; // Array of { id, priority }
  
  if (!priorities || !Array.isArray(priorities)) {
    res.status(400);
    throw new Error('Invalid priorities data');
  }

  // Update all priorities in bulk
  for (const item of priorities) {
    await Product.findByIdAndUpdate(item.id, { priority: item.priority });
  }

  await clearCache('/api/products*');
  res.json({ message: 'Priorities updated successfully' });
};

/**
 * @desc    Get inventory stats
 * @route   GET /api/products/inventory/stats
 * @access  Private/Admin
 */
const getInventoryStats = async (req, res) => {
  const LOW_STOCK_THRESHOLD = 5;

  const totalProducts = await Product.countDocuments();
  const outOfStockCount = await Product.countDocuments({ stock: 0 });
  const lowStockCount = await Product.countDocuments({ stock: { $gt: 0, $lte: LOW_STOCK_THRESHOLD } });
  
  const products = await Product.find({}, 'stock');
  const availableStock = products.reduce((acc, curr) => acc + curr.stock, 0);

  res.json({
    totalProducts,
    availableStock,
    outOfStockCount,
    lowStockCount
  });
};

export {
  getProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  createProductReview,
  updateProductPriorities,
  getInventoryStats,
};
