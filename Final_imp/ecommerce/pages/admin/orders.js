import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useStateContext } from '../../context/StateContext';
import axios from 'axios';
import Cookies from 'js-cookie';
import AdminNavbar from '../../components/AdminNavbar';

const AdminOrders = () => {
  const { user, isAuthenticated } = useStateContext();
  const router = useRouter();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [statusFilter, setStatusFilter] = useState('');
  const [dateRange, setDateRange] = useState({
    startDate: '',
    endDate: ''
  });  // Based on Spring Boot OrderStatus enum (must match exactly for the status update)
  const orderStatuses = ['Pending', 'Processing', 'Shipped', 'Delivered', 'Cancelled'];
  
  // For display purposes (human-readable format)
  const displayOrderStatuses = {
    'Pending': 'Pending',
    'Processing': 'Processing', 
    'Shipped': 'Shipped',
    'Delivered': 'Delivered',
    'Cancelled': 'Cancelled'
  };

  // Setup API config
  const getApiConfig = () => {
    const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api';
    const token = Cookies.get('authToken');
    const headers = token ? { Authorization: `Bearer ${token}` } : {};
    return { baseURL: API_BASE_URL, headers };
  };

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }

    if (user && user.role !== 'ROLE_ADMIN') {
      router.push('/');
      return;
    }

    fetchOrders();
  }, [isAuthenticated, user, router, currentPage, statusFilter]);
  const fetchOrders = async () => {
    try {
      setLoading(true);
      const { baseURL, headers } = getApiConfig();
      let url = `/orders?page=${currentPage}&size=10&sortBy=creationDate&sortDir=desc`;
      
      if (statusFilter) {
        url = `/orders/by-status?status=${statusFilter}`;
      }
      
      const response = await axios.get(`${baseURL}${url}`, { headers });
      
      if (response.data.content) {
        // Paginated response
        setOrders(response.data.content);
        setTotalPages(response.data.totalPages);
        
        // Debug log to check data structure
        if (response.data.content.length > 0) {
          const firstOrder = response.data.content[0];
          console.log('First order structure:', JSON.stringify(firstOrder, null, 2));
          console.log('Customer name field:', firstOrder.customerName);
          console.log('Order status field details:', {
            orderStatus: firstOrder.orderStatus,
            status: firstOrder.status,
            orderId: firstOrder.orderId,
            id: firstOrder.id
          });
          console.log('Customer info paths:', {
            directCustomerName: firstOrder.customerName,
            customerUserPath: firstOrder.customer?.user?.firstName 
              ? `${firstOrder.customer.user.firstName} ${firstOrder.customer.user.lastName}`
              : null,
            directUserPath: firstOrder.user?.firstName
              ? `${firstOrder.user.firstName} ${firstOrder.user.lastName}`
              : null
          });
        }
      } else {
        // Array response (for status filter)
        setOrders(response.data || []);
        setTotalPages(1);
        
        // Debug log to check data structure
        if (response.data.length > 0) {
          const firstOrder = response.data[0];
          console.log('First order structure (non-paginated):', JSON.stringify(firstOrder, null, 2));
          console.log('Customer name field:', firstOrder.customerName);
          console.log('Order status field details:', {
            orderStatus: firstOrder.orderStatus,
            status: firstOrder.status,
            orderId: firstOrder.orderId,
            id: firstOrder.id
          });
          console.log('Customer info paths:', {
            directCustomerName: firstOrder.customerName,
            customerUserPath: firstOrder.customer?.user?.firstName 
              ? `${firstOrder.customer.user.firstName} ${firstOrder.customer.user.lastName}`
              : null,
            directUserPath: firstOrder.user?.firstName
              ? `${firstOrder.user.firstName} ${firstOrder.user.lastName}`
              : null
          });
        }
      }
    } catch (error) {
      console.error('Error fetching orders:', error);
      setOrders([]);
    } finally {
      setLoading(false);
    }  };  const handleStatusUpdate = async (orderId, newStatus) => {
    try {
      console.log(`Updating order ${orderId} to status: ${newStatus}`);
      const { baseURL, headers } = getApiConfig();
      
      // Debug log the request
      console.log('Request URL:', `${baseURL}/orders/${orderId}/status`);
        // The backend expects an OrderStatusUpdateRequest object with orderStatus field
      // Based on the Java backend code: OrderStatusUpdateRequest.java
      const payload = { 
        orderStatus: newStatus  // Send as-is (e.g., "Pending", "Processing", etc.)
      };
      console.log('Request payload:', payload);
      console.log('Request headers:', headers);
      
      const response = await axios.put(
        `${baseURL}/orders/${orderId}/status`, 
        payload,
        { headers }
      );
      
      console.log('Status update response:', response.data);
      await fetchOrders(); // Refresh orders
      alert('Order status updated successfully');
    } catch (error) {
      console.error('Error updating order status:', error);
      
      if (error.response) {
        console.error('Response status:', error.response.status);
        console.error('Response details:', error.response?.data);
        
        // Log the full error object for debugging
        console.error('Full error object:', JSON.stringify(error, null, 2));
      }
      
      alert('Error updating order status. Please try again.');
    }
  };
  const handleDateRangeFilter = async () => {
    if (!dateRange.startDate || !dateRange.endDate) {
      alert('Please select both start and end dates');
      return;
    }

    try {
      setLoading(true);
      const { baseURL, headers } = getApiConfig();
      const response = await axios.get(`${baseURL}/orders/by-date-range?startDate=${dateRange.startDate}T00:00:00&endDate=${dateRange.endDate}T23:59:59`, { headers });
      setOrders(response.data || []);
      setTotalPages(1);
    } catch (error) {
      console.error('Error filtering orders by date:', error);
      alert('Error filtering orders. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const clearFilters = () => {
    setStatusFilter('');
    setDateRange({ startDate: '', endDate: '' });
    setCurrentPage(0);
    fetchOrders();
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };  const getStatusColor = (status) => {
    // Normalize status to title case to match colors
    const normalizedStatus = status?.charAt(0)?.toUpperCase() + status?.slice(1)?.toLowerCase();
    
    const colors = {
      Pending: '#ffa500',
      Processing: '#ff9800',
      Shipped: '#9c27b0',
      Delivered: '#4caf50',
      Cancelled: '#f44336'
    };
    return colors[normalizedStatus] || '#666';
  };
  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Loading Orders...</p>
      </div>
    );
  }

  if (!isAuthenticated || (user && user.role !== 'ROLE_ADMIN')) {
    return null;
  }

  return (
    <div className="admin-orders">
      <AdminNavbar />
      <div className="admin-content-wrapper">
        <div className="admin-header">
        <h1>Order Management</h1>
        <p>Manage and track all customer orders</p>
      </div>

      {/* Filters */}
      <div className="filters-section">
        <div className="filter-group">
          <label>Filter by Status:</label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="">All Statuses</option>
            {orderStatuses.map(status => (
              <option key={status} value={status}>{status}</option>
            ))}
          </select>
        </div>

        <div className="filter-group">
          <label>Filter by Date Range:</label>
          <div className="date-range">
            <input
              type="date"
              value={dateRange.startDate}
              onChange={(e) => setDateRange({...dateRange, startDate: e.target.value})}
            />
            <span>to</span>
            <input
              type="date"
              value={dateRange.endDate}
              onChange={(e) => setDateRange({...dateRange, endDate: e.target.value})}
            />
            <button onClick={handleDateRangeFilter} className="btn-secondary">
              Filter
            </button>
          </div>
        </div>

        <button onClick={clearFilters} className="btn-secondary">
          Clear Filters
        </button>
      </div>

      {/* Orders Table */}
      <div className="admin-table-container">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Order ID</th>
              <th>Customer</th>
              <th>Date</th>
              <th>Items</th>
              <th>Total</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((order) => (              <tr key={order.id || order.orderId}>
                <td>#{order.id || order.orderId}</td><td>                  <div className="customer-info">
                    <div className="customer-name">
                      {order.customerName || 
                        (order.customer?.user?.firstName && `${order.customer.user.firstName} ${order.customer.user.lastName}`) || 
                        (order.user?.firstName && `${order.user.firstName} ${order.user.lastName}`) || 
                        'N/A'}
                    </div>
                    <div className="customer-email">
                      {order.customer?.user?.email || order.user?.email || order.email || `Customer ID: ${order.customerId}`}
                    </div>
                  </div>
                </td>
                <td>{formatDate(order.creationDate || order.orderDate)}</td>                <td>{order.orderItems?.length || 0} items</td>
                <td>${(order.totalPrice || order.totalAmount || 0).toFixed(2)}</td>                <td><span 
                    className="status-badge"
                    style={{ 
                      backgroundColor: getStatusColor(order.orderStatus || order.status),
                      color: '#fff' 
                    }}
                  >
                    {order.orderStatus || order.status || 'Unknown'}
                  </span>
                </td>
                <td>
                  <div className="order-actions">                    <select
                      value={order.orderStatus || order.status || ''}
                      onChange={(e) => handleStatusUpdate(order.id || order.orderId, e.target.value)}
                      className="status-select"
                      disabled={
                        (order.orderStatus || order.status)?.toLowerCase() === 'cancelled' ||
                        (order.orderStatus || order.status)?.toLowerCase() === 'delivered'
                      }
                      style={{
                        borderColor: getStatusColor(order.orderStatus || order.status),
                        color: getStatusColor(order.orderStatus || order.status),
                        opacity: 
                          (order.orderStatus || order.status)?.toLowerCase() === 'cancelled' ||
                          (order.orderStatus || order.status)?.toLowerCase() === 'delivered' 
                            ? 0.6 : 1,
                        cursor: 
                          (order.orderStatus || order.status)?.toLowerCase() === 'cancelled' ||
                          (order.orderStatus || order.status)?.toLowerCase() === 'delivered'
                            ? 'not-allowed' : 'pointer'
                      }}
                    >
                      <option value="" disabled>Select Status</option>
                      {orderStatuses.map(status => (
                        <option key={status} value={status}>{status}</option>
                      ))}
                    </select>                    <button 
                      className="btn-view"
                      onClick={() => router.push(`/admin/orders/${order.id || order.orderId}`)}
                    >
                      View Details
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {orders.length === 0 && (
          <div className="no-orders">
            <h3>No orders found</h3>
            <p>No orders match your current filters.</p>
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && !statusFilter && !dateRange.startDate && (
        <div className="pagination">
          <button 
            onClick={() => setCurrentPage(prev => Math.max(0, prev - 1))}
            disabled={currentPage === 0}
            className="pagination-btn"
          >
            Previous
          </button>
          
          <div className="pagination-info">
            Page {currentPage + 1} of {totalPages}
          </div>
          
          <button 
            onClick={() => setCurrentPage(prev => Math.min(totalPages - 1, prev + 1))}
            disabled={currentPage >= totalPages - 1}
            className="pagination-btn"
          >
            Next          </button>
        </div>
      )}
      </div>
    </div>
  );
};

export default AdminOrders;
