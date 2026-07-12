import StoreSettings from '../models/StoreSettings.js';

/**
 * @desc    Get store settings
 * @route   GET /api/settings
 * @access  Public
 */
export const getStoreSettings = async (req, res) => {
  let settings = await StoreSettings.findOne();
  if (!settings) {
    settings = await StoreSettings.create({});
  }
  res.json(settings);
};

/**
 * @desc    Get delivery configuration for user
 * @route   GET /api/settings/delivery-config
 * @access  Private
 */
export const getDeliveryConfig = async (req, res) => {
  let settings = await StoreSettings.findOne();
  if (!settings) {
    settings = await StoreSettings.create({});
  }
  
  const user = req.user; // from protect middleware
  
  const appliedDeliveryFee = user.customDeliveryFee !== null && user.customDeliveryFee !== undefined 
    ? user.customDeliveryFee 
    : settings.defaultDeliveryFee;
    
  const appliedFreeDeliveryCartValue = user.customFreeDeliveryCartValue !== null && user.customFreeDeliveryCartValue !== undefined 
    ? user.customFreeDeliveryCartValue 
    : settings.defaultFreeDeliveryCartValue;

  res.json({
    appliedDeliveryFee,
    appliedFreeDeliveryCartValue,
    source: (user.customDeliveryFee !== null && user.customDeliveryFee !== undefined) || (user.customFreeDeliveryCartValue !== null && user.customFreeDeliveryCartValue !== undefined) ? 'Individual' : 'Global'
  });
};

/**
 * @desc    Update store settings
 * @route   PUT /api/settings
 * @access  Private/Admin
 */
export const updateStoreSettings = async (req, res) => {
  let settings = await StoreSettings.findOne();
  if (!settings) {
    settings = await StoreSettings.create({});
  }

  // Assign everything deeply
  Object.assign(settings, req.body);

  const updatedSettings = await settings.save();
  res.json(updatedSettings);
};
