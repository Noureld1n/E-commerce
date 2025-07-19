import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useStateContext } from '../../context/StateContext';
import axios from 'axios';
import Cookies from 'js-cookie';
import AdminNavbar from '../../components/AdminNavbar';

const AdminUsers = () => {
  const { user, isAuthenticated } = useStateContext();
  const router = useRouter();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [roleFilter, setRoleFilter] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

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

    fetchUsers();
  }, [isAuthenticated, user, router]);
  const fetchUsers = async () => {
    try {
      setLoading(true);
      const { baseURL, headers } = getApiConfig();
      
      // Try to get users from admin endpoint, fallback to regular users endpoint
      let response;
      try {
        response = await axios.get(`${baseURL}/users`, { headers });
      } catch (error) {
        try {
          response = await axios.get(`${baseURL}/auth/users`, { headers });
        } catch (secondError) {
          response = { data: [] };
          console.error('Failed to fetch users from both endpoints');
        }
      }

      // Debug: Log first user data to console
      if (response.data && response.data.length > 0) {
        console.log('First user data:', JSON.stringify(response.data[0], null, 2));
        console.log('Date field names:', {
          registerDate: Boolean(response.data[0].registerDate),
          registrationDate: Boolean(response.data[0].registrationDate),
          createdAt: Boolean(response.data[0].createdAt)
        });
        
        // Log unique role values to see their exact format
        const uniqueRoles = [...new Set(response.data.map(u => u.role))];
        console.log('Available role values:', uniqueRoles);
      }
      
      setUsers(response.data || []);
    } catch (error) {
      console.error('Error fetching users:', error);
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };
  const handleRoleUpdate = async (userId, newRole) => {
    try {
      const { baseURL, headers } = getApiConfig();
      await axios.put(`${baseURL}/users/${userId}/role`, { role: newRole }, { headers });
      await fetchUsers(); // Refresh users
      alert('User role updated successfully');
    } catch (error) {
      console.error('Error updating user role:', error);
      alert('Error updating user role. Please try again.');
    }
  };
  const handleUserToggle = async (userId, isActive) => {
    try {
      const { baseURL, headers } = getApiConfig();
      await axios.put(`${baseURL}/users/${userId}/status`, { isActive: !isActive }, { headers });
      await fetchUsers(); // Refresh users
      alert(`User ${!isActive ? 'activated' : 'deactivated'} successfully`);
    } catch (error) {
      console.error('Error updating user status:', error);
      alert('Error updating user status. Please try again.');
    }
  };

  const filteredUsers = users.filter(u => {
    const matchesRole = !roleFilter || u.role === roleFilter;
    const matchesSearch = !searchTerm || 
      u.firstName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.lastName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.email?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesRole && matchesSearch;
  });
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    
    try {
      const date = new Date(dateString);
      // Check if date is valid
      if (isNaN(date.getTime())) {
        console.warn('Invalid date:', dateString);
        return 'Invalid Date';
      }
      
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch (error) {
      console.error('Error formatting date:', error);
      return 'Error';
    }
  };
  const getRoleBadgeColor = (role) => {
    return role === 'ROLE_ADMIN' ? '#f02d34' : '#2196f3';
  };
  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Loading Users...</p>
      </div>
    );
  }

  if (!isAuthenticated || (user && user.role !== 'ROLE_ADMIN')) {
    return null;
  }

  return (
    <div className="admin-users">
      <AdminNavbar />
      <div className="admin-content-wrapper">        <div className="admin-header">
          <h1>User Management</h1>
          <p>Manage all registered users and their roles</p>
        </div>

      {/* Filters */}
      <div className="filters-section">        <div className="filter-group">
          <label>Search Users:</label>
          <div className="search-wrapper">
            <span className="search-icon">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#64748B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><path d="M21 21l-4.35-4.35"></path></svg>
            </span>
            <input
              type="text"
              placeholder="Search by name or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />
          </div>
        </div>        <div className="filter-group">
          <label>Filter by Role:</label>
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
          >
            <option value="">All Roles</option>
            <option value="ROLE_ADMIN">Admin</option>
            <option value="ROLE_Customer">Customer</option>
          </select>
        </div>

        <button 
          onClick={() => {
            setRoleFilter('');
            setSearchTerm('');
          }}
          className="btn-secondary"
        >
          Clear Filters
        </button>
      </div>

      {/* Users Table */}
      <div className="admin-table-container">
        <table className="admin-table">
          <thead>
            <tr>
              <th>User ID</th>
              <th>Name</th>
              <th>Email</th>
              <th>Role</th>
              <th>Registration Date</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.map((u) => (
              <tr key={u.id || u.userId}>
                <td>#{u.id || u.userId}</td>
                <td>
                  <div className="user-info">
                    <div className="user-name">
                      {u.firstName} {u.lastName}
                    </div>
                  </div>
                </td>
                <td>{u.email}</td>
                <td>
                  <span 
                    className="role-badge"
                    style={{ backgroundColor: getRoleBadgeColor(u.role) }}
                  >
                    {u.role}
                  </span>                </td>
                <td>{formatDate(u.createdAt || u.registrationDate || u.registerDate)}</td>
                <td>
                  <span 
                    className={`status-indicator ${u.isActive !== false ? 'active' : 'inactive'}`}
                  >
                    {u.isActive !== false ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td>
                  <div className="user-actions">                    <select
                      value={u.role}
                      onChange={(e) => handleRoleUpdate(u.id || u.userId, e.target.value)}
                      className="role-select"
                      disabled={u.id === user?.id} // Prevent admin from changing their own role
                    >
                      <option value="ROLE_Customer">Customer</option>
                      <option value="ROLE_ADMIN">Admin</option>
                    </select>
                    
                    <button 
                      className={`btn-toggle ${u.isActive !== false ? 'deactivate' : 'activate'}`}
                      onClick={() => handleUserToggle(u.id || u.userId, u.isActive !== false)}
                      disabled={u.id === user?.id} // Prevent admin from deactivating themselves
                    >
                      {u.isActive !== false ? 'Deactivate' : 'Activate'}
                    </button>
                    
                    <button 
                      className="btn-view"
                      onClick={() => router.push(`/admin/users/${u.id || u.userId}`)}
                    >
                      View Details
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {filteredUsers.length === 0 && (
          <div className="no-users">
            <h3>No users found</h3>
            <p>No users match your current filters.</p>
          </div>
        )}      </div>
      </div>
    </div>
  );
};

export default AdminUsers;
