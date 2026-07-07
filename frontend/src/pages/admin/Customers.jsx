import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { Mail, Phone, MapPin, Package, X } from 'lucide-react';
import { useUIStore } from '../../store/uiStore';
import { useAuthStore } from '../../store/authStore';

const Customers = () => {
  const [customers, setCustomers] = useState([]);
  const [allOrders, setAllOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [customerOrders, setCustomerOrders] = useState([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const { showToast } = useUIStore();
  const navigate = useNavigate();
  const { user, token, startImpersonating } = useAuthStore();

  const fetchData = async () => {
    try {
      const [usersRes, ordersRes] = await Promise.all([
        api.get('/users?role=customer'),
        api.get('/orders')
      ]);
      setCustomers(usersRes.data);
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

  const handleCustomerClick = (customer) => {
    setSelectedCustomer(customer);
    setLoadingOrders(true);
    const filteredOrders = allOrders.filter(order => order.customer?._id === customer._id);
    setCustomerOrders(filteredOrders);
    setLoadingOrders(false);
  };

  const handleDeleteCustomer = async (e, id) => {
    e.stopPropagation();
    if (window.confirm('Are you sure you want to delete this customer?')) {
      try {
        await api.delete(`/users/${id}`);
        setCustomers(customers.filter(c => c._id !== id));
        showToast('Customer deleted', 'success');
      } catch (error) {
        showToast('Failed to delete customer', 'error');
      }
    }
  };

  const [showAddForm, setShowAddForm] = useState(false);
  const [newCustomer, setNewCustomer] = useState({ name: '', phone: '', password: '' });

  const handleAddCustomer = async (e) => {
    e.preventDefault();
    try {
      await api.post('/auth/register', { ...newCustomer, role: 'customer' });
      showToast('Customer added successfully', 'success');
      setShowAddForm(false);
      setNewCustomer({ name: '', phone: '', password: '' });
      fetchData();
    } catch (error) {
      showToast(error.response?.data?.message || 'Failed to add customer', 'error');
    }
  };

  const filteredCustomers = customers.filter(c => c.name.toLowerCase().includes(searchTerm.toLowerCase()) || c.phone.includes(searchTerm));
  const sortedCustomers = [...filteredCustomers].sort((a, b) => {
    const idA = a.customerId || '';
    const idB = b.customerId || '';
    return idA.localeCompare(idB);
  });

  return (
    <div className="space-y-6 relative">
      <div className="bg-white dark:bg-dark-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-dark-700 flex flex-col md:flex-row justify-between md:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100">Customers List</h2>
          <p className="text-gray-500 dark:text-gray-400 mt-1">View and manage all registered customers.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <input
            type="text"
            placeholder="Search name or phone..."
            className="px-4 py-2 border dark:border-dark-600 bg-white dark:bg-dark-900 text-gray-900 dark:text-white rounded-lg focus:ring-primary-500 focus:border-primary-500"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <button onClick={() => setShowAddForm(true)} className="bg-primary-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-primary-700">
            Add Customer
          </button>
        </div>
      </div>

      {showAddForm && (
        <form onSubmit={handleAddCustomer} className="bg-white dark:bg-dark-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-dark-700 space-y-4">
          <h3 className="font-bold text-gray-800 dark:text-gray-100 text-lg border-b pb-2">Add New Customer</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <input type="text" placeholder="Name" required className="px-4 py-2 border dark:border-dark-600 bg-white dark:bg-dark-900 text-gray-900 dark:text-white rounded-lg" value={newCustomer.name} onChange={e => setNewCustomer({...newCustomer, name: e.target.value})} />
            <input type="text" placeholder="Phone" pattern="\d{10}" maxLength="10" required className="px-4 py-2 border dark:border-dark-600 bg-white dark:bg-dark-900 text-gray-900 dark:text-white rounded-lg" value={newCustomer.phone} onChange={e => setNewCustomer({...newCustomer, phone: e.target.value.replace(/\D/g, '')})} />
            <input type="password" placeholder="Password" required className="px-4 py-2 border dark:border-dark-600 bg-white dark:bg-dark-900 text-gray-900 dark:text-white rounded-lg" value={newCustomer.password} onChange={e => setNewCustomer({...newCustomer, password: e.target.value})} />
          </div>
          <div className="flex justify-end space-x-2 pt-2">
            <button type="button" onClick={() => setShowAddForm(false)} className="px-4 py-2 text-gray-600 dark:text-gray-400 border border-gray-300 dark:border-dark-600 rounded-lg">Cancel</button>
            <button type="submit" className="px-4 py-2 bg-primary-600 text-white rounded-lg font-bold">Save Customer</button>
          </div>
        </form>
      )}

      {loading ? (
        <p>Loading customers...</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {sortedCustomers.map((customer) => {
            const completedOrdersCount = allOrders.filter(o => o.customer?._id === customer._id).length;
            return (
            <div 
              key={customer._id} 
              className={`bg-white dark:bg-dark-800 rounded-xl shadow-sm border p-6 cursor-pointer hover:border-primary-300 transition ${customer.isBlocked ? 'border-red-200 dark:border-red-900/30 bg-red-50 dark:bg-red-900/20' : 'border-gray-100 dark:border-dark-700'}`}
              onClick={() => handleCustomerClick(customer)}
            >
              <div className="flex items-center space-x-4 mb-4">
                <div className="h-12 w-12 rounded-full bg-primary-100 text-primary-600 flex items-center justify-center text-xl font-bold">
                  {customer.name.charAt(0)}
                </div>
                <div>
                  <h3 className="font-bold text-gray-800 dark:text-gray-100">{customer.name}</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">ID: {customer.customerId || 'Pending'}</p>
                </div>
              </div>
              
              <div className="space-y-3 mt-4 pt-4 border-t border-gray-100 dark:border-dark-700">
                <div className="flex flex-col space-y-2 text-sm text-gray-600 dark:text-gray-400">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <Phone size={16} className="mr-2 text-gray-400" />
                      {customer.phone}
                    </div>
                    <div className="font-medium">
                      Orders: <span className="text-primary-600 font-bold">{completedOrdersCount}</span>
                    </div>
                  </div>
                  {customer.email && (
                    <div className="flex items-center truncate">
                      <Mail size={16} className="mr-2 text-gray-400 shrink-0" />
                      <span className="truncate" title={customer.email}>{customer.email}</span>
                    </div>
                  )}
                </div>
                <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400">
                  <div className="flex items-start">
                    <MapPin size={16} className="mr-2 mt-0.5 text-gray-400" />
                    <div>
                      <span className="font-medium text-gray-700 dark:text-gray-300">Addresses:</span> {customer.savedAddresses?.length || 0}
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <button 
                      onClick={async (e) => {
                        e.stopPropagation();
                        try {
                          await api.put(`/users/${customer._id}`, { isBlocked: !customer.isBlocked });
                          const { data } = await api.get('/users?role=customer');
                          setCustomers(data);
                          showToast('Customer status updated', 'success');
                        } catch (error) {
                          showToast('Failed to update customer status', 'error');
                        }
                      }}
                      className={`px-3 py-1 rounded-full text-xs font-bold whitespace-nowrap inline-block ${customer.isBlocked ? 'bg-red-100 text-red-700 dark:text-red-400' : 'bg-gray-100 text-gray-700 dark:text-gray-300 hover:bg-red-50 dark:bg-red-900/20 hover:text-red-700 dark:text-red-400'}`}
                    >
                      {customer.isBlocked ? 'Blocked' : 'Block'}
                    </button>
                    <button 
                      onClick={(e) => handleDeleteCustomer(e, customer._id)}
                      className="px-3 py-1 rounded-full text-xs font-bold whitespace-nowrap inline-block bg-red-50 dark:bg-red-900/20 text-red-600 hover:bg-red-100"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            </div>
            );
          })}
        </div>
      )}

      {/* Customer Details Modal */}
      {selectedCustomer && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-end">
          <div className="bg-white dark:bg-dark-800 w-full max-w-md h-full shadow-2xl animate-slide-in overflow-y-auto">
            <div className="p-6 border-b border-gray-100 dark:border-dark-700 flex justify-between items-center sticky top-0 bg-white dark:bg-dark-800 z-10">
              <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100">Customer Details</h2>
              <button onClick={() => setSelectedCustomer(null)} className="text-gray-400 hover:text-gray-600 dark:text-gray-400">
                <X size={24} />
              </button>
            </div>
            
            <div className="p-6">
              <div className="mb-6">
                <button 
                  onClick={async () => {
                    try {
                      const { data } = await api.post(`/auth/impersonate/${selectedCustomer._id}`);
                      startImpersonating(data, data.token, user, token);
                      showToast('Impersonating Customer', 'success');
                      navigate('/');
                    } catch (error) {
                      console.error(error);
                      showToast(error.response?.data?.message || 'Failed to impersonate', 'error');
                    }
                  }}
                  className="w-full bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 font-bold py-3 rounded-xl hover:bg-blue-100 dark:hover:bg-blue-900/50 transition border border-blue-200 dark:border-blue-900/50"
                >
                  View Store as Customer
                </button>
              </div>
              <div className="flex items-center space-x-4 mb-6">
                <div className="h-16 w-16 rounded-full bg-primary-100 text-primary-600 flex items-center justify-center text-3xl font-bold">
                  {selectedCustomer.name.charAt(0)}
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-gray-800 dark:text-gray-100">{selectedCustomer.name}</h3>
                  <p className="text-sm font-bold text-primary-600 mb-1">ID: {selectedCustomer.customerId || 'Pending'}</p>
                  
                  <div className="flex items-center text-gray-500 dark:text-gray-400 text-sm mb-1">
                    <Phone size={14} className="mr-2" />
                    {selectedCustomer.phone}
                  </div>
                  <div className="flex items-center text-gray-500 dark:text-gray-400 text-sm">
                    <Mail size={14} className="mr-2" />
                    {selectedCustomer.email || 'No email provided'}
                  </div>
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
                      value={selectedCustomer.phone}
                      onChange={(e) => setSelectedCustomer({...selectedCustomer, phone: e.target.value.replace(/\D/g, '')})}
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Email</label>
                    <input 
                      type="email" 
                      className="w-full px-3 py-2 border dark:border-dark-600 bg-white dark:bg-dark-900 text-gray-900 dark:text-white rounded-lg text-sm"
                      value={selectedCustomer.email || ''}
                      onChange={(e) => setSelectedCustomer({...selectedCustomer, email: e.target.value})}
                    />
                  </div>
                  <button 
                    onClick={async () => {
                      try {
                        const { data } = await api.put(`/users/${selectedCustomer._id}`, { 
                          phone: selectedCustomer.phone,
                          email: selectedCustomer.email
                        });
                        setCustomers(customers.map(c => c._id === data._id ? {...c, ...data} : c));
                        showToast('Customer details updated', 'success');
                      } catch (error) {
                        showToast('Failed to update details', 'error');
                      }
                    }}
                    className="w-full bg-primary-600 text-white font-bold py-2 rounded-lg text-sm hover:bg-primary-700"
                  >
                    Save Changes
                  </button>
                </div>
              </div>

              <div className="mb-6">
                <h4 className="font-bold text-gray-800 dark:text-gray-100 mb-3 flex items-center">
                  <MapPin size={18} className="mr-2 text-primary-600" /> Saved Addresses
                </h4>
                {selectedCustomer.savedAddresses?.length === 0 ? (
                  <p className="text-sm text-gray-500 dark:text-gray-400">No saved addresses.</p>
                ) : (
                  <div className="space-y-3">
                    {selectedCustomer.savedAddresses.map((addr, idx) => (
                      <div key={idx} className="bg-gray-50 dark:bg-dark-900 p-3 rounded-lg border border-gray-200 dark:border-dark-700 text-sm">
                        <p className="font-bold text-gray-700 dark:text-gray-300">{addr.street}</p>
                        <p className="text-gray-600 dark:text-gray-400">{addr.city}, {addr.state} {addr.postalCode}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <h4 className="font-bold text-gray-800 dark:text-gray-100 mb-3 flex items-center">
                  <Package size={18} className="mr-2 text-primary-600" /> Order History
                </h4>
                {loadingOrders ? (
                  <p className="text-sm text-gray-500 dark:text-gray-400">Loading orders...</p>
                ) : customerOrders.length === 0 ? (
                  <p className="text-sm text-gray-500 dark:text-gray-400">No orders found for this customer.</p>
                ) : (
                  <div className="space-y-4">
                    {customerOrders.map(order => (
                      <div key={order._id} className="border border-gray-100 dark:border-dark-700 rounded-xl p-4 shadow-sm space-y-3">
                        <div className="flex justify-between items-center border-b pb-2">
                          <div>
                            <p className="text-sm font-bold text-gray-800 dark:text-gray-100">{order.orderId || `Order #${order._id.substring(18)}`}</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">{new Date(order.createdAt).toLocaleDateString()}</p>
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
                          </div>
                        )}

                        {order.deliveryPartner && (
                          <div className="bg-gray-50 dark:bg-dark-900 p-2 rounded text-xs">
                            <p className="font-bold text-gray-700 dark:text-gray-300">Delivery Partner:</p>
                            <p className="text-gray-600 dark:text-gray-400">{order.deliveryPartner.name} ({order.deliveryPartner.phone})</p>
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

export default Customers;
