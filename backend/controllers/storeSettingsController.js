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
