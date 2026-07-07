import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { useUIStore } from '../../store/uiStore';
import { FileText, Calendar, DollarSign, Wallet, CreditCard, CheckCircle, Clock, Filter } from 'lucide-react';

const Settlements = () => {
  const [reportData, setReportData] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const getLocalYYYYMMDD = (d) => {
    const local = new Date(d);
    local.setMinutes(local.getMinutes() - local.getTimezoneOffset());
    return local.toISOString().split('T')[0];
  };
  const todayStr = getLocalYYYYMMDD(new Date());
  const [dateFilter, setDateFilter] = useState('Today');
  const [startDate, setStartDate] = useState(todayStr);
  const [endDate, setEndDate] = useState(todayStr);
  const [statusFilter, setStatusFilter] = useState('All');
  
  const { showToast } = useUIStore();

  const handleDateFilterChange = (e) => {
    const filter = e.target.value;
    setDateFilter(filter);
    const today = new Date();
    
    if (filter === 'All Time') {
      setStartDate('');
      setEndDate('');
    } else if (filter === 'Today') {
      setStartDate(getLocalYYYYMMDD(today));
      setEndDate(getLocalYYYYMMDD(today));
    } else if (filter === 'Last 7 Days') {
      const lastWeek = new Date(today);
      lastWeek.setDate(today.getDate() - 7);
      setStartDate(getLocalYYYYMMDD(lastWeek));
      setEndDate(getLocalYYYYMMDD(today));
    } else if (filter === 'This Month') {
      const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
      setStartDate(getLocalYYYYMMDD(firstDay));
      setEndDate(getLocalYYYYMMDD(today));
    }
  };

  const fetchReport = async () => {
    setLoading(true);
    try {
      let url = '/settlements/report';
      if (startDate && endDate) {
        url += `?startDate=${startDate}&endDate=${endDate}`;
      }
      const { data } = await api.get(url);
      setReportData(data.data);
    } catch (error) {
      console.error(error);
      showToast('Failed to fetch settlement report', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, [startDate, endDate]);

  useEffect(() => {
    if (startDate && endDate && new Date(endDate) < new Date(startDate)) {
      showToast('To Date cannot be before From Date', 'error');
      setEndDate('');
    }
  }, [startDate, endDate, showToast]);

  const handleAdminSubmit = async (partnerId) => {
    try {
      await api.post('/settlements/admin-submit', { partnerId, startDate, endDate });
      showToast('Cash successfully submitted and recorded', 'success');
      fetchReport();
    } catch (error) {
      showToast(error.response?.data?.message || 'Failed to submit cash', 'error');
    }
  };

  const filteredReportData = reportData
    .map(row => {
      let statusColor = 'bg-gray-100 text-gray-700 dark:bg-dark-700 dark:text-gray-400';
      let statusText = 'No Deliveries';

      if (row.ordersDelivered > 0 || row.totalCollected > 0) {
        statusColor = 'bg-green-100 text-green-700';
        statusText = 'Fully Submitted';

        if (row.pendingCash > 0 && row.submittedCash > 0) {
          statusColor = 'bg-yellow-100 text-yellow-700';
          statusText = 'Partially Submitted';
        } else if (row.pendingCash > 0 && row.submittedCash === 0) {
          statusColor = 'bg-red-100 text-red-700 dark:text-red-400';
          statusText = 'Pending Collection';
        }
      }
      return { ...row, statusColor, statusText };
    })
    .filter(row => {
      if (statusFilter === 'All') return true;
      if (statusFilter === 'Fully Submitted') return row.statusText === 'Fully Submitted';
      if (statusFilter === 'Partially Submitted') return row.statusText === 'Partially Submitted';
      if (statusFilter === 'Pending') return row.statusText === 'Pending Collection';
      return true;
    });

  const totalPendingCOD = filteredReportData.reduce((sum, r) => sum + r.pendingCash, 0);
  const totalSubmittedCOD = filteredReportData.reduce((sum, r) => sum + r.submittedCash, 0);
  const totalOrders = filteredReportData.reduce((sum, r) => sum + r.ordersDelivered, 0);
  const totalCash = filteredReportData.reduce((sum, r) => sum + r.cashCollected, 0);
  const totalUPI = filteredReportData.reduce((sum, r) => sum + r.upiCollected, 0);
  const totalAmount = filteredReportData.reduce((sum, r) => sum + r.totalCollected, 0);

  return (
    <div className="p-4 md:p-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h2 className="text-2xl md:text-3xl font-black tracking-tight text-gray-900 dark:text-white">Settlements</h2>
          <p className="text-sm font-bold text-gray-500 dark:text-gray-400 mt-1">Manage delivery partner cash collections</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center space-x-2 bg-gray-50 dark:bg-dark-900 px-3 py-2 rounded-lg border border-gray-200 dark:border-dark-700">
            <Calendar size={18} className="text-gray-500 dark:text-gray-400" />
            <select
              value={dateFilter}
              onChange={handleDateFilterChange}
              className="bg-transparent border-none text-sm font-bold text-gray-700 dark:text-gray-300 focus:outline-none cursor-pointer"
            >
              <option value="All Time">All Time</option>
              <option value="Today">Today</option>
              <option value="Last 7 Days">Last 7 Days</option>
              <option value="This Month">This Month</option>
              <option value="Custom Range">Custom Range</option>
            </select>
          </div>
          
          <div className="flex items-center space-x-2 bg-gray-50 dark:bg-dark-900 px-3 py-2 rounded-lg border border-gray-200 dark:border-dark-700">
            <Filter size={18} className="text-gray-500 dark:text-gray-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-transparent border-none text-sm font-bold text-gray-700 dark:text-gray-300 focus:outline-none cursor-pointer"
            >
              <option value="All">All Statuses</option>
              <option value="Fully Submitted">Fully Submitted</option>
              <option value="Partially Submitted">Partially Submitted</option>
              <option value="Pending">Pending Collection</option>
            </select>
          </div>

          {dateFilter === 'Custom Range' && (
            <>
              <div className="flex items-center space-x-2 bg-gray-50 dark:bg-dark-900 px-3 py-2 rounded-lg border border-gray-200 dark:border-dark-700">
                <input 
                  type="date" 
                  max={new Date().toISOString().split('T')[0]}
                  value={startDate} 
                  onChange={(e) => {
                    const newDate = e.target.value;
                    if (endDate && newDate > endDate) {
                      showToast('From Date cannot be later than To Date', 'error');
                      return;
                    }
                    setStartDate(newDate);
                  }}
                  className="bg-transparent border-none text-sm font-bold text-gray-700 dark:text-gray-300 focus:outline-none"
                />
              </div>
              <span className="text-gray-400 font-bold">to</span>
              <div className="flex items-center space-x-2 bg-gray-50 dark:bg-dark-900 px-3 py-2 rounded-lg border border-gray-200 dark:border-dark-700">
                <input 
                  type="date" 
                  max={new Date().toISOString().split('T')[0]}
                  min={startDate || undefined}
                  value={endDate} 
                  onChange={(e) => {
                    const newDate = e.target.value;
                    if (startDate && newDate < startDate) {
                      showToast('To Date cannot be earlier than From Date', 'error');
                      return;
                    }
                    setEndDate(newDate);
                  }}
                  className="bg-transparent border-none text-sm font-bold text-gray-700 dark:text-gray-300 focus:outline-none"
                />
              </div>
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-8">
        <div className="bg-white dark:bg-dark-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-dark-700 flex items-center">
          <div className="bg-blue-50 p-3 rounded-xl mr-3 text-blue-600">
            <FileText size={24} />
          </div>
          <div>
            <p className="text-gray-500 dark:text-gray-400 text-[10px] font-bold uppercase tracking-wider">Deliveries</p>
            <h3 className="text-xl font-black text-gray-800 dark:text-gray-100 mt-0.5">{totalOrders}</h3>
          </div>
        </div>
        <div className="bg-white dark:bg-dark-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-dark-700 flex items-center">
          <div className="bg-green-50 dark:bg-green-900/20 p-3 rounded-xl mr-3 text-green-600">
            <DollarSign size={24} />
          </div>
          <div>
            <p className="text-gray-500 dark:text-gray-400 text-[10px] font-bold uppercase tracking-wider">Total Cash</p>
            <h3 className="text-xl font-black text-gray-800 dark:text-gray-100 mt-0.5">₹{totalCash}</h3>
          </div>
        </div>
        <div className="bg-white dark:bg-dark-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-dark-700 flex items-center">
          <div className="bg-purple-50 p-3 rounded-xl mr-3 text-purple-600">
            <CreditCard size={24} />
          </div>
          <div>
            <p className="text-gray-500 dark:text-gray-400 text-[10px] font-bold uppercase tracking-wider">Total UPI</p>
            <h3 className="text-xl font-black text-gray-800 dark:text-gray-100 mt-0.5">₹{totalUPI}</h3>
          </div>
        </div>
        <div className="bg-white dark:bg-dark-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-dark-700 flex items-center ring-1 ring-primary-200">
          <div className="bg-primary-50 p-3 rounded-xl mr-3 text-primary-600">
            <Wallet size={24} />
          </div>
          <div>
            <p className="text-gray-500 dark:text-gray-400 text-[10px] font-bold uppercase tracking-wider">Collection</p>
            <h3 className="text-xl font-black text-gray-800 dark:text-gray-100 mt-0.5">₹{totalAmount}</h3>
          </div>
        </div>
        <div className="bg-white dark:bg-dark-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-dark-700 flex items-center ring-1 ring-red-200">
          <div className="bg-red-50 dark:bg-red-900/20 p-3 rounded-xl mr-3 text-red-600">
            <Clock size={24} />
          </div>
          <div>
            <p className="text-gray-500 dark:text-gray-400 text-[10px] font-bold uppercase tracking-wider">Pending COD</p>
            <h3 className="text-xl font-black text-gray-800 dark:text-gray-100 mt-0.5">₹{totalPendingCOD}</h3>
          </div>
        </div>
        <div className="bg-white dark:bg-dark-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-dark-700 flex items-center ring-1 ring-green-200">
          <div className="bg-green-50 dark:bg-green-900/20 p-3 rounded-xl mr-3 text-green-600">
            <CheckCircle size={24} />
          </div>
          <div>
            <p className="text-gray-500 dark:text-gray-400 text-[10px] font-bold uppercase tracking-wider">Submitted COD</p>
            <h3 className="text-xl font-black text-gray-800 dark:text-gray-100 mt-0.5">₹{totalSubmittedCOD}</h3>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-dark-800 rounded-2xl shadow-sm border border-gray-100 dark:border-dark-700 overflow-hidden">
        {loading ? (
          <div className="text-center py-12"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-dark-900 border-b border-gray-100 dark:border-dark-700">
                <tr>
                  <th className="p-4 text-left text-xs font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest">Partner</th>
                  <th className="p-4 text-center text-xs font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest">Delivered</th>
                  <th className="p-4 text-right text-xs font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest">Cash</th>
                  <th className="p-4 text-right text-xs font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest">UPI</th>
                  <th className="p-4 text-right text-xs font-black text-primary-600 dark:text-primary-400 uppercase tracking-widest">Total</th>
                  <th className="p-4 text-right text-xs font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest">Submitted</th>
                  <th className="p-4 text-right text-xs font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest">Pending</th>
                  <th className="p-4 text-center text-xs font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest">Status</th>
                  <th className="p-4 text-center text-xs font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-dark-700">
                {filteredReportData.length === 0 ? (
                  <tr>
                    <td colSpan="9" className="p-8 text-center text-gray-500 dark:text-gray-400">
                      No collections or pending cash found for this status or date range.
                    </td>
                  </tr>
                ) : filteredReportData.map((row) => {
                  return (
                    <tr key={row.partner._id} className="hover:bg-gray-50 dark:bg-dark-900 transition">
                      <td className="p-4">
                        <div className="flex items-center space-x-3">
                          <div className="h-10 w-10 rounded-full bg-primary-50 text-primary-600 flex items-center justify-center font-bold">
                            {row.partner.name?.charAt(0) || '?'}
                          </div>
                          <div>
                            <p className="font-bold text-gray-800 dark:text-gray-100">{row.partner.name}</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">{row.partner.phone}</p>
                          </div>
                        </div>
                      </td>
                      <td className="p-4 font-bold text-gray-700 dark:text-gray-300 text-center">{row.ordersDelivered}</td>
                      <td className="p-4 font-bold text-green-600 text-right">₹{row.cashCollected}</td>
                      <td className="p-4 font-bold text-purple-600 text-right">₹{row.upiCollected}</td>
                      <td className="p-4 font-bold text-primary-700 text-right bg-primary-50/30">₹{row.totalCollected}</td>
                      <td className="p-4 font-bold text-gray-500 dark:text-gray-400 text-right">₹{row.submittedCash}</td>
                      <td className="p-4 font-bold text-red-600 text-right text-lg">₹{row.pendingCash}</td>
                      <td className="p-4 text-center">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-bold whitespace-nowrap inline-block ${row.statusColor}`}>
                          {row.statusText}
                        </span>
                      </td>
                      <td className="p-4 text-center">
                        <button
                          disabled={row.pendingCash === 0}
                          onClick={() => {
                            if(window.confirm(`Are you sure you want to collect ₹${row.pendingCash} from ${row.partner.name}?`)) {
                              handleAdminSubmit(row.partner._id);
                            }
                          }}
                          className="inline-flex items-center space-x-1 p-2 bg-white dark:bg-dark-800 border border-gray-200 dark:border-dark-700 rounded-lg shadow-sm hover:border-green-500 hover:text-green-600 transition disabled:opacity-50 disabled:cursor-not-allowed"
                          title="Mark Cash as Submitted"
                        >
                          <input 
                            type="checkbox" 
                            checked={row.pendingCash === 0} 
                            readOnly 
                            className="w-5 h-5 text-green-600 rounded focus:ring-green-500 cursor-pointer pointer-events-none" 
                          />
                          <span className="text-sm font-bold ml-2">Collect</span>
                        </button>
                      </td>
                    </tr>
                  )
                })}
                {reportData.length > 0 && (
                  <tr className="bg-gray-50 dark:bg-dark-900 border-t-2 border-gray-200 dark:border-dark-700">
                    <td className="p-4 font-bold text-gray-800 dark:text-gray-100 text-right uppercase tracking-wider">Total</td>
                    <td className="p-4 font-bold text-gray-800 dark:text-gray-100 text-center">{totalOrders}</td>
                    <td className="p-4 font-bold text-green-700 text-right">₹{totalCash}</td>
                    <td className="p-4 font-bold text-purple-700 text-right">₹{totalUPI}</td>
                    <td className="p-4 font-bold text-primary-800 text-right">₹{totalAmount}</td>
                    <td className="p-4 font-bold text-gray-600 dark:text-gray-400 text-right">₹{totalSubmittedCOD}</td>
                    <td className="p-4 font-bold text-red-600 text-right text-lg">₹{totalPendingCOD}</td>
                    <td className="p-4"></td>
                    <td className="p-4"></td>
                  </tr>
                )}
                {reportData.length === 0 && (
                  <tr>
                    <td colSpan="7" className="p-8 text-center text-gray-500 dark:text-gray-400">
                      No delivery partners found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default Settlements;
