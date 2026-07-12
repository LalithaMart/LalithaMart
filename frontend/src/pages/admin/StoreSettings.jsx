import React, { useState, useEffect, useRef } from 'react';
import api from '../../services/api';
import { useUIStore } from '../../store/uiStore';
import { Save, Store, MapPin, Phone, Clock, Share2 } from 'lucide-react';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Interactive Map Component for Settings
function InteractiveMap({ settings, setSettings, showToast }) {
  const mapRef = useRef(null);
  const mapInstance = useRef(null);
  const markerInstance = useRef(null);

  useEffect(() => {
    if (!mapRef.current) return;
    
    const initialLat = settings?.location?.lat || 17.3850;
    const initialLng = settings?.location?.lng || 78.4867;

    if (!mapInstance.current) {
      mapInstance.current = L.map(mapRef.current).setView([initialLat, initialLng], 13);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap'
      }).addTo(mapInstance.current);
      
      markerInstance.current = L.marker([initialLat, initialLng], { draggable: true }).addTo(mapInstance.current);

      const updateAddressFromCoords = async (lat, lng) => {
        setSettings(prev => ({
          ...prev,
          location: { lat, lng }
        }));
        
        try {
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`);
          const data = await res.json();
          if (data && data.address) {
            setSettings(prev => ({
              ...prev,
              address: {
                ...prev.address,
                street: data.address.road || data.address.suburb || prev.address?.street || '',
                city: data.address.city || data.address.town || data.address.state_district || prev.address?.city || '',
                state: data.address.state || prev.address?.state || '',
                postalCode: data.address.postcode || prev.address?.postalCode || '',
                landmark: data.address.neighbourhood || prev.address?.landmark || ''
              }
            }));
            showToast('Address updated from map', 'success');
          }
        } catch (error) {
          console.error("Geocoding failed", error);
        }
      };

      mapInstance.current.on('click', (e) => {
        const { lat, lng } = e.latlng;
        markerInstance.current.setLatLng([lat, lng]);
        updateAddressFromCoords(lat, lng);
      });

      markerInstance.current.on('dragend', (e) => {
        const marker = e.target;
        const position = marker.getLatLng();
        updateAddressFromCoords(position.lat, position.lng);
      });
    } else {
      // Update marker if lat/lng changed externally (e.g. from inputs)
      if (settings?.location?.lat && settings?.location?.lng) {
        const currentPos = markerInstance.current.getLatLng();
        if (currentPos.lat !== Number(settings.location.lat) || currentPos.lng !== Number(settings.location.lng)) {
          const newPos = [Number(settings.location.lat), Number(settings.location.lng)];
          markerInstance.current.setLatLng(newPos);
          mapInstance.current.setView(newPos);
        }
      }
    }
  }, [settings?.location?.lat, settings?.location?.lng, setSettings, showToast]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (mapInstance.current) {
        mapInstance.current.remove();
        mapInstance.current = null;
        markerInstance.current = null;
      }
    };
  }, []);

  return <div ref={mapRef} style={{ height: '300px', width: '100%', zIndex: 0, borderRadius: '0.75rem' }} className="border border-gray-200 dark:border-dark-700 mt-4" />;
}

const StoreSettings = () => {
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
  }, []);

  const handleChange = (e, section) => {
    const { name, value } = e.target;
    if (section) {
      setSettings(prev => ({
        ...prev,
        [section]: {
          ...prev[section],
          [name]: value
        }
      }));
    } else {
      setSettings(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.put('/settings', settings);
      showToast('Store settings updated successfully', 'success');
    } catch (error) {
      showToast('Failed to update settings', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div></div>;
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex justify-between items-center bg-white dark:bg-dark-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-dark-700">
        <div>
          <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100">Store Settings</h2>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Manage public contact and business details.</p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center space-x-2 bg-primary-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-primary-700 disabled:opacity-50"
        >
          <Save size={20} />
          <span>{saving ? 'Saving...' : 'Save Settings'}</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Business Info */}
        <div className="bg-white dark:bg-dark-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-dark-700 space-y-4">
          <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100 flex items-center mb-4 border-b pb-2">
            <Store size={20} className="mr-2 text-primary-600" /> Business Information
          </h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Store Name</label>
              <input type="text" name="storeName" value={settings.storeName || ''} onChange={handleChange} className="w-full px-4 py-2 border border-gray-200 dark:border-dark-700 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description</label>
              <textarea name="description" value={settings.description || ''} onChange={handleChange} rows="3" className="w-full px-4 py-2 border border-gray-200 dark:border-dark-700 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"></textarea>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">GST Number (Optional)</label>
              <input type="text" name="gstNumber" value={settings.gstNumber || ''} onChange={handleChange} className="w-full px-4 py-2 border border-gray-200 dark:border-dark-700 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500" />
            </div>
          </div>
        </div>

        {/* Contact Info */}
        <div className="bg-white dark:bg-dark-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-dark-700 space-y-4">
          <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100 flex items-center mb-4 border-b pb-2">
            <Phone size={20} className="mr-2 text-primary-600" /> Contact Details
          </h3>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Primary Phone</label>
                <input type="text" name="phone" value={settings.phone || ''} onChange={handleChange} className="w-full px-4 py-2 border border-gray-200 dark:border-dark-700 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Alt Phone</label>
                <input type="text" name="altPhone" value={settings.altPhone || ''} onChange={handleChange} className="w-full px-4 py-2 border border-gray-200 dark:border-dark-700 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Support Email</label>
              <input type="email" name="supportEmail" value={settings.supportEmail || ''} onChange={handleChange} className="w-full px-4 py-2 border border-gray-200 dark:border-dark-700 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Business Email</label>
              <input type="email" name="email" value={settings.email || ''} onChange={handleChange} className="w-full px-4 py-2 border border-gray-200 dark:border-dark-700 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500" />
            </div>
          </div>
        </div>

        {/* Address & Location */}
        <div className="bg-white dark:bg-dark-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-dark-700 space-y-4">
          <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100 flex items-center mb-4 border-b pb-2">
            <MapPin size={20} className="mr-2 text-primary-600" /> Address & Location
          </h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Street Address</label>
              <input type="text" name="street" value={settings.address?.street || ''} onChange={(e) => handleChange(e, 'address')} className="w-full px-4 py-2 border border-gray-200 dark:border-dark-700 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">City</label>
                <input type="text" name="city" value={settings.address?.city || ''} onChange={(e) => handleChange(e, 'address')} className="w-full px-4 py-2 border border-gray-200 dark:border-dark-700 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">State</label>
                <input type="text" name="state" value={settings.address?.state || ''} onChange={(e) => handleChange(e, 'address')} className="w-full px-4 py-2 border border-gray-200 dark:border-dark-700 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Pincode</label>
                <input type="text" name="postalCode" value={settings.address?.postalCode || ''} onChange={(e) => handleChange(e, 'address')} className="w-full px-4 py-2 border border-gray-200 dark:border-dark-700 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Landmark</label>
                <input type="text" name="landmark" value={settings.address?.landmark || ''} onChange={(e) => handleChange(e, 'address')} className="w-full px-4 py-2 border border-gray-200 dark:border-dark-700 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4 pt-2">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Latitude</label>
                <input type="number" onWheel={(e) => e.target.blur()} step="any" name="lat" value={settings.location?.lat || ''} onChange={(e) => handleChange(e, 'location')} className="w-full px-4 py-2 border border-gray-200 dark:border-dark-700 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Longitude</label>
                <input type="number" onWheel={(e) => e.target.blur()} step="any" name="lng" value={settings.location?.lng || ''} onChange={(e) => handleChange(e, 'location')} className="w-full px-4 py-2 border border-gray-200 dark:border-dark-700 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500" />
              </div>
            </div>
            
            <InteractiveMap settings={settings} setSettings={setSettings} showToast={showToast} />
            <p className="text-xs text-gray-500 dark:text-gray-400 text-center mt-2">Click or drag the marker on the map to auto-fill your address details.</p>
          </div>
        </div>

        {/* Timings & Social */}
        <div className="space-y-6">
          <div className="bg-white dark:bg-dark-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-dark-700 space-y-4">
            <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100 flex items-center mb-4 border-b pb-2">
              <Clock size={20} className="mr-2 text-primary-600" /> Working Hours
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Store opens at</label>
                <input type="time" name="openingHours" value={settings.openingHours || ''} onChange={handleChange} className="w-full px-4 py-2 border border-gray-200 dark:border-dark-700 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Store closes at</label>
                <input type="time" name="closingHours" value={settings.closingHours || ''} onChange={handleChange} className="w-full px-4 py-2 border border-gray-200 dark:border-dark-700 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500" />
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-dark-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-dark-700 space-y-4">
            <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100 flex items-center mb-4 border-b pb-2">
              <Share2 size={20} className="mr-2 text-primary-600" /> Social Media
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">WhatsApp Number</label>
                <input type="text" name="whatsapp" value={settings.socialMedia?.whatsapp || ''} onChange={(e) => handleChange(e, 'socialMedia')} className="w-full px-4 py-2 border border-gray-200 dark:border-dark-700 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Instagram URL</label>
                <input type="text" name="instagram" value={settings.socialMedia?.instagram || ''} onChange={(e) => handleChange(e, 'socialMedia')} className="w-full px-4 py-2 border border-gray-200 dark:border-dark-700 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Facebook URL</label>
                <input type="text" name="facebook" value={settings.socialMedia?.facebook || ''} onChange={(e) => handleChange(e, 'socialMedia')} className="w-full px-4 py-2 border border-gray-200 dark:border-dark-700 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500" />
              </div>
            </div>
          </div>

          {/* Global Delivery Settings */}
          <div className="bg-white dark:bg-dark-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-dark-700 space-y-4">
            <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100 flex items-center mb-4 border-b pb-2">
              <Store size={20} className="mr-2 text-primary-600" /> Delivery Settings
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Default Delivery Fee (₹)</label>
                <input type="number" name="defaultDeliveryFee" value={settings.defaultDeliveryFee || 0} onChange={handleChange} className="w-full px-4 py-2 border border-gray-200 dark:border-dark-700 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Free Delivery Cart Value (₹)</label>
                <input type="number" name="defaultFreeDeliveryCartValue" value={settings.defaultFreeDeliveryCartValue || 0} onChange={handleChange} className="w-full px-4 py-2 border border-gray-200 dark:border-dark-700 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Default Partner Earning/Delivery (₹)</label>
                <input type="number" name="defaultDeliveryPartnerEarning" value={settings.defaultDeliveryPartnerEarning || 0} onChange={handleChange} className="w-full px-4 py-2 border border-gray-200 dark:border-dark-700 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500" />
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default StoreSettings;
