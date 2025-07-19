import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useStateContext } from '../../context/StateContext';
import axios from 'axios';
import Cookies from 'js-cookie';
import AdminNavbar from '../../components/AdminNavbar';

const AdminDashboard = () => {
  const { user, isAuthenticated } = useStateContext();
  const router = useRouter();
  const [stats, setStats] = useState({
    totalProducts: 0,
    totalOrders: 0,
    totalUsers: 0,
    totalRevenue: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }    if (user && user.role !== 'ROLE_ADMIN') {
      router.push('/');
      return;
    }

    fetchDashboardStats();
  }, [isAuthenticated, user, router]);  const fetchDashboardStats = async () => {
    try {
      setLoading(true);
      
      // Fetch dashboard statistics from Spring Boot backend using axios directly
      let productsResponse, ordersResponse, usersResponse;
        // Set up API base URL and authentication
      const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api';
      const token = Cookies.get('authToken');
      
      // Create headers with auth token if available
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      
      try {
        // Get products data - we know it returns a paginated response with totalElements
        productsResponse = await axios.get(`${API_BASE_URL}/products`, { headers });
        console.log('Products API response:', productsResponse.data);
      } catch (error) {
        console.error('Error fetching products:', error);
        productsResponse = { data: { content: [], totalElements: 0 } };
      }
      
      try {
        // Get orders data
        ordersResponse = await axios.get(`${API_BASE_URL}/orders/admin/all`, { headers });
        console.log('Orders API response:', ordersResponse.data);
      } catch (error) {
        console.error('Error fetching orders from admin/all, trying alternative endpoint:', error);
        // Fallback to standard orders endpoint
        try {
          ordersResponse = await axios.get(`${API_BASE_URL}/orders`, { headers });
          console.log('Orders API fallback response:', ordersResponse.data);
        } catch (secondError) {
          console.error('Error fetching orders from fallback endpoint:', secondError);
          ordersResponse = { data: [] };
        }
      }
      
      try {
        // Get users data
        usersResponse = await axios.get(`${API_BASE_URL}/users/admin/all`, { headers });
        console.log('Users API response:', usersResponse.data);
      } catch (error) {
        console.error('Error fetching users from admin/all, trying alternative endpoint:', error);
        // Fallback to standard users endpoint
        try {
          usersResponse = await axios.get(`${API_BASE_URL}/users`, { headers });
          console.log('Users API fallback response:', usersResponse.data);
        } catch (secondError) {
          console.error('Error fetching users from fallback endpoint:', secondError);
          usersResponse = { data: [] };
        }
      }
        // Calculate product count from paginated response
      const totalProducts = productsResponse.data?.totalElements || 0;
      console.log('Total products calculated:', totalProducts);
      
      // Calculate order count
      let orders = Array.isArray(ordersResponse.data) ? ordersResponse.data : 
                 (ordersResponse.data?.content ? ordersResponse.data.content : []);
      const totalOrders = orders.length;
      console.log('Total orders calculated:', totalOrders);
      
      // Calculate user count
      let users = Array.isArray(usersResponse.data) ? usersResponse.data : 
               (usersResponse.data?.content ? usersResponse.data.content : []);
      const totalUsers = users.length;
      console.log('Total users calculated:', totalUsers);
        // Calculate total revenue
      const totalRevenue = orders.reduce((sum, order) => {
        const amount = order.totalPrice || order.totalAmount || order.total || 0;
        return sum + (parseFloat(amount) || 0);
      }, 0);
      console.log('Total revenue calculated:', totalRevenue);
      
      setStats({
        totalProducts,
        totalOrders,
        totalUsers,
        totalRevenue
      });
      
      console.log('Final dashboard stats:', {
        totalProducts,
        totalOrders,
        totalUsers,
        totalRevenue
      });
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Loading Admin Dashboard...</p>
      </div>
    );
  }
  if (!isAuthenticated || (user && user.role !== 'ROLE_ADMIN')) {
    return null;
  }

  return (
    <div className="admin-dashboard">
      <AdminNavbar />
      <div className="admin-content-wrapper">
        <div className="admin-header">
          <h1>Admin Dashboard</h1>
          <p>Welcome back, {user?.firstName}</p>
        </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon">📦</div>
          <div className="stat-content">
            <h3>{stats.totalProducts}</h3>
            <p>Total Products</p>
          </div>
        </div>
        
        <div className="stat-card">
          <div className="stat-icon">🛒</div>
          <div className="stat-content">
            <h3>{stats.totalOrders}</h3>
            <p>Total Orders</p>
          </div>
        </div>
        
        <div className="stat-card">
          <div className="stat-icon">👥</div>
          <div className="stat-content">
            <h3>{stats.totalUsers}</h3>
            <p>Total Users</p>
          </div>
        </div>
          <div className="stat-card">
          <div className="stat-icon">💰</div>
          <div className="stat-content">
            <h3>${typeof stats.totalRevenue === 'number' ? stats.totalRevenue.toFixed(2) : '0.00'}</h3>
            <p>Total Revenue</p>
          </div>
        </div>
      </div>

      <div className="admin-actions">
        <div className="action-grid">
          <button 
            className="admin-action-btn"
            onClick={() => router.push('/admin/products')}
          >
            <div className="action-icon">📦</div>
            <span>Manage Products</span>
          </button>
          
          <button 
            className="admin-action-btn"
            onClick={() => router.push('/admin/orders')}
          >
            <div className="action-icon">🛒</div>
            <span>Manage Orders</span>
          </button>
          
          <button 
            className="admin-action-btn"
            onClick={() => router.push('/admin/users')}
          >
            <div className="action-icon">👥</div>
            <span>Manage Users</span>
          </button>
          
          <button 
            className="admin-action-btn"
            onClick={() => router.push('/admin/categories')}
          >
            <div className="action-icon">📂</div>
            <span>Manage Categories</span>
          </button>
          
          <button 
            className="admin-action-btn"
            onClick={() => router.push('/admin/reviews')}
          >
            <div className="action-icon">⭐</div>
            <span>Manage Reviews</span>
          </button>
          
          <button 
            className="admin-action-btn"
            onClick={() => router.push('/admin/analytics')}
          >
            <div className="action-icon">📊</div>
            <span>Analytics</span>          </button>
        </div>
      </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
