import { useState, useEffect, useRef } from 'react';
import api from '../../services/api';
import { Plus, CheckCircle, XCircle, Package, X, Phone, MapPin, Maximize, Minimize } from 'lucide-react';
import { useUIStore } from '../../store/uiStore';

import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { useSocketStore } from '../../store/socketStore';
import GlobalDeliverySettingsWidget from '../../components/admin/GlobalDeliverySettingsWidget';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

const deliveryIcon = L.divIcon({
  className: 'custom-icon',
  html: `<div style="background-color: #3b82f6; width: 36px; height: 36px; border-radius: 50%; border: 3px solid white; box-shadow: 0 0 10px rgba(59, 130, 246, 0.6); display: flex; align-items: center; justify-content: center; font-size: 16px;">🛵</div>`,
  iconSize: [36, 36],
  iconAnchor: [18, 18]
});

const customerIcon = L.divIcon({
  className: 'custom-icon',
  html: `<div style="background-color: #ef4444; width: 24px; height: 24px; border-radius: 50%; border: 3px solid white; box-shadow: 0 0 8px rgba(239, 68, 68, 0.6);"></div>`,
  iconSize: [24, 24],
  iconAnchor: [12, 12]
});

function NativeSingleMarkerMap({ location, destinationLocation }) {
  const mapRef = useRef(null);
  const mapInstance = useRef(null);
  const markerInstance = useRef(null);
  const destMarkerInstance = useRef(null);
  const polylineInstance = useRef(null);

  useEffect(() => {
    if (!mapRef.current || !location) return;

    if (!mapInstance.current) {
      mapInstance.current = L.map(mapRef.current).setView([location.lat, location.lng], 15);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap'
      }).addTo(mapInstance.current);

      markerInstance.current = L.marker([location.lat, location.lng], { icon: deliveryIcon })
        .addTo(mapInstance.current)
        .bindPopup('<div style="font-weight: bold; font-family: sans-serif; color: #3b82f6;">Delivery Partner</div>');
    } else {
      markerInstance.current.setLatLng([location.lat, location.lng]);
    }

    if (destinationLocation) {
      if (destMarkerInstance.current) {
        destMarkerInstance.current.setLatLng([destinationLocation.lat, destinationLocation.lng]);
      } else {
        destMarkerInstance.current = L.marker([destinationLocation.lat, destinationLocation.lng], { icon: customerIcon })
          .addTo(mapInstance.current)
          .bindPopup('<div style="font-weight: bold; font-family: sans-serif;">Delivery Address</div>');
      }

      // Fetch OSRM Route
      const fetchRoute = async () => {
        try {
          const res = await fetch(`https://router.project-osrm.org/route/v1/driving/${location.lng},${location.lat};${destinationLocation.lng},${destinationLocation.lat}?overview=full&geometries=geojson`);
          const data = await res.json();
          if (data.routes && data.routes.length > 0) {
            const coordinates = data.routes[0].geometry.coordinates.map(coord => [coord[1], coord[0]]);
            if (polylineInstance.current) {
              polylineInstance.current.setLatLngs(coordinates);
            } else {
              polylineInstance.current = L.polyline(coordinates, { color: '#3b82f6', weight: 5, opacity: 0.8 }).addTo(mapInstance.current);
              mapInstance.current.fitBounds(polylineInstance.current.getBounds(), { padding: [50, 50] });
            }
          }
        } catch (error) {
          const linePoints = [
            [location.lat, location.lng],
            [destinationLocation.lat, destinationLocation.lng]
          ];
          if (polylineInstance.current) {
            polylineInstance.current.setLatLngs(linePoints);
          } else {
            polylineInstance.current = L.polyline(linePoints, { color: '#3b82f6', dashArray: '5, 10', weight: 4 }).addTo(mapInstance.current);
            mapInstance.current.fitBounds(polylineInstance.current.getBounds(), { padding: [50, 50] });
          }
        }
      };
      fetchRoute();
    } else {
      // No destination, just center on partner
      mapInstance.current.setView([location.lat, location.lng]);
      if (polylineInstance.current) {
        polylineInstance.current.remove();
        polylineInstance.current = null;
      }
      if (destMarkerInstance.current) {
        destMarkerInstance.current.remove();
        destMarkerInstance.current = null;
      }
    }
  }, [location, destinationLocation]);

  useEffect(() => {
    return () => {
      if (mapInstance.current) {
        mapInstance.current.remove();
        mapInstance.current = null;
      }
    };
  }, []);

  return <div ref={mapRef} className="w-full h-full" />;
}

const Partners = () => {
  const [partners, setPartners] = useState([]);
  const [allOrders, setAllOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [formData, setFormData] = useState({ name: '', phone: '', password: '' });
  const [searchTerm, setSearchTerm] = useState('');
  
  const [selectedPartner, setSelectedPartner] = useState(null);
  const [partnerDeliveries, setPartnerDeliveries] = useState([]);
  const [loadingDeliveries, setLoadingDeliveries] = useState(false);
  const [showMap, setShowMap] = useState(false);
  const [partnerLocation, setPartnerLocation] = useState(null);
  const [isMapMaximized, setIsMapMaximized] = useState(false);
  
  const { showToast } = useUIStore();
  const navigate = useNavigate();
  const { user, token, startImpersonating } = useAuthStore();
  const { socket } = useSocketStore();

  useEffect(() => {
    if (socket && selectedPartner) {
      const handleLocation = (data) => {
        if (data.partnerId === selectedPartner._id) {
          setPartnerLocation({ lat: data.lat, lng: data.lng });
        }
      };
      socket.on('partner-location-update', handleLocation);
      return () => socket.off('partner-location-update', handleLocation);
    }
  }, [socket, selectedPartner]);

  const fetchData = async () => {
    try {
      const [usersRes, ordersRes] = await Promise.all([
        api.get('/users?role=delivery'),
        api.get('/orders')
      ]);
      setPartners(usersRes.data);
      setAllOrders(ordersRes.data);
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
    if (socket) {
      const handlePartnerUpdate = (updatedPartner) => {
        setPartners(prev => prev.map(p => p._id === updatedPartner._id ? updatedPartner : p));
        if (selectedPartner && selectedPartner._id === updatedPartner._id) {
          setSelectedPartner(updatedPartner);
        }
      };
      socket.on('partner-status-updated', handlePartnerUpdate);
      return () => socket.off('partner-status-updated', handlePartnerUpdate);
    }
  }, [socket, selectedPartner]);

  const handleAddPartner = async (e) => {
    e.preventDefault();
    try {
      await api.post('/auth/register', { ...formData, role: 'delivery' });
      setShowForm(false);
      setFormData({ name: '', phone: '', password: '' });
      fetchData();
      showToast('Delivery partner added (Pending Approval)', 'success');
    } catch (error) {
      console.error(error);
      showToast(error.response?.data?.message || 'Failed to add delivery partner', 'error');
    }
  };

  const handleApprovePartner = async (e, id) => {
    e.stopPropagation();
    try {
      await api.put(`/users/${id}/approve`);
      fetchData();
      showToast('Delivery partner approved', 'success');
    } catch (error) {
      showToast('Failed to approve partner', 'error');
    }
  };

  const handlePartnerClick = (partner) => {
    setSelectedPartner(partner);
    setShowMap(false);
    setIsMapMaximized(false);
    setPartnerLocation(partner.liveLocation || null);
    setLoadingDeliveries(true);
    const filteredOrders = allOrders.filter(order => order.deliveryPartner?._id === partner._id);
    setPartnerDeliveries(filteredOrders);
    setLoadingDeliveries(false);
  };

  const handleDeletePartner = async (e, id) => {
    e.stopPropagation();
    if (window.confirm('Are you sure you want to delete/suspend this delivery partner?')) {
      try {
        await api.delete(`/users/${id}`);
        fetchData();
        showToast('Partner scheduled for deletion', 'success');
      } catch (error) {
        showToast('Failed to remove partner', 'error');
      }
    }
  };

  const handleUndoDeletePartner = async (e, id) => {
    e.stopPropagation();
    if (window.confirm('Are you sure you want to restore this deleted partner?')) {
      try {
        await api.put(`/users/${id}/undo-delete`);
        fetchData();
        showToast('Partner restored successfully', 'success');
      } catch (error) {
        showToast(error.response?.data?.message || 'Failed to restore partner', 'error');
      }
    }
  };

  const handleImpersonate = async () => {
    try {
      const { data } = await api.post(`/auth/impersonate/${selectedPartner._id}`);
      startImpersonating(data, data.token, user, token);
      showToast('Impersonating Delivery Partner', 'success');
      navigate('/delivery');
    } catch (error) {
      console.error(error);
      showToast(error.response?.data?.message || 'Failed to impersonate', 'error');
    }
  };

  const [filterStatus, setFilterStatus] = useState('all');

  const filteredPartners = partners.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()) || p.phone.includes(searchTerm));
  const sortedPartners = [...filteredPartners].sort((a, b) => {
    const idA = a.partnerId || '';
    const idB = b.partnerId || '';
    return idA.localeCompare(idB);
  });
  
  const pendingPartners = sortedPartners.filter(p => !p.isApproved);
  
  const isBlocked = (p) => p.isSuspended || p.isBlocked;
  const isDeleted = (p) => p.accountStatus === 'deleted_by_admin' || p.accountStatus === 'deleted_by_user';
  
  const activePartners = sortedPartners.filter(p => p.isApproved && !isBlocked(p) && !isDeleted(p) && p.isAvailable && (filterStatus === 'all' || filterStatus === 'active'));
  const inactivePartners = sortedPartners.filter(p => p.isApproved && !isBlocked(p) && !isDeleted(p) && !p.isAvailable && (filterStatus === 'all' || filterStatus === 'inactive'));
  const blockedPartners = sortedPartners.filter(p => p.isApproved && isBlocked(p) && !isDeleted(p) && (filterStatus === 'all' || filterStatus === 'blocked'));
  const deletedPartners = sortedPartners.filter(p => p.isApproved && isDeleted(p) && (filterStatus === 'all' || filterStatus === 'deleted'));

  const activeOrder = partnerDeliveries.find(o => o.status === 'Out for Delivery');
  const activeDestination = activeOrder ? activeOrder.deliveryAddress?.location : null;

  return (
    <div className="space-y-6 relative">
      <GlobalDeliverySettingsWidget hideCustomerFees={true} />
      <div className="flex flex-col md:flex-row justify-between md:items-center bg-white dark:bg-dark-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-dark-700 gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100">Delivery Partners</h2>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Manage delivery personnel and requests.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <input
            type="text"
            placeholder="Search partners..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="px-4 py-2 border border-gray-300 dark:border-dark-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none w-full md:w-64"
          />
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-4 py-2 border border-gray-300 dark:border-dark-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none bg-white dark:bg-dark-800"
          >
            <option value="all">All Partners</option>
            <option value="active">Active/Online</option>
            <option value="inactive">Inactive/Offline</option>
            <option value="blocked">Blocked / Suspended</option>
            <option value="deleted">Deleted</option>
          </select>
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition w-full md:w-auto justify-center"
          >
            <Plus size={20} className="mr-2" /> Add Partner
          </button>
        </div>
      </div>

      {pendingPartners.length > 0 && (
        <div>
          <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100 mb-4">Pending Requests</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {pendingPartners.map(partner => (
              <div 
                key={partner._id}
                className="bg-yellow-50 dark:bg-yellow-900/20 border dark:border-dark-600 bg-white dark:bg-dark-900 text-gray-900 dark:text-white border-yellow-200 dark:border-yellow-900/30 rounded-xl p-6 hover:shadow-md transition"
              >
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="font-bold text-lg text-gray-800 dark:text-gray-100">{partner.name}</h3>
                    {partner.partnerId && <p className="text-xs text-gray-400 font-mono mt-0.5">{partner.partnerId}</p>}
                    <p className="text-gray-500 dark:text-gray-400 text-sm">{partner.phone}</p>
                  </div>
                  <span className="bg-yellow-100 text-yellow-800 dark:text-yellow-400 text-xs px-2 py-1 rounded-full font-medium">Pending Approval</span>
                </div>
                
                <div className="flex gap-2 mt-4 pt-4 border-t border-yellow-200 dark:border-yellow-900/30">
                  <button 
                    onClick={(e) => handleApprovePartner(e, partner._id)}
                    className="flex-1 bg-green-600 hover:bg-green-700 text-white py-1.5 rounded-lg text-sm font-medium transition"
                  >
                    Accept
                  </button>
                  <button 
                    onClick={(e) => handleDeletePartner(e, partner._id)}
                    className="flex-1 bg-red-100 hover:bg-red-200 text-red-700 dark:text-red-400 py-1.5 rounded-lg text-sm font-medium transition"
                  >
                    Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {(filterStatus === 'all' || filterStatus === 'active') && (
        <div>
          <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100 mb-4 mt-8">Active Partners</h3>
          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
            </div>
          ) : activePartners.length === 0 ? (
            <div className="bg-white dark:bg-dark-800 rounded-xl shadow-sm border border-gray-100 dark:border-dark-700 p-12 text-center">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">No active delivery partners</h3>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {activePartners.map((partner) => {
                const completedDeliveries = allOrders.filter(o => o.deliveryPartner?._id === partner._id && o.status === 'Completed').length;
                return (
                <div 
                  key={partner._id} 
                  className="bg-white dark:bg-dark-800 rounded-xl shadow-sm border border-gray-100 dark:border-dark-700 overflow-hidden cursor-pointer hover:border-primary-300 transition"
                  onClick={() => handlePartnerClick(partner)}
                >
                  <div className="p-6">
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex items-center space-x-3 min-w-0 flex-1 mr-2">
                        <div className="h-10 w-10 shrink-0 rounded-full bg-green-100 text-green-600 flex items-center justify-center font-bold">
                          {partner.name.charAt(0)}
                        </div>
                        <div className="min-w-0 flex-1">
                          <h3 className="font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2 truncate">
                            <span className="truncate">{partner.name}</span>
                            <a 
                              href={`tel:${partner.phone}`} 
                              onClick={(e) => e.stopPropagation()} 
                              className="text-green-500 hover:text-green-600 bg-green-50 dark:bg-green-900/20 p-1.5 rounded-full transition-colors shrink-0"
                              title="Call Partner"
                            >
                              <Phone size={14} />
                            </a>
                          </h3>
                          {partner.partnerId && <p className="text-xs text-gray-400 font-mono mt-0.5">{partner.partnerId}</p>}
                          <p className="text-sm text-gray-500 dark:text-gray-400 truncate">{partner.phone}</p>
                        </div>
                      </div>
                      {partner.isAvailable ? (
                        <span className="flex items-center text-xs font-medium text-green-600 bg-green-50 dark:bg-green-900/20 px-2 py-1 rounded-full">
                          <CheckCircle size={14} className="mr-1" /> Online
                        </span>
                      ) : (
                        <span className="flex items-center text-xs font-medium text-gray-600 dark:text-gray-400 bg-gray-100 px-2 py-1 rounded-full">
                          <XCircle size={14} className="mr-1" /> Offline
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap justify-between items-center text-sm border-t border-gray-100 dark:border-dark-700 pt-4 mt-2 gap-2">
                      <span className="text-gray-500 dark:text-gray-400">Deliveries: <span className="font-bold text-gray-800 dark:text-gray-100">{completedDeliveries}</span></span>
                      <div className="flex flex-wrap gap-2">
                        {partner.role !== 'admin' && (
                          <>
                              <button 
                                onClick={async (e) => {
                                  e.stopPropagation();
                                  if (!window.confirm('Are you sure you want to suspend this partner?')) return;
                                  try {
                                    await api.put(`/users/${partner._id}`, { isSuspended: true });
                                    fetchData();
                                    showToast('Partner suspended', 'success');
                                  } catch (error) {
                                    showToast('Failed to suspend', 'error');
                                  }
                                }}
                                className="px-3 py-1 rounded-full text-xs font-bold whitespace-nowrap inline-block bg-gray-100 text-gray-700 dark:text-gray-300 hover:bg-red-50 dark:bg-red-900/20 hover:text-red-700 dark:text-red-400"
                              >
                                Suspend
                              </button>
                              {partner.accountStatus === 'deleted_by_admin' ? (
                                <button onClick={(e) => handleUndoDeletePartner(e, partner._id)} className="px-3 py-1 rounded-full text-xs font-bold whitespace-nowrap inline-block bg-blue-50 dark:bg-blue-900/20 text-blue-600 hover:bg-blue-100">Undo Delete</button>
                              ) : (
                                <button onClick={(e) => handleDeletePartner(e, partner._id)} className="px-3 py-1 rounded-full text-xs font-bold whitespace-nowrap inline-block bg-red-50 dark:bg-red-900/20 text-red-600 hover:bg-red-100">Delete</button>
                              )}
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {(filterStatus === 'all' || filterStatus === 'blocked') && (
        <div className="mt-8">
          <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100 mb-4">Blocked / Suspended Partners</h3>
          {blockedPartners.length === 0 ? (
            <p className="text-gray-500 dark:text-gray-400 text-sm">No blocked or suspended partners found.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {blockedPartners.map((partner) => {
              const completedDeliveries = allOrders.filter(o => o.deliveryPartner?._id === partner._id && o.status === 'Completed').length;
              return (
              <div 
                key={partner._id} 
                className="bg-orange-50 dark:bg-orange-900/20 rounded-xl shadow-sm border dark:border-dark-600 bg-white dark:bg-dark-900 text-gray-900 dark:text-white border-orange-200 dark:border-orange-900/30 overflow-hidden cursor-pointer hover:border-orange-300 transition"
                onClick={() => handlePartnerClick(partner)}
              >
                <div className="p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center space-x-3 min-w-0 flex-1 mr-2">
                      <div className="h-10 w-10 shrink-0 rounded-full bg-orange-200 text-orange-700 dark:text-orange-400 flex items-center justify-center font-bold">
                        {partner.name.charAt(0)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2 truncate">
                          <span className="truncate">{partner.name}</span>
                        </h3>
                        {partner.partnerId && <p className="text-xs text-gray-400 font-mono mt-0.5">{partner.partnerId}</p>}
                        <p className="text-sm text-gray-500 dark:text-gray-400 truncate">{partner.phone}</p>
                      </div>
                    </div>
                    <span className="flex items-center text-xs font-medium text-orange-600 bg-orange-50 dark:bg-orange-900/20 px-2 py-1 rounded-full">
                      <XCircle size={14} className="mr-1" /> {partner.isSuspended ? 'Suspended' : 'Blocked'}
                    </span>
                  </div>
                  <div className="flex flex-wrap justify-between items-center text-sm border-t border-gray-100 dark:border-dark-700 pt-4 mt-2 gap-2">
                    <span className="text-gray-500 dark:text-gray-400">Deliveries: <span className="font-bold text-gray-800 dark:text-gray-100">{completedDeliveries}</span></span>
                    <div className="flex flex-wrap gap-2">
                      {partner.role !== 'admin' && (
                        <>
                            <button 
                              onClick={async (e) => {
                                e.stopPropagation();
                                if (!window.confirm('Are you sure you want to unsuspend this partner?')) return;
                                try {
                                  await api.put(`/users/${partner._id}`, { isSuspended: false });
                                  fetchData();
                                  showToast('Partner unsuspended', 'success');
                                } catch (error) {
                                  showToast('Failed to unsuspend', 'error');
                                }
                              }}
                              className="px-3 py-1 rounded-full text-xs font-bold whitespace-nowrap inline-block bg-green-50 dark:bg-green-900/20 text-green-600 hover:bg-green-100"
                            >
                              Unsuspend
                            </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
              );
            })}
          </div>
        )}
        </div>
      )}

      {(filterStatus === 'all' || filterStatus === 'deleted') && (
        <div className="mt-8">
          <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100 mb-4">Deleted Partners</h3>
          {deletedPartners.length === 0 ? (
            <p className="text-gray-500 dark:text-gray-400 text-sm">No deleted partners found.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {deletedPartners.map((partner) => {
              const completedDeliveries = allOrders.filter(o => o.deliveryPartner?._id === partner._id && o.status === 'Completed').length;
              return (
              <div 
                key={partner._id} 
                className="bg-red-50 dark:bg-red-900/20 rounded-xl shadow-sm border dark:border-dark-600 bg-white dark:bg-dark-900 text-gray-900 dark:text-white border-red-200 dark:border-red-900/30 overflow-hidden cursor-pointer hover:border-red-300 transition"
                onClick={() => handlePartnerClick(partner)}
              >
                <div className="p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center space-x-3 min-w-0 flex-1 mr-2">
                      <div className="h-10 w-10 shrink-0 rounded-full bg-red-200 text-red-700 dark:text-red-400 flex items-center justify-center font-bold">
                        {partner.name.charAt(0)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2 truncate">
                          <span className="truncate">{partner.name}</span>
                        </h3>
                        {partner.partnerId && <p className="text-xs text-gray-400 font-mono mt-0.5">{partner.partnerId}</p>}
                        <p className="text-sm text-gray-500 dark:text-gray-400 truncate">{partner.phone}</p>
                      </div>
                    </div>
                    <span className="flex items-center text-xs font-medium text-red-600 bg-red-50 dark:bg-red-900/20 px-2 py-1 rounded-full">
                      <XCircle size={14} className="mr-1" /> Deleted
                    </span>
                  </div>
                  <div className="flex flex-wrap justify-between items-center text-sm border-t border-gray-100 dark:border-dark-700 pt-4 mt-2 gap-2">
                    <span className="text-gray-500 dark:text-gray-400">Deliveries: <span className="font-bold text-gray-800 dark:text-gray-100">{completedDeliveries}</span></span>
                    <div className="flex flex-wrap gap-2">
                      {partner.role !== 'admin' && (
                        <>
                            {partner.accountStatus === 'deleted_by_admin' && (
                              <button onClick={(e) => handleUndoDeletePartner(e, partner._id)} className="px-3 py-1 rounded-full text-xs font-bold whitespace-nowrap inline-block bg-blue-50 dark:bg-blue-900/20 text-blue-600 hover:bg-blue-100">Undo Delete</button>
                            )}
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
              );
            })}
          </div>
        )}
        </div>
      )}

      {(filterStatus === 'all' || filterStatus === 'inactive') && (
        <div className="mt-8">
          <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100 mb-4">Inactive / Offline Partners</h3>
          {inactivePartners.length === 0 ? (
            <p className="text-gray-500 dark:text-gray-400 text-sm">No inactive or offline partners found.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {inactivePartners.map((partner) => {
              const completedDeliveries = allOrders.filter(o => o.deliveryPartner?._id === partner._id && o.status === 'Completed').length;
              return (
              <div 
                key={partner._id} 
                className="bg-red-50 dark:bg-red-900/20 rounded-xl shadow-sm border dark:border-dark-600 bg-white dark:bg-dark-900 text-gray-900 dark:text-white border-red-200 dark:border-red-900/30 overflow-hidden cursor-pointer hover:border-red-300 transition"
                onClick={() => handlePartnerClick(partner)}
              >
                <div className="p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center space-x-3 min-w-0 flex-1 mr-2">
                      <div className="h-10 w-10 shrink-0 rounded-full bg-red-200 text-red-700 dark:text-red-400 flex items-center justify-center font-bold">
                        {partner.name.charAt(0)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2 truncate">
                          <span className="truncate">{partner.name}</span>
                          <a 
                            href={`tel:${partner.phone}`} 
                            onClick={(e) => e.stopPropagation()} 
                            className="text-green-500 hover:text-green-600 bg-green-50 dark:bg-green-900/20 p-1.5 rounded-full transition-colors shrink-0"
                            title="Call Partner"
                          >
                            <Phone size={14} />
                          </a>
                        </h3>
                        {partner.partnerId && <p className="text-xs text-gray-400 font-mono mt-0.5">{partner.partnerId}</p>}
                        <p className={`text-sm font-medium truncate ${partner.isSuspended ? 'text-red-500' : 'text-gray-500 dark:text-gray-400'}`}>
                          {partner.isSuspended ? 'Suspended' : 'Offline'}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-wrap justify-between items-center text-sm border-t border-red-200 dark:border-red-900/30 pt-4 mt-2 gap-2">
                    <span className="text-gray-500 dark:text-gray-400">Deliveries: <span className="font-bold text-gray-800 dark:text-gray-100">{completedDeliveries}</span></span>
                    <div className="flex flex-wrap gap-2">
                      {partner.role !== 'admin' && (
                        <>
                          {partner.isSuspended && (
                            <button 
                              onClick={async (e) => {
                                e.stopPropagation();
                                if (!window.confirm('Are you sure you want to reactivate this partner?')) return;
                                try {
                                  await api.put(`/users/${partner._id}`, { isSuspended: false });
                                  fetchData();
                                  showToast('Partner reactivated', 'success');
                                } catch (error) {
                                  showToast('Failed to reactivate', 'error');
                                }
                              }}
                              className="px-3 py-1 rounded-full text-xs font-bold whitespace-nowrap inline-block bg-green-100 text-green-700 hover:bg-green-200"
                            >
                              Reactivate
                            </button>
                          )}
                          {partner.accountStatus === 'deleted_by_admin' ? (
                            <button onClick={(e) => handleUndoDeletePartner(e, partner._id)} className="px-3 py-1 rounded-full text-xs font-bold whitespace-nowrap inline-block bg-blue-50 dark:bg-blue-900/20 text-blue-600 hover:bg-blue-100">Undo Delete</button>
                          ) : (
                            <button onClick={(e) => handleDeletePartner(e, partner._id)} className="px-3 py-1 rounded-full text-xs font-bold whitespace-nowrap inline-block bg-red-100 text-red-600 hover:bg-red-200">Delete</button>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
              );
            })}
          </div>
        )}
      </div>
      )}

      {/* Partner Details Modal */}
      {selectedPartner && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-end">
          <div className="bg-white dark:bg-dark-800 w-full max-w-md h-full shadow-2xl animate-slide-in overflow-y-auto">
            <div className="p-6 border-b border-gray-100 dark:border-dark-700 flex justify-between items-center sticky top-0 bg-white dark:bg-dark-800 z-10">
              <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100">Partner Details</h2>
              <button onClick={() => setSelectedPartner(null)} className="text-gray-400 hover:text-gray-600 dark:text-gray-400">
                <X size={24} />
              </button>
            </div>
            
            <div className="p-6">
              <div className="mb-6 space-y-3">
                <button 
                  onClick={handleImpersonate}
                  className="w-full bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 font-bold py-3 rounded-xl hover:bg-orange-200 dark:hover:bg-orange-900/50 transition border border-orange-200 dark:border-orange-900/50"
                >
                  View Dashboard as Partner
                </button>
                <button 
                  onClick={() => setShowMap(!showMap)}
                  className="w-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 font-bold py-3 rounded-xl hover:bg-blue-200 dark:hover:bg-blue-900/50 transition border border-blue-200 dark:border-blue-900/50 flex items-center justify-center"
                >
                  <MapPin size={18} className="mr-2" />
                  {showMap ? 'Hide Live Location' : 'View Live Location'}
                </button>
                
                {showMap && (
                  <div className={isMapMaximized 
                    ? "fixed inset-0 z-[100] bg-black/90 p-4 flex flex-col backdrop-blur-sm" 
                    : "h-64 w-full bg-gray-50 dark:bg-dark-900 rounded-2xl overflow-hidden border-2 border-gray-200 dark:border-dark-700 relative z-0 shadow-inner mt-4"}
                  >
                    {isMapMaximized && (
                      <div className="flex justify-between items-center mb-4 bg-white/10 p-3 rounded-2xl backdrop-blur-md">
                        <h3 className="text-white font-bold flex items-center">
                          <MapPin size={20} className="mr-2 text-primary-400" /> 
                          {selectedPartner.name}'s Live Location
                        </h3>
                        <div className="flex gap-2">
                          <button 
                            onClick={() => setIsMapMaximized(false)}
                            className="p-2 bg-white/20 text-white hover:bg-white/30 rounded-xl transition"
                          >
                            <Minimize size={20} />
                          </button>
                        </div>
                      </div>
                    )}
                    
                    <div className={`relative w-full ${isMapMaximized ? 'flex-1 rounded-2xl overflow-hidden border border-white/20' : 'h-full'}`}>
                      {partnerLocation ? (
                        <>
                          <NativeSingleMarkerMap location={partnerLocation} destinationLocation={isMapMaximized ? activeDestination : null} />
                          
                          {!isMapMaximized && (
                            <button 
                              onClick={() => setIsMapMaximized(true)}
                              className="absolute bottom-3 right-3 z-[400] p-2 bg-white dark:bg-dark-800 text-gray-700 dark:text-gray-200 rounded-xl shadow-lg border border-gray-200 dark:border-dark-600 hover:bg-gray-50 dark:hover:bg-dark-700 transition"
                            >
                              <Maximize size={18} />
                            </button>
                          )}
                          
                          <div className="absolute top-3 left-3 right-3 z-10 flex justify-center pointer-events-none">
                            <div className="bg-white/90 dark:bg-dark-800/90 backdrop-blur-md px-4 py-1.5 rounded-full shadow-lg border border-gray-100 dark:border-dark-700 flex items-center">
                              <div className="w-2 h-2 bg-green-500 rounded-full animate-ping mr-2"></div>
                              <span className="text-xs font-bold text-gray-900 dark:text-white">Partner Location Live</span>
                            </div>
                          </div>
                        </>
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center text-gray-400 p-6 text-center bg-gray-50 dark:bg-dark-900">
                          <MapPin size={32} className="mb-2 opacity-50" />
                          <p className="text-sm font-bold">Location Not Available</p>
                          <p className="text-xs mt-1">Partner is offline or hasn't shared their location.</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
              <div className="flex items-center space-x-4 mb-6">
                <div className="h-16 w-16 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center text-3xl font-bold">
                  {selectedPartner.name.charAt(0)}
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2">
                    {selectedPartner.name}
                    <a 
                      href={`tel:${selectedPartner.phone}`} 
                      className="text-orange-500 hover:text-orange-600 bg-orange-50 dark:bg-orange-900/20 p-1.5 rounded-full transition-colors"
                      title="Call Partner"
                    >
                      <Phone size={18} />
                    </a>
                  </h3>
                  <p className="text-sm font-bold text-primary-600 mb-1">ID: {selectedPartner.partnerId || 'Pending'}</p>
                  <p className="text-gray-500 dark:text-gray-400 text-sm mb-1">{selectedPartner.phone}</p>
                  <p className="text-gray-500 dark:text-gray-400 text-sm mb-1">{selectedPartner.email || 'No email provided'}</p>
                  {selectedPartner.verifiedId?.idNumber ? (
                    <p className="text-green-600 font-bold text-xs">
                      {selectedPartner.verifiedId.idType}: {selectedPartner.verifiedId.idNumber}
                    </p>
                  ) : (
                    <p className="text-yellow-600 font-bold text-xs">ID Not Verified</p>
                  )}
                  <p className="text-sm font-bold text-primary-600 mt-2">Total Deliveries: {partnerDeliveries.filter(o => o.status === 'Completed').length}</p>
                </div>
              </div>

              <div className="mb-6 bg-gray-50 dark:bg-dark-900 p-4 rounded-xl border border-gray-200 dark:border-dark-700">
                <h4 className="font-bold text-sm text-gray-700 dark:text-gray-300 mb-2 uppercase tracking-wide">Edit Details</h4>
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Phone</label>
                    <input 
                      type="text" 
                      pattern="\d{10}"
                      maxLength="10"
                      className="w-full px-3 py-2 border dark:border-dark-600 bg-white dark:bg-dark-900 text-gray-900 dark:text-white rounded-lg text-sm"
                      value={selectedPartner.phone}
                      onChange={(e) => setSelectedPartner({...selectedPartner, phone: e.target.value.replace(/\D/g, '')})}
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Email</label>
                    <input 
                      type="email" 
                      className="w-full px-3 py-2 border dark:border-dark-600 bg-white dark:bg-dark-900 text-gray-900 dark:text-white rounded-lg text-sm"
                      value={selectedPartner.email || ''}
                      onChange={(e) => setSelectedPartner({...selectedPartner, email: e.target.value})}
                    />
                  </div>
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">ID Type</label>
                      <select 
                        className="w-full px-3 py-2 border dark:border-dark-600 bg-white dark:bg-dark-900 text-gray-900 dark:text-white rounded-lg text-sm bg-white dark:bg-dark-800"
                        value={selectedPartner.verifiedId?.idType || ''}
                        onChange={(e) => setSelectedPartner({...selectedPartner, verifiedId: { ...selectedPartner.verifiedId, idType: e.target.value }})}
                      >
                        <option value="">Select ID</option>
                        <option value="Aadhaar">Aadhaar</option>
                        <option value="PAN">PAN</option>
                      </select>
                    </div>
                    <div className="flex-[2]">
                      <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">ID Number</label>
                      <input 
                        type="text" 
                        className="w-full px-3 py-2 border dark:border-dark-600 bg-white dark:bg-dark-900 text-gray-900 dark:text-white rounded-lg text-sm"
                        value={selectedPartner.verifiedId?.idNumber || ''}
                        onChange={(e) => setSelectedPartner({...selectedPartner, verifiedId: { ...selectedPartner.verifiedId, idNumber: e.target.value }})}
                      />
                    </div>
                  </div>
                  <button 
                    onClick={async () => {
                      try {
                        const { data } = await api.put(`/users/${selectedPartner._id}`, { 
                          phone: selectedPartner.phone,
                          email: selectedPartner.email,
                          verifiedId: selectedPartner.verifiedId
                        });
                        setPartners(partners.map(p => p._id === data._id ? {...p, ...data} : p));
                        showToast('Partner details updated', 'success');
                      } catch (error) {
                        showToast('Failed to update details', 'error');
                      }
                    }}
                    className="w-full bg-primary-600 text-white font-bold py-2 rounded-lg text-sm hover:bg-primary-700 mb-4"
                  >
                    Save Profile Changes
                  </button>
                  
                  <h4 className="font-bold text-sm text-gray-700 dark:text-gray-300 mt-4 mb-2 uppercase tracking-wide border-t border-gray-200 dark:border-dark-700 pt-4">Delivery Configurations</h4>
                  <div>
                    <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Delivery Earning Override (₹)</label>
                    <input 
                      type="number" 
                      placeholder="Global Default"
                      className="w-full px-3 py-2 border dark:border-dark-600 bg-white dark:bg-dark-900 text-gray-900 dark:text-white rounded-lg text-sm"
                      value={selectedPartner.customDeliveryEarning !== null && selectedPartner.customDeliveryEarning !== undefined ? selectedPartner.customDeliveryEarning : ''}
                      onChange={(e) => setSelectedPartner({...selectedPartner, customDeliveryEarning: e.target.value === '' ? null : Number(e.target.value)})}
                    />
                  </div>
                  <button 
                    onClick={async () => {
                      try {
                        const { data } = await api.put(`/users/${selectedPartner._id}`, { 
                          customDeliveryEarning: selectedPartner.customDeliveryEarning
                        });
                        setPartners(partners.map(p => p._id === data._id ? {...p, ...data} : p));
                        showToast('Custom delivery earning updated', 'success');
                      } catch (error) {
                        showToast('Failed to update earning', 'error');
                      }
                    }}
                    className="w-full bg-blue-600 text-white font-bold py-2 rounded-lg text-sm hover:bg-blue-700 mt-3"
                  >
                    Save Delivery Earning
                  </button>
                </div>
              </div>
              <div>
                <h4 className="font-bold text-gray-800 dark:text-gray-100 mb-3 flex items-center">
                  <Package size={18} className="mr-2 text-primary-600" /> Delivery History
                </h4>
                {loadingDeliveries ? (
                  <p className="text-sm text-gray-500 dark:text-gray-400">Loading deliveries...</p>
                ) : partnerDeliveries.length === 0 ? (
                  <p className="text-sm text-gray-500 dark:text-gray-400">No deliveries found for this partner.</p>
                ) : (
                  <div className="space-y-4">
                    {partnerDeliveries.map(order => (
                      <div key={order._id} className="border border-gray-100 dark:border-dark-700 rounded-xl p-4 shadow-sm space-y-3">
                        <div className="flex justify-between items-center border-b pb-2">
                          <div>
                            <p className="text-sm font-bold text-gray-800 dark:text-gray-100">{order.orderId || `Order #${order._id.substring(18)}`}</p>
                            <span className="text-xs text-gray-500 dark:text-gray-400">{new Date(order.createdAt).toLocaleString()}</span>
                          </div>
                          <span className={`px-2 py-1 text-xs font-bold rounded-full ${
                            order.status === 'Completed' || order.status === 'Delivered' ? 'bg-green-100 text-green-700' :
                            order.status === 'Cancelled' ? 'bg-red-100 text-red-700 dark:text-red-400' :
                            'bg-blue-100 text-blue-700'
                          }`}>
                            {order.status}
                          </span>
                        </div>
                        
                        <div>
                          <p className="text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">Items:</p>
                          <ul className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
                            {order.orderItems.map((item, i) => (
                              <li key={i} className="flex justify-between">
                                <span>{item.name} (x{item.quantity})</span>
                                <span>₹{item.price * item.quantity}</span>
                              </li>
                            ))}
                          </ul>
                          <div className="flex justify-between items-center mt-2 pt-2 border-t font-bold text-sm text-gray-800 dark:text-gray-100">
                            <span>Total</span>
                            <span>₹{order.totalAmount}</span>
                          </div>
                        </div>

                        {order.deliveryAddress && (
                          <div className="bg-gray-50 dark:bg-dark-900 p-2 rounded text-xs mt-2">
                            <p className="font-bold text-gray-700 dark:text-gray-300">Delivered To:</p>
                            <p className="text-gray-600 dark:text-gray-400">{order.customer?.name} ({order.customer?.phone})</p>
                            <p className="text-gray-600 dark:text-gray-400">{order.deliveryAddress.street}, {order.deliveryAddress.city}, {order.deliveryAddress.state} {order.deliveryAddress.postalCode}</p>
                            {order.updatedAt && (order.status === 'Completed' || order.status === 'Delivered') && (
                              <p className="text-gray-500 dark:text-gray-400 mt-1">Delivered: {new Date(order.updatedAt).toLocaleString()}</p>
                            )}
                          </div>
                        )}

                        {order.modificationLogs && order.modificationLogs.length > 0 && (
                          <div className="bg-blue-50 p-2 rounded text-xs mt-2">
                            <p className="font-bold text-blue-800 mb-1">Modifications:</p>
                            <ul className="space-y-1 text-blue-700">
                              {order.modificationLogs.map((log, idx) => (
                                <li key={idx}>
                                  <span className="font-semibold">{new Date(log.timestamp).toLocaleString()}</span> - {log.reason}
                                  {log.previousSnapshot && log.newSnapshot && (
                                    <span className="block text-blue-600 mt-1">
                                      ↳ Total changed from ₹{log.previousSnapshot.totalAmount} to ₹{log.newSnapshot.totalAmount}
                                    </span>
                                  )}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Partners;
