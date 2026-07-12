import User from '../models/User.js';
import Order from '../models/Order.js';

/**
 * @desc    Get user profile (self)
 * @route   GET /api/users/profile
 * @access  Private
 */
const getUserProfile = async (req, res) => {
  const user = await User.findById(req.user._id);

  if (user) {
    // If user has no customerId or partnerId, generate one on the fly and save
    let isSaved = false;
    if (!user.customerId && (user.role === 'customer' || user.role === 'admin')) {
      user.customerId = user.role === 'admin' ? 'CUST-00001' : `CUST-${Math.floor(10000 + Math.random() * 90000)}`;
      isSaved = true;
    }
    if (!user.partnerId && (user.role === 'delivery' || user.role === 'admin')) {
      user.partnerId = user.role === 'admin' ? 'PART-00001' : `PART-${Math.floor(10000 + Math.random() * 90000)}`;
      isSaved = true;
    }
    if (isSaved) {
      await user.save();
    }

    res.json({
      _id: user._id,
      name: user.name,
      phone: user.phone,
      email: user.email,
      customerId: user.customerId,
      partnerId: user.partnerId,
      verifiedId: user.verifiedId,
      role: user.role,
      savedAddresses: user.savedAddresses,
      isAvailable: user.isAvailable,
      stats: user.stats,
      customDeliveryFee: user.customDeliveryFee,
      customFreeDeliveryCartValue: user.customFreeDeliveryCartValue,
      customDeliveryEarning: user.customDeliveryEarning,
    });
  } else {
    res.status(404);
    throw new Error('User not found');
  }
};

/**
 * @desc    Update user profile / Add address
 * @route   PUT /api/users/profile
 * @access  Private
 */
const updateUserProfile = async (req, res) => {
  const user = await User.findById(req.user._id);

  if (user) {
    user.name = req.body.name || user.name;
    
    // Delivery partners cannot edit their own phone
    if (user.role !== 'delivery' && req.body.phone) {
      user.phone = req.body.phone;
    }
    
    if (req.body.email) {
      user.email = req.body.email;
    }
    
    // Only non-delivery can update their verifiedId if ever needed, but we don't expose it to customers anyway
    // Delivery partners cannot edit their own verifiedId
    
    // If adding a new address or updating an existing one
    if (req.body.address) {
      if (req.body.addressIndex !== undefined && req.body.addressIndex >= 0) {
        user.savedAddresses[req.body.addressIndex] = req.body.address;
      } else {
        user.savedAddresses.push(req.body.address);
      }
    }
    
    // If deleting an address
    if (req.body.deleteAddressIndex !== undefined && req.body.deleteAddressIndex >= 0) {
      user.savedAddresses.splice(req.body.deleteAddressIndex, 1);
    }
    
    // If setting default address
    if (req.body.setDefaultAddressIndex !== undefined && req.body.setDefaultAddressIndex >= 0) {
      user.savedAddresses = user.savedAddresses.map((addr, idx) => {
        addr.isDefault = (idx === req.body.setDefaultAddressIndex);
        return addr;
      });
    }
    
    // For Delivery partner toggle
    if (req.body.isAvailable !== undefined) {
      user.isAvailable = req.body.isAvailable;
    }

    if (req.body.password) {
      user.password = req.body.password;
    }

    const updatedUser = await user.save();
    
    // Broadcast status change to everyone (including admins)
    if (updatedUser.role === 'delivery') {
      const { getIO } = await import('../config/socket.js');
      getIO().emit('partner-status-updated', updatedUser);
    }

    res.json({
      _id: updatedUser._id,
      name: updatedUser.name,
      phone: updatedUser.phone,
      email: updatedUser.email,
      customerId: updatedUser.customerId,
      partnerId: updatedUser.partnerId,
      verifiedId: updatedUser.verifiedId,
      role: updatedUser.role,
      savedAddresses: updatedUser.savedAddresses,
      isAvailable: updatedUser.isAvailable,
      customDeliveryFee: updatedUser.customDeliveryFee,
      customFreeDeliveryCartValue: updatedUser.customFreeDeliveryCartValue,
      customDeliveryEarning: updatedUser.customDeliveryEarning,
    });
  } else {
    res.status(404);
    throw new Error('User not found');
  }
};

/**
 * @desc    Get all users (admin)
 * @route   GET /api/users
 * @access  Private/Admin
 */
const getUsers = async (req, res) => {
  let roleQuery = {};
  if (req.query.role) {
    if (req.query.role === 'customer' || req.query.role === 'delivery') {
      roleQuery = { role: { $in: [req.query.role, 'admin'] } };
    } else {
      roleQuery = { role: req.query.role };
    }
  }
  const users = await User.find(roleQuery).select('-password').lean();
  
  if (req.query.role === 'delivery') {
    const activeDeliveries = await Order.find({ status: 'Out for Delivery' }).select('deliveryPartner');
    const activePartnerIds = activeDeliveries.map(o => o.deliveryPartner.toString());
    
    users.forEach(user => {
      user.isOutForDelivery = activePartnerIds.includes(user._id.toString());
    });
  }

  res.json(users);
};

/**
 * @desc    Get user by ID
 * @route   GET /api/users/:id
 * @access  Private/Admin
 */
const getUserById = async (req, res) => {
  const user = await User.findById(req.params.id).select('-password');
  if (user) {
    res.json(user);
  } else {
    res.status(404);
    throw new Error('User not found');
  }
};

/**
 * @desc    Update user (Admin)
 * @route   PUT /api/users/:id
 * @access  Private/Admin
 */
const updateUser = async (req, res) => {
  const user = await User.findById(req.params.id);

  if (user) {
    user.name = req.body.name || user.name;
    user.phone = req.body.phone || user.phone;
    user.role = req.body.role || user.role;
    if (req.body.email !== undefined) user.email = req.body.email;
    if (req.body.verifiedId !== undefined) user.verifiedId = req.body.verifiedId;
    if (req.body.isBlocked !== undefined) user.isBlocked = req.body.isBlocked;
    if (req.body.isSuspended !== undefined) user.isSuspended = req.body.isSuspended;
    
    // Custom Delivery settings
    if (req.body.customDeliveryFee !== undefined) user.customDeliveryFee = req.body.customDeliveryFee;
    if (req.body.customFreeDeliveryCartValue !== undefined) user.customFreeDeliveryCartValue = req.body.customFreeDeliveryCartValue;
    if (req.body.customDeliveryEarning !== undefined) user.customDeliveryEarning = req.body.customDeliveryEarning;
    
    const updatedUser = await user.save();
    
    const { getIO } = await import('../config/socket.js');
    getIO().to(updatedUser._id.toString()).emit('user-updated', {
      _id: updatedUser._id,
      name: updatedUser.name,
      phone: updatedUser.phone,
      email: updatedUser.email,
      customerId: updatedUser.customerId,
      partnerId: updatedUser.partnerId,
      verifiedId: updatedUser.verifiedId,
      role: updatedUser.role,
      isBlocked: updatedUser.isBlocked,
      isSuspended: updatedUser.isSuspended,
      isApproved: updatedUser.isApproved,
      isAvailable: updatedUser.isAvailable,
      customDeliveryFee: updatedUser.customDeliveryFee,
      customFreeDeliveryCartValue: updatedUser.customFreeDeliveryCartValue,
      customDeliveryEarning: updatedUser.customDeliveryEarning
    });

    res.json({
      _id: updatedUser._id,
      name: updatedUser.name,
      phone: updatedUser.phone,
      email: updatedUser.email,
      verifiedId: updatedUser.verifiedId,
      role: updatedUser.role,
      isBlocked: updatedUser.isBlocked,
      isSuspended: updatedUser.isSuspended,
      customDeliveryFee: updatedUser.customDeliveryFee,
      customFreeDeliveryCartValue: updatedUser.customFreeDeliveryCartValue,
      customDeliveryEarning: updatedUser.customDeliveryEarning
    });
  } else {
    res.status(404);
    throw new Error('User not found');
  }
};

/**
 * @desc    Delete user
 * @route   DELETE /api/users/:id
 * @access  Private/Admin
 */
const deleteUser = async (req, res) => {
  const user = await User.findById(req.params.id);

  if (user) {
    await User.deleteOne({ _id: user._id });
    res.json({ message: 'User removed' });
  } else {
    res.status(404);
    throw new Error('User not found');
  }
};

/**
 * @desc    Approve user (Admin)
 * @route   PUT /api/users/:id/approve
 * @access  Private/Admin
 */
const approveUser = async (req, res) => {
  const user = await User.findById(req.params.id);

  if (user) {
    user.isApproved = true;
    const updatedUser = await user.save();
    
    res.json({
      _id: updatedUser._id,
      name: updatedUser.name,
      isApproved: updatedUser.isApproved,
    });
  } else {
    res.status(404);
    throw new Error('User not found');
  }
};

/**
 * @desc    Update delivery partner live location
 * @route   PUT /api/users/location
 * @access  Private/Delivery
 */
const updateLiveLocation = async (req, res) => {
  const { lat, lng } = req.body;
  const user = await User.findById(req.user._id);

  if (user && user.role === 'delivery') {
    user.liveLocation = {
      lat,
      lng,
      updatedAt: Date.now()
    };
    await user.save();
    
    // Broadcast to tracking room
    if (req.user.role === 'delivery') {
      import('../config/socket.js').then(({ getIO }) => {
        getIO().emit('partner-location-update', { partnerId: user._id, lat, lng });
      }).catch(err => console.error('Socket emit error:', err));
    }
    res.json(user.liveLocation);
  } else {
    res.status(404);
    throw new Error('Delivery partner not found');
  }
};

export {
  getUserProfile,
  updateUserProfile,
  getUsers,
  getUserById,
  updateUser,
  deleteUser,
  approveUser,
  updateLiveLocation,
};
