import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useStateContext } from '../../context/StateContext';
import axios from 'axios';
import Cookies from 'js-cookie';
import AdminNavbar from '../../components/AdminNavbar';

const AdminAnalytics = () => {
  const { user, isAuthenticated } = useStateContext();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [analytics, setAnalytics] = useState({
    totalRevenue: 0,
    totalOrders: 0,
    averageOrderValue: 0,
    ordersByStatus: {},
    revenueByMonth: {},
    topProducts: [],
    orderTrends: []
  });
  const [dateRange, setDateRange] = useState({
    startDate: new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0], // Start of year
    endDate: new Date().toISOString().split('T')[0] // Today
  });

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

    fetchAnalytics();
  }, [isAuthenticated, user, router, dateRange]);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const { baseURL, headers } = getApiConfig();

      // Fetch orders data
      const ordersResponse = await axios.get(`${baseURL}/orders`, { headers });
      let orders = [];
      
      if (ordersResponse.data.content) {
        orders = ordersResponse.data.content;
      } else if (Array.isArray(ordersResponse.data)) {
        orders = ordersResponse.data;
      }

      // Fetch products data for top products analysis
      const productsResponse = await axios.get(`${baseURL}/products`, { headers });
      let products = [];
      
      if (productsResponse.data.content) {
        products = productsResponse.data.content;
      } else if (Array.isArray(productsResponse.data)) {
        products = productsResponse.data;
      }

      // Filter orders by date range
      const filteredOrders = orders.filter(order => {
        const orderDate = new Date(order.creationDate);
        const start = new Date(dateRange.startDate);
        const end = new Date(dateRange.endDate);
        return orderDate >= start && orderDate <= end;
      });

      // Calculate analytics
      const totalRevenue = filteredOrders.reduce((sum, order) => {
        return sum + (parseFloat(order.totalPrice || order.totalAmount || 0));
      }, 0);

      const totalOrders = filteredOrders.length;
      const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

      // Orders by status
      const ordersByStatus = filteredOrders.reduce((acc, order) => {
        const status = order.orderStatus || order.status || 'Unknown';
        acc[status] = (acc[status] || 0) + 1;
        return acc;
      }, {});

      // Revenue by month
      const revenueByMonth = filteredOrders.reduce((acc, order) => {
        const month = new Date(order.creationDate).toLocaleDateString('en-US', { 
          year: 'numeric', 
          month: 'short' 
        });
        acc[month] = (acc[month] || 0) + parseFloat(order.totalPrice || order.totalAmount || 0);
        return acc;
      }, {});

      // Top products (based on order items)
      const productSales = {};
      filteredOrders.forEach(order => {
        if (order.orderItems) {
          order.orderItems.forEach(item => {
            const productId = item.productId;
            if (!productSales[productId]) {
              productSales[productId] = {
                productId,
                productName: item.productName || 'Unknown Product',
                totalQuantity: 0,
                totalRevenue: 0
              };
            }
            productSales[productId].totalQuantity += item.quantity || 0;
            productSales[productId].totalRevenue += parseFloat(item.subtotal || item.priceAtPurchase * item.quantity || 0);
          });
        }
      });

      const topProducts = Object.values(productSales)
        .sort((a, b) => b.totalRevenue - a.totalRevenue)
        .slice(0, 10);

      // Order trends (last 7 days)
      const last7Days = Array.from({ length: 7 }, (_, i) => {
        const date = new Date();
        date.setDate(date.getDate() - i);
        return date.toISOString().split('T')[0];
      }).reverse();

      const orderTrends = last7Days.map(date => {
        const ordersOnDate = filteredOrders.filter(order => 
          new Date(order.creationDate).toISOString().split('T')[0] === date
        );
        return {
          date: new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          orders: ordersOnDate.length,
          revenue: ordersOnDate.reduce((sum, order) => 
            sum + parseFloat(order.totalPrice || order.totalAmount || 0), 0
          )
        };
      });

      setAnalytics({
        totalRevenue,
        totalOrders,
        averageOrderValue,
        ordersByStatus,
        revenueByMonth,
        topProducts,
        orderTrends
      });

    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const getStatusColor = (status) => {
    const colors = {
      Pending: '#ffa500',
      Processing: '#ff9800',
      Shipped: '#9c27b0',
      Delivered: '#4caf50',
      Cancelled: '#f44336'
    };
    return colors[status] || '#666';
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Loading Analytics...</p>
      </div>
    );
  }

  if (!isAuthenticated || (user && user.role !== 'ROLE_ADMIN')) {
    return null;
  }

  return (
    <div className="admin-analytics">
      <AdminNavbar />
      <div className="admin-content-wrapper">
        <div className="admin-header">
          <h1>Analytics Dashboard</h1>
          <p>Comprehensive insights into your business performance</p>
        </div>

        {/* Date Range Filter */}
        <div className="filters-section">
          <div className="filter-group">
            <label>Date Range:</label>
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
            </div>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="analytics-overview">
          <div className="metric-card">
            <div className="metric-icon">💰</div>
            <div className="metric-info">
              <h3>{formatCurrency(analytics.totalRevenue)}</h3>
              <p>Total Revenue</p>
            </div>
          </div>
          <div className="metric-card">
            <div className="metric-icon">📦</div>
            <div className="metric-info">
              <h3>{analytics.totalOrders}</h3>
              <p>Total Orders</p>
            </div>
          </div>
          <div className="metric-card">
            <div className="metric-icon">📊</div>
            <div className="metric-info">
              <h3>{formatCurrency(analytics.averageOrderValue)}</h3>
              <p>Average Order Value</p>
            </div>
          </div>
        </div>

        {/* Charts Section */}
        <div className="analytics-charts">
          {/* Orders by Status */}
          <div className="chart-card">
            <h3>Orders by Status</h3>
            <div className="status-chart">
              {Object.entries(analytics.ordersByStatus).map(([status, count]) => (
                <div key={status} className="status-bar">
                  <div className="status-info">
                    <span className="status-name">{status}</span>
                    <span className="status-count">{count}</span>
                  </div>
                  <div className="status-progress">
                    <div 
                      className="status-fill"
                      style={{ 
                        width: `${(count / analytics.totalOrders) * 100}%`,
                        backgroundColor: getStatusColor(status)
                      }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Revenue by Month */}
          <div className="chart-card">
            <h3>Revenue by Month</h3>
            <div className="revenue-chart">
              {Object.entries(analytics.revenueByMonth).map(([month, revenue]) => (
                <div key={month} className="revenue-bar">
                  <div className="month-info">
                    <span className="month-name">{month}</span>
                    <span className="month-revenue">{formatCurrency(revenue)}</span>
                  </div>
                  <div className="revenue-progress">
                    <div 
                      className="revenue-fill"
                      style={{ 
                        width: `${(revenue / Math.max(...Object.values(analytics.revenueByMonth))) * 100}%`
                      }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Order Trends */}
          <div className="chart-card">
            <h3>Order Trends (Last 7 Days)</h3>
            <div className="trends-chart">
              {analytics.orderTrends.map((trend, index) => (
                <div key={index} className="trend-day">
                  <div className="trend-bar">
                    <div 
                      className="trend-fill"
                      style={{ 
                        height: `${(trend.orders / Math.max(...analytics.orderTrends.map(t => t.orders)) || 1) * 100}%`
                      }}
                    ></div>
                  </div>
                  <div className="trend-info">
                    <span className="trend-date">{trend.date}</span>
                    <span className="trend-orders">{trend.orders} orders</span>
                    <span className="trend-revenue">{formatCurrency(trend.revenue)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Top Products */}
          <div className="chart-card">
            <h3>Top Products by Revenue</h3>
            <div className="products-table">
              <table>
                <thead>
                  <tr>
                    <th>Product</th>
                    <th>Quantity Sold</th>
                    <th>Revenue</th>
                  </tr>
                </thead>
                <tbody>
                  {analytics.topProducts.map((product, index) => (
                    <tr key={product.productId}>
                      <td>
                        <div className="product-info">
                          <span className="product-rank">#{index + 1}</span>
                          <span className="product-name">{product.productName}</span>
                        </div>
                      </td>
                      <td>{product.totalQuantity}</td>
                      <td>{formatCurrency(product.totalRevenue)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminAnalytics;
