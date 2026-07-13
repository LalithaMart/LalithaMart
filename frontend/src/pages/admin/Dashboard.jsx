import { useState, useEffect, useMemo, useCallback } from 'react';
import api from '../../services/api';
import { Users, Truck, ShoppingBag, TrendingUp } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

import { useUIStore } from '../../store/uiStore';
import { useSocketStore } from '../../store/socketStore';

import { useLocation, useNavigate } from 'react-router-dom';
import GlobalDeliverySettingsWidget from '../../components/admin/GlobalDeliverySettingsWidget';

const AdminDashboard = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    totalProducts: 0,
    totalOrders: 0,
    totalCustomers: 0,
    totalPartners: 0,
    notificationAnalytics: { total: 0, read: 0, clicked: 0, readRate: 0, clickRate: 0 }
  });
  const [orders, setOrders] = useState([]);
  
  const [deliveryPartners, setDeliveryPartners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [assignPartnerId, setAssignPartnerId] = useState('');
  const [isModifying, setIsModifying] = useState(false);
  const [modifiedItems, setModifiedItems] = useState([]);
  const [modifyReason, setModifyReason] = useState('');

  const closeModal = useCallback(() => {
    setSelectedOrder(null);
    navigate('/admin', { replace: true });
  }, [navigate]);

  const [dateFilter, setDateFilter] = useState('All Time');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [customerFilter, setCustomerFilter] = useState('');
  const [productFilter, setProductFilter] = useState('');

  const { showToast } = useUIStore();
  const { socket } = useSocketStore();

  const fetchDashboardData = useCallback(async () => {
    try {
      const [productsRes, ordersRes, usersRes, notifRes] = await Promise.all([
        api.get('/products?all=true'),
        api.get('/orders'),
        api.get('/users'),
        api.get('/notifications/analytics').catch(() => ({ data: { total: 0, read: 0, clicked: 0, readRate: 0, clickRate: 0 } }))
      ]);

      const customers = usersRes.data.filter(u => u.role === 'customer' || u.role === 'admin');
      const partners = usersRes.data.filter(u => ['delivery', 'admin'].includes(u.role));

      setStats({
        totalProducts: productsRes.data.length,
        totalCustomers: customers.length,
        totalPartners: partners.length,
        notificationAnalytics: notifRes.data
      });
      setDeliveryPartners(partners);
      setOrders(ordersRes.data);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  useEffect(() => {
    let query = '/notifications/analytics?';
    if (customerFilter) query += `customerFilter=${encodeURIComponent(customerFilter)}&`;
    if (productFilter) query += `productFilter=${encodeURIComponent(productFilter)}&`;
    
    if (dateFilter !== 'All Time') {
      const now = new Date();
      if (dateFilter === 'Today') {
        const start = new Date(now);
        start.setHours(0,0,0,0);
        const end = new Date(now);
        end.setHours(23,59,59,999);
        query += `startDate=${start.toISOString()}&endDate=${end.toISOString()}&`;
      } else if (dateFilter === 'Last 7 Days') {
        const last7 = new Date(now);
        last7.setDate(last7.getDate() - 7);
        query += `startDate=${last7.toISOString()}&endDate=${new Date().toISOString()}&`;
      } else if (dateFilter === 'Last 30 Days') {
        const last30 = new Date(now);
        last30.setDate(last30.getDate() - 30);
        query += `startDate=${last30.toISOString()}&endDate=${new Date().toISOString()}&`;
      } else if (dateFilter === 'This Month') {
        const startMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        query += `startDate=${startMonth.toISOString()}&endDate=${new Date().toISOString()}&`;
      } else if (dateFilter === 'Custom Range') {
        if (fromDate) query += `startDate=${new Date(fromDate).toISOString()}&`;
        if (toDate) {
            const end = new Date(toDate);
            end.setHours(23,59,59,999);
            query += `endDate=${end.toISOString()}&`;
        }
      }
    }

    api.get(query)
      .then(res => {
        setStats(prev => ({ ...prev, notificationAnalytics: res.data }));
      })
      .catch(console.error);
  }, [customerFilter, productFilter, dateFilter, fromDate, toDate]);

  useEffect(() => {
    if (orders.length > 0 && location.search) {
      const searchParams = new URLSearchParams(location.search);
      const orderId = searchParams.get('assignOrder');
      if (orderId) {
        const order = orders.find(o => o._id === orderId);
        if (order) {
          setSelectedOrder(order);
        }
      }
    }
  }, [orders, location.search]);

  useEffect(() => {
    if (socket) {
      const handleOrderUpdate = () => {
        fetchDashboardData();
      };
      
      socket.on('new-order', handleOrderUpdate);
      socket.on('order-updated', handleOrderUpdate);
      socket.on('order-cancelled', handleOrderUpdate);
      socket.on('order-modified', handleOrderUpdate);
      socket.on('delivery-cancelled', handleOrderUpdate);
      
      return () => {
        socket.off('new-order', handleOrderUpdate);
        socket.off('order-updated', handleOrderUpdate);
        socket.off('order-cancelled', handleOrderUpdate);
        socket.off('order-modified', handleOrderUpdate);
        socket.off('delivery-cancelled', handleOrderUpdate);
      };
    }
  }, [socket, fetchDashboardData]);

  const handleAssign = useCallback(async () => {
    if (!assignPartnerId) {
      showToast('Please select a delivery partner', 'error');
      return;
    }
    try {
      await api.put(`/orders/${selectedOrder._id}/assign`, { partnerId: assignPartnerId });
      showToast('Order assigned successfully!', 'success');
      closeModal();
      setAssignPartnerId('');
      fetchDashboardData();
    } catch (error) {
      console.error(error);
      showToast('Failed to assign order', 'error');
    }
  }, [assignPartnerId, selectedOrder, showToast, closeModal, fetchDashboardData]);

  const handleCancelOrder = useCallback(async () => {
    const reason = window.prompt('Please provide a reason for cancellation. Stock will be returned.');
    if (!reason) return;
    try {
      await api.put(`/orders/${selectedOrder._id}/cancel`, { reason });
      showToast('Order cancelled successfully!', 'success');
      closeModal();
      fetchDashboardData();
    } catch (error) {
      console.error(error);
      showToast(error.response?.data?.message || 'Failed to cancel order', 'error');
    }
  }, [selectedOrder, showToast, closeModal, fetchDashboardData]);

  const startModify = useCallback(() => {
    setIsModifying(true);
    setModifiedItems(JSON.parse(JSON.stringify(selectedOrder.orderItems)));
    setModifyReason('');
  }, [selectedOrder]);

  const saveModify = useCallback(async () => {
    if (!modifyReason) {
      showToast('Please provide a reason for modification', 'error');
      return;
    }
    const newTotal = modifiedItems.reduce((acc, curr) => acc + (curr.price * curr.quantity), 0);
    try {
      await api.put(`/orders/${selectedOrder._id}/modify`, {
        orderItems: modifiedItems,
        totalAmount: newTotal,
        reason: modifyReason
      });
      showToast('Order modified successfully!', 'success');
      setIsModifying(false);
      closeModal();
      fetchDashboardData();
    } catch (error) {
      console.error(error);
      showToast(error.response?.data?.message || 'Failed to modify order', 'error');
    }
  }, [modifyReason, modifiedItems, selectedOrder, showToast, closeModal, fetchDashboardData]);

  const generateInvoice = useCallback(() => {
    const printWindow = window.open('', '', 'height=800,width=800');
    const orderId = selectedOrder.orderId || selectedOrder._id.substring(18);
    printWindow.document.write('<html><head><title>Invoice #' + orderId + '</title>');
    printWindow.document.write('<style>body{font-family:sans-serif;padding:20px;} table{width:100%;border-collapse:collapse;margin-top:15px;margin-bottom:15px} th,td{border:1px solid #ddd;padding:8px;text-align:left;} th{background-color:#f2f2f2;}</style>');
    printWindow.document.write('</head><body>');
    printWindow.document.write('<h2>Lalitha Mart - Invoice</h2>');
    printWindow.document.write('<p><strong>Order ID:</strong> ' + orderId + '</p>');
    printWindow.document.write('<p><strong>Placed On:</strong> ' + new Date(selectedOrder.createdAt).toLocaleString() + '</p>');
    
    // Delivery info
    printWindow.document.write('<h3>Delivery Details</h3>');
    printWindow.document.write('<p><strong>To Customer:</strong> ' + selectedOrder.customer?.name + ' (' + selectedOrder.customer?.phone + ')</p>');
    printWindow.document.write('<p><strong>Delivery Address:</strong> ' + selectedOrder.deliveryAddress?.street + ', ' + selectedOrder.deliveryAddress?.city + ', ' + selectedOrder.deliveryAddress?.state + ' - ' + selectedOrder.deliveryAddress?.postalCode + '</p>');
    
    if (selectedOrder.deliveryPartner) {
      printWindow.document.write('<p><strong>Delivered By:</strong> ' + selectedOrder.deliveryPartner.name + ' (' + selectedOrder.deliveryPartner.phone + ')</p>');
    }
    
    if (selectedOrder.status === 'Completed' || selectedOrder.status === 'Delivered') {
       printWindow.document.write('<p><strong>Delivery Time:</strong> ' + new Date(selectedOrder.updatedAt).toLocaleString() + '</p>');
    }

    printWindow.document.write('<p><strong>Status:</strong> ' + selectedOrder.status + '</p>');

    if (selectedOrder.modificationLogs && selectedOrder.modificationLogs.length > 0) {
      printWindow.document.write('<h3>Order Modifications</h3>');
      printWindow.document.write('<ul>');
      selectedOrder.modificationLogs.forEach(log => {
        let modDetails = '';
        if (log.previousSnapshot && log.newSnapshot) {
          modDetails = ` <br><i>(Total changed from ₹${log.previousSnapshot.totalAmount} to ₹${log.newSnapshot.totalAmount})</i>`;
        }
        printWindow.document.write('<li><strong>' + new Date(log.timestamp).toLocaleString() + ':</strong> ' + log.reason + modDetails + '</li>');
      });
      printWindow.document.write('</ul>');
    }

    printWindow.document.write('<h3>Order Items</h3>');
    printWindow.document.write('<table><tr><th>Item</th><th>Quantity</th><th>Price</th><th>Total</th></tr>');
    selectedOrder.orderItems.forEach(item => {
      printWindow.document.write(`<tr><td>${item.name}</td><td>${item.quantity}</td><td>₹${item.price}</td><td>₹${item.price * item.quantity}</td></tr>`);
    });
    printWindow.document.write(`<tr><td colspan="3" style="text-align:right"><strong>Grand Total:</strong></td><td><strong>₹${selectedOrder.totalAmount}</strong></td></tr>`);
    printWindow.document.write('</table>');
    
    if (selectedOrder.modificationLogs && selectedOrder.modificationLogs.length > 0) {
      printWindow.document.write('<h3>Order Modifications</h3>');
      printWindow.document.write('<ul>');
      selectedOrder.modificationLogs.forEach(log => {
        printWindow.document.write('<li><strong>' + new Date(log.timestamp).toLocaleString() + ':</strong> ' + log.reason + '</li>');
      });
      printWindow.document.write('</ul>');
    }

    printWindow.document.write('</body></html>');
    printWindow.document.close();
    setTimeout(() => {
      printWindow.print();
    }, 500);
  }, [selectedOrder]);


  const filteredOrders = useMemo(() => {
    return orders.filter(o => {
      let match = true;
      if (customerFilter) {
        match = match && o.customer?.name?.toLowerCase().includes(customerFilter.toLowerCase());
      }
      if (productFilter) {
        match = match && o.orderItems.some(i => i.name.toLowerCase().includes(productFilter.toLowerCase()));
      }
      if (dateFilter !== 'All Time') {
        const now = new Date();
        const orderDate = new Date(o.createdAt);
        if (dateFilter === 'Today') {
          match = match && orderDate.toDateString() === now.toDateString();
        } else if (dateFilter === 'Last 7 Days') {
          const last7 = new Date(now);
          last7.setDate(last7.getDate() - 7);
          match = match && orderDate >= last7;
        } else if (dateFilter === 'Last 30 Days') {
          const last30 = new Date(now);
          last30.setDate(last30.getDate() - 30);
          match = match && orderDate >= last30;
        } else if (dateFilter === 'This Month') {
          match = match && orderDate.getMonth() === now.getMonth() && orderDate.getFullYear() === now.getFullYear();
        } else if (dateFilter === 'Custom Range') {
          let inRange = true;
          if (fromDate) {
             const start = new Date(fromDate);
             start.setHours(0,0,0,0);
             if (orderDate < start) inRange = false;
          }
          if (toDate) {
             const end = new Date(toDate);
             end.setHours(23,59,59,999);
             if (orderDate > end) inRange = false;
          }
          match = match && inRange;
        }
      }
      return match;
    });
  }, [orders, customerFilter, productFilter, dateFilter, fromDate, toDate]);

  // Filter out cancelled orders for metrics and charts
  const validOrders = useMemo(() => {
    return filteredOrders.filter(o => o.status !== 'Cancelled');
  }, [filteredOrders]);

  // Group chart data from valid orders
  const dynamicChartData = useMemo(() => {
    let minTime = Infinity;
    let maxTime = new Date().setHours(0,0,0,0);

    if (dateFilter === 'Today') {
      minTime = maxTime;
    } else if (dateFilter === 'Last 7 Days') {
      const d = new Date();
      d.setDate(d.getDate() - 6);
      minTime = d.setHours(0,0,0,0);
    } else if (dateFilter === 'Last 30 Days') {
      const d = new Date();
      d.setDate(d.getDate() - 30);
      minTime = d.setHours(0,0,0,0);
    } else if (dateFilter === 'This Month') {
      const d = new Date();
      d.setDate(1);
      minTime = d.setHours(0,0,0,0);
    } else if (dateFilter === 'Custom Range') {
      if (fromDate) minTime = new Date(fromDate).setHours(0,0,0,0);
      if (toDate) maxTime = new Date(toDate).setHours(0,0,0,0);
    }

    if (minTime === Infinity || isNaN(minTime)) {
      minTime = Infinity;
      validOrders.forEach(o => {
        const t = new Date(o.createdAt).setHours(0,0,0,0);
        if (t < minTime) minTime = t;
      });
      if (minTime === Infinity) minTime = maxTime;
    }

    const groupedDataMap = {};
    let current = new Date(minTime);
    const end = new Date(maxTime);
    
    let daysCount = 0;
    while (current <= end && daysCount < 366) { // Max 1 year range
      const dString = current.toLocaleDateString();
      groupedDataMap[dString] = {
        name: dString.split('/')[0] + '/' + dString.split('/')[1],
        orders: 0,
        revenue: 0,
        timestamp: current.getTime()
      };
      current.setDate(current.getDate() + 1);
      daysCount++;
    }

    validOrders.forEach(o => {
      const dString = new Date(o.createdAt).toLocaleDateString();
      if (groupedDataMap[dString]) {
        groupedDataMap[dString].orders += 1;
        groupedDataMap[dString].revenue += (o.totalAmount - (o.deliveryFeeApplied || 0));
      }
    });

    return Object.values(groupedDataMap).sort((a, b) => a.timestamp - b.timestamp);
  }, [validOrders, dateFilter, fromDate, toDate]);

  // Calculate dynamic stats
  const dynamicTotalOrders = validOrders.length;
  const dynamicRevenue = validOrders.reduce((acc, curr) => acc + (curr.totalAmount - (curr.deliveryFeeApplied || 0)), 0);

  if (loading) return <div className="flex justify-center p-8">Loading...</div>;

  return (
    <div className="space-y-6">
      <GlobalDeliverySettingsWidget />
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        <div 
          onClick={() => navigate('/admin/orders')}
          className="bg-white dark:bg-dark-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-dark-700 flex items-center cursor-pointer hover:shadow-md transition"
        >
          <div className="p-3 bg-blue-100 text-blue-600 rounded-lg mr-4">
            <ShoppingBag size={24} />
          </div>
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">Total Orders</p>
            <h3 className="text-2xl font-bold text-gray-800 dark:text-gray-100">{dynamicTotalOrders}</h3>
          </div>
        </div>

          <div 
            onClick={() => navigate('/admin/orders')}
            className="bg-white dark:bg-dark-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-dark-700 flex items-center transition hover:shadow-md cursor-pointer"
          >
            <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-xl mr-4 text-red-600">
              <TrendingUp size={28} />
            </div>
            <div>
              <p className="text-gray-500 dark:text-gray-400 text-xs font-bold uppercase tracking-wider mb-1">Total Sales</p>
              <h3 className="text-2xl font-black text-gray-800 dark:text-white">₹{dynamicRevenue}</h3>
            </div>
          </div>
          <div 
            onClick={() => navigate('/admin/customers')}
            className="bg-white dark:bg-dark-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-dark-700 flex items-center transition hover:shadow-md cursor-pointer"
          >
            <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-xl mr-4 text-purple-600">
              <Users size={28} />
            </div>
            <div>
              <p className="text-gray-500 dark:text-gray-400 text-xs font-bold uppercase tracking-wider mb-1">Total Customers</p>
              <h3 className="text-2xl font-black text-gray-800 dark:text-white">{stats.totalCustomers}</h3>
            </div>
          </div>

          <div 
            onClick={() => navigate('/admin/partners')}
            className="bg-white dark:bg-dark-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-dark-700 flex items-center transition hover:shadow-md cursor-pointer"
          >
            <div className="bg-orange-50 dark:bg-orange-900/20 p-4 rounded-xl mr-4 text-orange-600">
              <Truck size={28} />
            </div>
            <div>
              <p className="text-gray-500 dark:text-gray-400 text-xs font-bold uppercase tracking-wider mb-1">Delivery Partners</p>
              <h3 className="text-2xl font-black text-gray-800 dark:text-white">{stats.totalPartners}</h3>
            </div>
          </div>
        </div>

        {/* Analytics Section */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white dark:bg-dark-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-dark-700">
            <h4 className="font-bold text-gray-800 dark:text-gray-200 mb-4">Total Notifications Sent</h4>
            <p className="text-3xl font-black text-primary-600">{stats.notificationAnalytics.total}</p>
          </div>
          <div className="bg-white dark:bg-dark-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-dark-700">
            <h4 className="font-bold text-gray-800 dark:text-gray-200 mb-4">Read Rate</h4>
            <p className="text-3xl font-black text-blue-500">{stats.notificationAnalytics.readRate.toFixed(1)}%</p>
          </div>
          <div className="bg-white dark:bg-dark-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-dark-700">
            <h4 className="font-bold text-gray-800 dark:text-gray-200 mb-4">Click-Through Rate (CTR)</h4>
            <p className="text-3xl font-black text-green-500">{stats.notificationAnalytics.clickRate.toFixed(1)}%</p>
          </div>
        </div>

        {/* Delivery Analytics Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="bg-white dark:bg-dark-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-dark-700">
            <h4 className="font-bold text-gray-800 dark:text-gray-200 mb-4">Total Delivery Fees Collected</h4>
            <p className="text-3xl font-black text-green-600">₹{filteredOrders.filter(o => o.status === 'Completed').reduce((sum, o) => sum + (o.deliveryFeeApplied || 0), 0).toFixed(2)}</p>
          </div>
          <div className="bg-white dark:bg-dark-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-dark-700">
            <h4 className="font-bold text-gray-800 dark:text-gray-200 mb-4">Total Partner Earnings Paid</h4>
            <p className="text-3xl font-black text-red-500">₹{filteredOrders.filter(o => o.status === 'Completed').reduce((sum, o) => sum + (o.partnerEarningApplied || 0), 0).toFixed(2)}</p>
          </div>
        </div>

      <div className="bg-white dark:bg-dark-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-dark-700 mb-6">
        <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100 mb-4">Sales Trends ({dateFilter})</h2>
        <div className="h-72">
          <ResponsiveContainer w-full h-full>
            <LineChart data={dynamicChartData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
              <XAxis dataKey="name" axisLine={false} tickLine={false} />
              <YAxis yAxisId="left" axisLine={false} tickLine={false} />
              <YAxis yAxisId="right" orientation="right" axisLine={false} tickLine={false} />
              <Tooltip cursor={{ fill: '#f9fafb' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
              <Line yAxisId="left" type="monotone" dataKey="orders" stroke="#4f46e5" strokeWidth={3} dot={{r: 4}} activeDot={{r: 6}} />
              <Line yAxisId="right" type="monotone" dataKey="revenue" stroke="#10b981" strokeWidth={3} dot={{r: 4}} activeDot={{r: 6}} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="bg-white dark:bg-dark-800 rounded-xl shadow-sm border border-gray-100 dark:border-dark-700 overflow-hidden">
        <div className="p-6 border-b border-gray-100 dark:border-dark-700 flex flex-col md:flex-row justify-between md:items-center gap-4">
          <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100">All Orders</h2>
          <div className="flex flex-wrap gap-3">
            <div className="relative">
              <input 
                list="customer-list"
                type="text" 
                placeholder="Filter by Customer..." 
                className="px-3 py-1.5 border border-gray-200 dark:border-dark-700 rounded-lg text-sm focus:ring-primary-500 focus:border-primary-500 outline-none"
                value={customerFilter}
                onChange={(e) => setCustomerFilter(e.target.value)}
              />
              <datalist id="customer-list">
                {Array.from(new Set(orders.map(o => o.customer?.name).filter(Boolean))).map(name => (
                  <option key={name} value={name} />
                ))}
              </datalist>
            </div>
            <div className="relative">
              <input 
                list="product-list"
                type="text" 
                placeholder="Filter by Product..." 
                className="px-3 py-1.5 border border-gray-200 dark:border-dark-700 rounded-lg text-sm focus:ring-primary-500 focus:border-primary-500 outline-none"
                value={productFilter}
                onChange={(e) => setProductFilter(e.target.value)}
              />
              <datalist id="product-list">
                {Array.from(new Set(orders.flatMap(o => o.orderItems.map(i => i.name)))).map(name => (
                  <option key={name} value={name} />
                ))}
              </datalist>
            </div>
            <select 
              value={dateFilter} 
              onChange={e => setDateFilter(e.target.value)}
              className="px-3 py-1.5 border border-gray-200 dark:border-dark-700 rounded-lg text-sm focus:ring-primary-500 focus:border-primary-500 outline-none"
            >
              <option>All Time</option>
              <option>Today</option>
              <option>Last 7 Days</option>
              <option>Last 30 Days</option>
              <option>This Month</option>
              <option>Custom Range</option>
            </select>
            {dateFilter === 'Custom Range' && (
              <div className="flex gap-2">
                <input 
                  type="date"
                  max={new Date().toISOString().split('T')[0]}
                  value={fromDate}
                  onChange={(e) => {
                    const newDate = e.target.value;
                    if (toDate && newDate > toDate) {
                      showToast('From Date cannot be later than To Date', 'error');
                      return;
                    }
                    setFromDate(newDate);
                  }}
                  className="px-3 py-1.5 border border-gray-200 dark:border-dark-700 rounded-lg text-sm focus:ring-primary-500 focus:border-primary-500 outline-none"
                />
                <input 
                  type="date"
                  max={new Date().toISOString().split('T')[0]}
                  min={fromDate || undefined}
                  value={toDate}
                  onChange={(e) => {
                    const newDate = e.target.value;
                    if (fromDate && newDate < fromDate) {
                      showToast('To Date cannot be earlier than From Date', 'error');
                      return;
                    }
                    setToDate(newDate);
                  }}
                  className="px-3 py-1.5 border border-gray-200 dark:border-dark-700 rounded-lg text-sm focus:ring-primary-500 focus:border-primary-500 outline-none"
                />
              </div>
            )}
          </div>
        </div>
        <div className="overflow-x-auto max-h-[600px]">
          <table className="w-full text-left border-collapse">
            <thead className="sticky top-0 bg-gray-50 dark:bg-dark-900">
              <tr className="text-gray-500 dark:text-gray-400 text-sm border-b border-gray-100 dark:border-dark-700">
                <th className="p-4 font-medium">Order ID</th>
                <th className="p-4 font-medium">Customer</th>
                <th className="p-4 font-medium">Date</th>
                <th className="p-4 font-medium">Amount</th>
                <th className="p-4 font-medium">Status</th>
                <th className="p-4 font-medium">Partner</th>
                <th className="p-4 font-medium text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredOrders.slice(0, 50).map((order) => (
                <tr key={order._id} className="hover:bg-gray-50 dark:bg-dark-900">
                  <td className="p-4 text-sm text-gray-800 dark:text-gray-100 font-medium">{order.orderId || `#${order._id.substring(18)}`}</td>
                  <td className="p-4 text-sm text-gray-600 dark:text-gray-400">{order.customer?.name}</td>
                  <td className="p-4 text-sm text-gray-600 dark:text-gray-400">{new Date(order.createdAt).toLocaleDateString()}</td>
                  <td className="p-4 text-sm text-gray-800 dark:text-gray-100 font-medium">₹{order.totalAmount}</td>
                  <td className="p-4 text-sm">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap inline-block 
                      ${order.status === 'Pending' ? 'bg-yellow-100 text-yellow-800 dark:text-yellow-400' : 
                        order.status === 'Completed' ? 'bg-green-100 text-green-800' : 
                        'bg-blue-100 text-blue-800'}`}>
                      {order.status}
                    </span>
                  </td>
                  <td className="p-4 text-sm text-gray-600 dark:text-gray-400">{order.deliveryPartner ? order.deliveryPartner.name : 'Unassigned'}</td>
                  <td className="p-4 text-sm text-right">
                    <button 
                      onClick={() => { setSelectedOrder(order); setIsModifying(false); setAssignPartnerId(order.deliveryPartner?._id || ''); }}
                      className="text-primary-600 font-bold hover:bg-primary-50 px-3 py-1.5 rounded-lg transition"
                    >
                      View / Assign
                    </button>
                  </td>
                </tr>
              ))}
              {orders.length === 0 && (
                <tr>
                  <td colSpan="7" className="p-8 text-center text-gray-500 dark:text-gray-400">No orders found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Order Details Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-[60] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-dark-800 rounded-2xl w-full max-w-2xl overflow-hidden max-h-[90vh] flex flex-col animate-slide-up">
            <div className="p-6 border-b border-gray-100 dark:border-dark-700 flex justify-between items-center bg-gray-50 dark:bg-dark-900">
              <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100">Order {selectedOrder.orderId || `#${selectedOrder._id.substring(18)}`} Details</h2>
              <button onClick={() => closeModal()} className="text-gray-400 hover:text-gray-600 dark:text-gray-400 font-bold">✕</button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1 space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <h4 className="font-bold text-gray-800 dark:text-gray-100 mb-2">Customer Info</h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400"><strong>Name:</strong> {selectedOrder.customer?.name}</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400"><strong>Phone:</strong> {selectedOrder.customer?.phone}</p>
                </div>
                <div>
                  <h4 className="font-bold text-gray-800 dark:text-gray-100 mb-2">Delivery Address</h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400">{selectedOrder.deliveryAddress?.street}</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">{selectedOrder.deliveryAddress?.city}, {selectedOrder.deliveryAddress?.state} {selectedOrder.deliveryAddress?.postalCode}</p>
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-3">
                  <h4 className="font-bold text-gray-800 dark:text-gray-100">Order Items</h4>
                  {!isModifying && selectedOrder.status !== 'Completed' && selectedOrder.status !== 'Cancelled' && selectedOrder.status !== 'Delivered' && (
                    <button onClick={startModify} className="text-sm text-primary-600 font-bold hover:underline">Modify Items</button>
                  )}
                </div>
                
                <div className="bg-gray-50 dark:bg-dark-900 rounded-lg p-4 border border-gray-100 dark:border-dark-700">
                  {!isModifying ? (
                    <>
                      {selectedOrder.orderItems.map((item, idx) => (
                        <div key={idx} className="flex justify-between text-sm py-2 border-b border-gray-200 dark:border-dark-700 last:border-0">
                          <span>{item.quantity}x {item.name}</span>
                          <span className="font-medium">₹{item.price * item.quantity}</span>
                        </div>
                      ))}
                      <div className="flex justify-between font-bold mt-2 pt-2 border-t border-gray-200 dark:border-dark-700 text-base">
                        <span>Total</span>
                        <span>₹{selectedOrder.totalAmount}</span>
                      </div>
                    </>
                  ) : (
                    <div className="space-y-4">
                      {modifiedItems.map((item, idx) => (
                        <div key={idx} className="flex items-center justify-between text-sm py-2 border-b border-gray-200 dark:border-dark-700 last:border-0">
                          <span className="w-1/2 font-medium">{item.name}</span>
                          <div className="flex space-x-2 w-1/4">
                            <input type="number" onWheel={(e) => e.target.blur()} min="1" value={item.quantity} onChange={(e) => {
                              const newItems = [...modifiedItems];
                              newItems[idx].quantity = Number(e.target.value);
                              setModifiedItems(newItems);
                            }} className="w-16 px-2 py-1 border dark:border-dark-600 bg-white dark:bg-dark-900 text-gray-900 dark:text-white rounded" />
                          </div>
                          <span className="w-1/4 text-right font-medium">₹{item.price * item.quantity}</span>
                          <button onClick={() => {
                            setModifiedItems(modifiedItems.filter((_, i) => i !== idx));
                          }} className="text-red-500 font-bold ml-2">X</button>
                        </div>
                      ))}
                      <div className="flex justify-between font-bold mt-2 pt-2 border-t border-gray-200 dark:border-dark-700 text-base">
                        <span>New Total</span>
                        <span className="text-primary-600">₹{modifiedItems.reduce((acc, curr) => acc + (curr.price * curr.quantity), 0)}</span>
                      </div>
                      
                      <div className="mt-4">
                        <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">Reason for Modification</label>
                        <input type="text" placeholder="e.g. Customer requested quantity change" value={modifyReason} onChange={e => setModifyReason(e.target.value)} className="w-full px-3 py-2 border dark:border-dark-600 bg-white dark:bg-dark-900 text-gray-900 dark:text-white rounded-lg focus:ring-primary-500" />
                      </div>
                      <div className="flex justify-end space-x-2 mt-4">
                        <button onClick={() => setIsModifying(false)} className="px-4 py-2 text-gray-600 dark:text-gray-400 bg-gray-200 rounded-lg">Cancel</button>
                        <button onClick={saveModify} className="px-4 py-2 bg-primary-600 text-white rounded-lg font-bold">Save Changes</button>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="bg-primary-50 p-4 rounded-xl border dark:border-dark-600 bg-white dark:bg-dark-900 text-gray-900 dark:text-white border-primary-100 mt-6">
                {selectedOrder.deliveryPartner ? (
                  <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                    <p className="text-sm font-bold text-blue-800 dark:text-blue-300">
                      ✅ Assigned To: {selectedOrder.deliveryPartner.name} ({selectedOrder.deliveryPartner.phone})
                    </p>
                  </div>
                ) : null}
                <h4 className="font-bold text-primary-800 mb-3">
                  {selectedOrder.deliveryPartner ? 'Re-assign Delivery Partner' : 'Assign Delivery Partner'}
                </h4>
                <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                  <select 
                    className="flex-1 px-4 py-2 rounded-lg border dark:border-dark-600 bg-white dark:bg-dark-900 text-gray-900 dark:text-white focus:ring-primary-500 focus:border-primary-500"
                    value={assignPartnerId}
                    onChange={(e) => setAssignPartnerId(e.target.value)}
                    disabled={['Completed', 'Cancelled', 'Out for Delivery', 'Delivered'].includes(selectedOrder.status)}
                  >
                    <option value="">Select Partner</option>
                    <optgroup label="Online (Available)">
                      {deliveryPartners.filter(p => p.isAvailable && !p.isBlocked && !p.isSuspended && p.accountStatus !== 'deleted_by_admin' && p.accountStatus !== 'deleted_by_user').length === 0 ? (
                         <option disabled>No partners are currently available</option>
                      ) : (
                        deliveryPartners.filter(p => p.isAvailable && !p.isBlocked && !p.isSuspended && p.accountStatus !== 'deleted_by_admin' && p.accountStatus !== 'deleted_by_user').map(partner => {
                          const hasCancelled = selectedOrder.cancelledBy && selectedOrder.cancelledBy.includes(partner._id);
                          const isOutForDelivery = partner.isOutForDelivery || orders.some(o => o.status === 'Out for Delivery' && o.deliveryPartner?._id === partner._id);
                          const isDisabled = hasCancelled || isOutForDelivery;
                          return (
                            <option key={partner._id} value={partner._id} disabled={isDisabled}>
                              {partner.name} ({partner.phone}) {hasCancelled ? '- Cancelled Previously' : isOutForDelivery ? '- Out for Delivery' : ''}
                            </option>
                          );
                        })
                      )}
                    </optgroup>
                  </select>
                  <button 
                    onClick={handleAssign}
                    disabled={['Completed', 'Cancelled', 'Out for Delivery', 'Delivered'].includes(selectedOrder.status)}
                    className="bg-primary-600 text-white px-6 py-2 rounded-lg font-bold hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {selectedOrder.deliveryPartner ? 'Re-assign' : 'Assign'}
                  </button>
                </div>
                {selectedOrder.status === 'Completed' && <p className="text-sm text-green-600 mt-2 font-medium">Order is already completed.</p>}
                {selectedOrder.status === 'Cancelled' && <p className="text-sm text-red-600 mt-2 font-medium">Order is cancelled.</p>}
              </div>

              <div className="flex justify-end space-x-4 pt-4 border-t border-gray-100 dark:border-dark-700">
                <button 
                  onClick={generateInvoice}
                  className="px-4 py-2 border border-gray-300 dark:border-dark-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:bg-dark-900 font-medium"
                >
                  Download Invoice
                </button>
                {selectedOrder.status !== 'Completed' && selectedOrder.status !== 'Delivered' && selectedOrder.status !== 'Cancelled' && (
                  <button 
                    onClick={handleCancelOrder}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium"
                  >
                    Cancel Order
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
