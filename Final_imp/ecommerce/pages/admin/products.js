import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useStateContext } from '../../context/StateContext';
import axios from 'axios';
import Cookies from 'js-cookie';
import AdminNavbar from '../../components/AdminNavbar';

const AdminProducts = () => {
  const { user, isAuthenticated } = useStateContext();
  const router = useRouter();
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [formData, setFormData] = useState({
    productName: '',
    description: '',
    price: '',
    quantityInStock: '',
    categoryId: '',
    isAvailable: true
  });

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }

    if (user && user.role !== 'ROLE_ADMIN') {
      router.push('/');
      return;
    }

    fetchProducts();
    fetchCategories();
  }, [isAuthenticated, user, router]);
  // Setup API config
  const getApiConfig = () => {
    const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api';
    const token = Cookies.get('authToken');
    const headers = token ? { Authorization: `Bearer ${token}` } : {};
    return { baseURL: API_BASE_URL, headers };
  };

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const { baseURL, headers } = getApiConfig();
      const response = await axios.get(`${baseURL}/products`, { headers });
      setProducts(response.data.content || []);
    } catch (error) {
      console.error('Error fetching products:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const { baseURL, headers } = getApiConfig();
      const response = await axios.get(`${baseURL}/categories`, { headers });
      setCategories(response.data || []);
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const productData = {
        ...formData,
        price: parseFloat(formData.price),
        quantityInStock: parseInt(formData.quantityInStock),
        categoryId: parseInt(formData.categoryId)
      };      const { baseURL, headers } = getApiConfig();
      if (editingProduct) {
        await axios.put(`${baseURL}/products/${editingProduct.productId}`, productData, { headers });
      } else {
        await axios.post(`${baseURL}/products`, productData, { headers });
      }

      // Reset form and refresh products
      setFormData({
        productName: '',
        description: '',
        price: '',
        quantityInStock: '',
        categoryId: '',
        isAvailable: true
      });
      setShowAddForm(false);
      setEditingProduct(null);
      await fetchProducts();
    } catch (error) {
      console.error('Error saving product:', error);
      alert('Error saving product. Please try again.');
    }
  };

  const handleEdit = (product) => {
    setEditingProduct(product);
    setFormData({
      productName: product.productName,
      description: product.description,
      price: product.price.toString(),
      quantityInStock: product.quantityInStock.toString(),
      categoryId: product.categoryId.toString(),
      isAvailable: product.isAvailable
    });
    setShowAddForm(true);
  };
  const handleDelete = async (productId) => {
    if (confirm('Are you sure you want to delete this product?')) {
      try {
        const { baseURL, headers } = getApiConfig();
        await axios.delete(`${baseURL}/products/${productId}`, { headers });
        await fetchProducts();
      } catch (error) {
        console.error('Error deleting product:', error);
        alert('Error deleting product. Please try again.');
      }
    }
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };
  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Loading Products...</p>
      </div>
    );
  }

  if (!isAuthenticated || (user && user.role !== 'ROLE_ADMIN')) {
    return null;
  }

  return (
    <div className="admin-products">
      <AdminNavbar />
      <div className="admin-content-wrapper">
        <div className="admin-header">
        <h1>Product Management</h1>
        <button 
          className="btn-primary"
          onClick={() => {
            setShowAddForm(true);
            setEditingProduct(null);
            setFormData({
              productName: '',
              description: '',
              price: '',
              quantityInStock: '',
              categoryId: '',
              isAvailable: true
            });
          }}
        >
          Add New Product
        </button>
      </div>

      {showAddForm && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h2>{editingProduct ? 'Edit Product' : 'Add New Product'}</h2>
            <form onSubmit={handleSubmit} className="product-form">
              <div className="form-group">
                <label>Product Name</label>
                <input
                  type="text"
                  name="productName"
                  value={formData.productName}
                  onChange={handleInputChange}
                  required
                />
              </div>

              <div className="form-group">
                <label>Description</label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  rows="3"
                  required
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Price</label>
                  <input
                    type="number"
                    name="price"
                    value={formData.price}
                    onChange={handleInputChange}
                    step="0.01"
                    min="0"
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Quantity</label>
                  <input
                    type="number"
                    name="quantityInStock"
                    value={formData.quantityInStock}
                    onChange={handleInputChange}
                    min="0"
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Category</label>
                <select
                  name="categoryId"
                  value={formData.categoryId}
                  onChange={handleInputChange}
                  required
                >
                  <option value="">Select Category</option>
                  {categories.map(category => (
                    <option key={category.categoryId} value={category.categoryId}>
                      {category.categoryName}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    name="isAvailable"
                    checked={formData.isAvailable}
                    onChange={handleInputChange}
                  />
                  Available for Sale
                </label>
              </div>

              <div className="form-actions">
                <button type="button" onClick={() => setShowAddForm(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  {editingProduct ? 'Update Product' : 'Add Product'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}      <div className="admin-table-container">
        <table className="admin-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Name</th>
              <th>Category</th>
              <th>Price</th>
              <th>Stock</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {products.map(product => (
              <tr key={product.productId}>
                <td>{product.productId}</td>
                <td>{product.productName}</td>
                <td>{product.categoryName}</td>
                <td>${product.price}</td>
                <td>{product.quantityInStock}</td>
                <td>
                  <span className={`status-badge ${product.isAvailable ? 'status-available' : 'status-unavailable'}`}>
                    {product.isAvailable ? 'Available' : 'Unavailable'}
                  </span>
                </td>
                <td>
                  <button 
                    className="btn-edit"
                    onClick={() => handleEdit(product)}
                  >
                    Edit
                  </button>
                  <button 
                    className="btn-delete"
                    onClick={() => handleDelete(product.productId)}
                  >
                    Delete
                  </button>
                </td>              </tr>
            ))}
          </tbody>
        </table>
      </div>
      </div>
    </div>
  );
};

export default AdminProducts;
