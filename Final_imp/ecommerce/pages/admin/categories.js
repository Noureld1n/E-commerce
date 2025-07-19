import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useStateContext } from '../../context/StateContext';
import axios from 'axios';
import Cookies from 'js-cookie';
import AdminNavbar from '../../components/AdminNavbar';

const AdminCategories = () => {
  const { user, isAuthenticated } = useStateContext();
  const router = useRouter();
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [formData, setFormData] = useState({
    categoryName: ''
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

    fetchCategories();
  }, [isAuthenticated, user, router]);
  const fetchCategories = async () => {
    try {
      setLoading(true);
      const { baseURL, headers } = getApiConfig();
      const response = await axios.get(`${baseURL}/categories`, { headers });
      
      // Debug: Log the first category to see its structure
      if (response.data && response.data.length > 0) {
        console.log('First category data:', JSON.stringify(response.data[0], null, 2));
      }
      
      setCategories(response.data || []);
    } catch (error) {
      console.error('Error fetching categories:', error);
    } finally {
      setLoading(false);
    }
  };
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const { baseURL, headers } = getApiConfig();
      if (editingCategory) {
        await axios.put(`${baseURL}/categories/${editingCategory.categoryId}`, formData, { headers });
      } else {
        await axios.post(`${baseURL}/categories`, formData, { headers });
      }

      // Reset form and refresh categories
      setFormData({ categoryName: '' });
      setShowAddForm(false);
      setEditingCategory(null);
      await fetchCategories();
      alert(editingCategory ? 'Category updated successfully' : 'Category created successfully');
    } catch (error) {
      console.error('Error saving category:', error);
      alert('Error saving category. Please try again.');
    }
  };

  const handleEdit = (category) => {
    setEditingCategory(category);
    setFormData({
      categoryName: category.categoryName
    });
    setShowAddForm(true);
  };
  const handleDelete = async (categoryId) => {
    if (confirm('Are you sure you want to delete this category? This action cannot be undone.')) {
      try {
        const { baseURL, headers } = getApiConfig();
        await axios.delete(`${baseURL}/categories/${categoryId}`, { headers });
        await fetchCategories();
        alert('Category deleted successfully');
      } catch (error) {
        console.error('Error deleting category:', error);
        alert('Error deleting category. Make sure no products are assigned to this category.');
      }
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };
  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Loading Categories...</p>
      </div>
    );
  }

  if (!isAuthenticated || (user && user.role !== 'ROLE_ADMIN')) {
    return null;
  }

  return (
    <div className="admin-categories">
      <AdminNavbar />
      <div className="admin-content-wrapper">
        <div className="admin-header">
        <h1>Category Management</h1>
        <button 
          className="btn-primary"
          onClick={() => {
            setShowAddForm(true);
            setEditingCategory(null);
            setFormData({ categoryName: '' });
          }}
        >
          Add New Category
        </button>
      </div>

      {/* Add/Edit Form */}
      {showAddForm && (        <div className="modal-overlay">
          <div className="modal-content">
            <div className="form-header">
              <h2>{editingCategory ? 'Edit Category' : 'Add New Category'}</h2>
              <button 
                className="close-btn"
                onClick={() => setShowAddForm(false)}
              >
                ×
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Category Name</label>
                <input
                  type="text"
                  name="categoryName"
                  value={formData.categoryName}
                  onChange={handleInputChange}
                  required
                  placeholder="Enter category name"
                />
              </div>

              <div className="form-actions">
                <button type="button" onClick={() => setShowAddForm(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  {editingCategory ? 'Update Category' : 'Create Category'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Categories Grid */}
      <div className="categories-grid">
        {categories.map((category) => (
          <div key={category.categoryId} className="category-card">            <div className="category-info">
              <h3>{category.categoryName}</h3>
              <p className="category-stats">
                {category.productCount || 0} products
              </p>
            </div>
            
            <div className="category-actions">
              <button 
                className="btn-edit"
                onClick={() => handleEdit(category)}
              >
                Edit
              </button>
              <button 
                className="btn-delete"
                onClick={() => handleDelete(category.categoryId)}
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>

      {categories.length === 0 && (
        <div className="no-categories">
          <h3>No categories found</h3>
          <p>Start by creating your first product category.</p>
          <button 
            className="btn-primary"
            onClick={() => {
              setShowAddForm(true);
              setEditingCategory(null);
              setFormData({ categoryName: '' });
            }}
          >
            Create First Category
          </button>
        </div>
      )}

      {/* Category Statistics */}      <div className="category-stats-section">
        <h2>Category Statistics</h2>
        <div className="stats-grid">
          <div className="stat-card">
            <p className="stat-label">Total Categories</p>
            <h3 className="stat-value">{categories.length}</h3>
          </div>          
          <div className="stat-card">
            <p className="stat-label">Total Products</p>
            <h3 className="stat-value">{categories.reduce((sum, cat) => sum + (cat.productCount || 0), 0)}</h3>
          </div>
          <div className="stat-card">
            <p className="stat-label">Categories with Products</p>
            <h3 className="stat-value">{categories.filter(cat => (cat.productCount || 0) > 0).length}</h3>
          </div>
          <div className="stat-card">
            <p className="stat-label">Empty Categories</p>
            <h3 className="stat-value">{categories.filter(cat => (cat.productCount || 0) === 0).length}</h3>
          </div></div>
      </div>
      </div>
    </div>
  );
};

export default AdminCategories;
