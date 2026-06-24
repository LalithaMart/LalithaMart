import Category from '../models/Category.js';
import { clearCache } from '../middleware/cacheMiddleware.js';

/**
 * @desc    Get all categories
 * @route   GET /api/categories
 * @access  Public
 */
const getCategories = async (req, res) => {
  const categories = await Category.find({});
  res.json(categories);
};

/**
 * @desc    Create a category
 * @route   POST /api/categories
 * @access  Private/Admin
 */
const createCategory = async (req, res) => {
  const { name, description, priority, isActive } = req.body;
  // Handling image upload (assume multer saves to req.file)
  const image = req.file ? req.file.path : null;

  if (!name || !image) {
    res.status(400);
    throw new Error('Name and image are required');
  }

  const categoryExists = await Category.findOne({ name });
  if (categoryExists) {
    res.status(400);
    throw new Error('Category already exists');
  }

  // Validate unique priority
  let assignedPriority = priority;
  if (assignedPriority !== undefined && assignedPriority !== '') {
    assignedPriority = Number(assignedPriority);
    const priorityExists = await Category.findOne({ priority: assignedPriority });
    if (priorityExists) {
      res.status(400);
      throw new Error(`Priority ${assignedPriority} is already assigned to another category. Please choose a different priority.`);
    }
  } else {
    // Auto-suggest next priority
    const lastCat = await Category.findOne().sort('-priority');
    assignedPriority = lastCat ? lastCat.priority + 1 : 1;
  }

  const categoryId = `CAT-${Math.floor(10000 + Math.random() * 90000)}`;

  const category = await Category.create({
    categoryId,
    name,
    image,
    description,
    priority: assignedPriority,
    isActive: isActive !== undefined ? isActive : true,
  });

  await clearCache('/api/categories*');
  res.status(201).json(category);
};

/**
 * @desc    Update a category
 * @route   PUT /api/categories/:id
 * @access  Private/Admin
 */
const updateCategory = async (req, res) => {
  const { name, description, priority, isActive } = req.body;
  const category = await Category.findById(req.params.id);

  if (category) {
    category.name = name || category.name;
    category.description = description || category.description;
    if (priority !== undefined) category.priority = priority;
    if (isActive !== undefined) category.isActive = isActive;
    
    if (req.file) {
      category.image = req.file.path;
    } else if (req.body.existingImage === '' || req.body.existingImage === 'null') {
      category.image = '';
    }

    const updatedCategory = await category.save();
    await clearCache('/api/categories*');
    res.json(updatedCategory);
  } else {
    res.status(404);
    throw new Error('Category not found');
  }
};

/**
 * @desc    Delete a category
 * @route   DELETE /api/categories/:id
 * @access  Private/Admin
 */
const deleteCategory = async (req, res) => {
  const category = await Category.findById(req.params.id);

  if (category) {
    await Category.deleteOne({ _id: category._id });
    await clearCache('/api/categories*');
    res.json({ message: 'Category removed' });
  } else {
    res.status(404);
    throw new Error('Category not found');
  }
};

/**
 * @desc    Update priorities of multiple categories
 * @route   PUT /api/categories/priority
 * @access  Private/Admin
 */
const updateCategoryPriorities = async (req, res) => {
  const { priorities } = req.body; // Array of { id, priority }
  
  if (!priorities || !Array.isArray(priorities)) {
    res.status(400);
    throw new Error('Invalid priorities data');
  }

  // Update all priorities in bulk
  for (const item of priorities) {
    await Category.findByIdAndUpdate(item.id, { priority: item.priority });
  }

  await clearCache('/api/categories*');
  res.json({ message: 'Priorities updated successfully' });
};

export { getCategories, createCategory, updateCategory, deleteCategory, updateCategoryPriorities };
