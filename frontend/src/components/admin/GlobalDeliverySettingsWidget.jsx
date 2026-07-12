import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { Store, Save } from 'lucide-react';
import { useUIStore } from '../../store/uiStore';

const GlobalDeliverySettingsWidget = ({ hideCustomerFees = false, hidePartnerEarning = false }) => {
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { showToast } = useUIStore();

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const { data } = await api.get('/settings');
        setSettings(data);
      } catch (error) {
        showToast('Failed to fetch store settings', 'error');
      } finally {
        setLoading(false);
      }
    };
    fetchSettings();
  }, [showToast]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setSettings(prev => ({ ...prev, [name]: value }));
  };

  const handleSave = async () => {
    if (!window.confirm('Are you sure you want to apply these global delivery settings?')) return;
    setSaving(true);
    try {
      await api.put('/settings', settings);
      showToast('Global delivery settings updated successfully', 'success');
    } catch (error) {
      showToast('Failed to update settings', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading || !settings) return null;

  return (
    <div className="bg-white dark:bg-dark-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-dark-700 space-y-4 mb-6">
      <div className="flex justify-between items-center mb-4 border-b border-gray-100 dark:border-dark-700 pb-2">
        <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100 flex items-center">
          <Store size={20} className="mr-2 text-primary-600" /> Global Delivery Settings
        </h3>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center bg-primary-600 text-white px-3 py-1.5 rounded-lg hover:bg-primary-700 transition disabled:opacity-70 text-sm font-medium"
        >
          <Save size={16} className="mr-2" />
          {saving ? 'Saving...' : 'Save Settings'}
        </button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {!hideCustomerFees && (
          <>
            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">Global Delivery Fee (₹)</label>
              <input type="number" name="defaultDeliveryFee" value={settings.defaultDeliveryFee || 0} onChange={handleChange} className="w-full px-3 py-2 border border-gray-200 dark:border-dark-700 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-gray-50 dark:bg-dark-900" />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">Free Delivery Cart Value (₹)</label>
              <input type="number" name="defaultFreeDeliveryCartValue" value={settings.defaultFreeDeliveryCartValue || 0} onChange={handleChange} className="w-full px-3 py-2 border border-gray-200 dark:border-dark-700 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-gray-50 dark:bg-dark-900" />
            </div>
          </>
        )}
        {!hidePartnerEarning && (
          <div>
            <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">Global Partner Earning (₹)</label>
            <input type="number" name="defaultDeliveryPartnerEarning" value={settings.defaultDeliveryPartnerEarning || 0} onChange={handleChange} className="w-full px-3 py-2 border border-gray-200 dark:border-dark-700 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-gray-50 dark:bg-dark-900" />
          </div>
        )}
      </div>
    </div>
  );
};

export default GlobalDeliverySettingsWidget;
