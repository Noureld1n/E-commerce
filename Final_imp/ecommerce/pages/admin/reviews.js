import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useStateContext } from '../../context/StateContext';
import axios from 'axios';
import Cookies from 'js-cookie';
import AdminNavbar from '../../components/AdminNavbar';

const AdminReviews = () => {
  const { user, isAuthenticated } = useStateContext();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [reviews, setReviews] = useState([]);
  const [filteredReviews, setFilteredReviews] = useState([]);
  const [selectedReview, setSelectedReview] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [filters, setFilters] = useState({
    rating: '',
    recommended: '',
    dateRange: 'all',
    productName: '',
    customerName: ''
  });
  const [pagination, setPagination] = useState({
    page: 0,
    size: 10,
    totalElements: 0,
    totalPages: 0
  });
  const [sortBy, setSortBy] = useState('reviewDate');
  const [sortDir, setSortDir] = useState('desc');

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

    fetchReviews();
  }, [isAuthenticated, user, router, pagination.page, sortBy, sortDir]);

  useEffect(() => {
    applyFilters();
  }, [reviews, filters]);

  const fetchReviews = async () => {
    try {
      setLoading(true);
      const { baseURL, headers } = getApiConfig();

      // Fetch all reviews (we'll handle pagination on frontend for better filtering)
      const response = await axios.get(`${baseURL}/reviews/all`, {
        headers,
        params: {
          page: 0,
          size: 1000, // Get all reviews for better filtering
          sortBy,
          sortDir
        }
      });

      let reviewsData = [];
      if (response.data.content) {
        reviewsData = response.data.content;
        setPagination(prev => ({
          ...prev,
          totalElements: response.data.totalElements,
          totalPages: response.data.totalPages
        }));
      } else if (Array.isArray(response.data)) {
        reviewsData = response.data;
      }

      setReviews(reviewsData);
    } catch (error) {
      console.error('Error fetching reviews:', error);
      // If the all endpoint doesn't exist, try to get reviews from individual products
      try {
        await fetchReviewsFromProducts();
      } catch (fallbackError) {
        console.error('Error fetching reviews from products:', fallbackError);
        setReviews([]);
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchReviewsFromProducts = async () => {
    const { baseURL, headers } = getApiConfig();
    
    // First get all products
    const productsResponse = await axios.get(`${baseURL}/products`, { headers });
    let products = [];
    
    if (productsResponse.data.content) {
      products = productsResponse.data.content;
    } else if (Array.isArray(productsResponse.data)) {
      products = productsResponse.data;
    }

    // Then get reviews for each product
    const allReviews = [];
    for (const product of products) {
      try {
        const reviewsResponse = await axios.get(`${baseURL}/reviews/product/${product.productId}`, {
          headers,
          params: { page: 0, size: 100 }
        });
        
        const productReviews = reviewsResponse.data.content || reviewsResponse.data || [];
        allReviews.push(...productReviews);
      } catch (error) {
        console.error(`Error fetching reviews for product ${product.productId}:`, error);
      }
    }

    setReviews(allReviews);
  };

  const applyFilters = () => {
    let filtered = [...reviews];

    // Filter by rating
    if (filters.rating) {
      filtered = filtered.filter(review => review.rating === parseInt(filters.rating));
    }

    // Filter by recommendation
    if (filters.recommended !== '') {
      const isRecommended = filters.recommended === 'true';
      filtered = filtered.filter(review => review.recommended === isRecommended);
    }

    // Filter by date range
    if (filters.dateRange !== 'all') {
      const now = new Date();
      let dateThreshold;
      
      switch (filters.dateRange) {
        case 'today':
          dateThreshold = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          break;
        case 'week':
          dateThreshold = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case 'month':
          dateThreshold = new Date(now.getFullYear(), now.getMonth(), 1);
          break;
        case 'year':
          dateThreshold = new Date(now.getFullYear(), 0, 1);
          break;
        default:
          dateThreshold = null;
      }

      if (dateThreshold) {
        filtered = filtered.filter(review => new Date(review.reviewDate) >= dateThreshold);
      }
    }

    // Filter by product name
    if (filters.productName) {
      filtered = filtered.filter(review => 
        review.productName && review.productName.toLowerCase().includes(filters.productName.toLowerCase())
      );
    }

    // Filter by customer name
    if (filters.customerName) {
      filtered = filtered.filter(review => 
        review.customerName && review.customerName.toLowerCase().includes(filters.customerName.toLowerCase())
      );
    }

    setFilteredReviews(filtered);
  };

  const handleDeleteReview = async (reviewId) => {
    if (!window.confirm('Are you sure you want to delete this review?')) {
      return;
    }

    try {
      const { baseURL, headers } = getApiConfig();
      await axios.delete(`${baseURL}/reviews/${reviewId}`, { headers });
      
      // Remove from state
      setReviews(prev => prev.filter(review => review.reviewId !== reviewId));
      setShowModal(false);
      setSelectedReview(null);
    } catch (error) {
      console.error('Error deleting review:', error);
      alert('Error deleting review. Please try again.');
    }
  };

  const handleViewReview = (review) => {
    setSelectedReview(review);
    setShowModal(true);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const renderStars = (rating) => {
    return Array.from({ length: 5 }, (_, i) => (
      <span key={i} className={`star ${i < rating ? 'filled' : ''}`}>
        ★
      </span>
    ));
  };

  const getReviewStats = () => {
    const total = reviews.length;
    const avgRating = total > 0 ? (reviews.reduce((sum, r) => sum + r.rating, 0) / total).toFixed(1) : 0;
    const recommended = reviews.filter(r => r.recommended).length;
    const recentCount = reviews.filter(r => {
      const reviewDate = new Date(r.reviewDate);
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      return reviewDate >= weekAgo;
    }).length;

    return { total, avgRating, recommended, recentCount };
  };

  const stats = getReviewStats();

  if (loading) {
    return (
      <div className="admin-reviews">
        <AdminNavbar />
        <div className="admin-content-wrapper">
          <div className="loading-container">
            <div className="loading-spinner"></div>
            <p>Loading Reviews...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || (user && user.role !== 'ROLE_ADMIN')) {
    return null;
  }

  return (
    <div className="admin-reviews">
      <AdminNavbar />
      <div className="admin-content-wrapper">
        <div className="admin-header">
          <h1>Manage Reviews</h1>
          <p>View and moderate customer product reviews</p>
        </div>

        {/* Review Statistics */}
        <div className="admin-stats">
          <div className="stat-card">
            <div className="stat-icon">📝</div>
            <div className="stat-info">
              <h3>{stats.total}</h3>
              <p>Total Reviews</p>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">⭐</div>
            <div className="stat-info">
              <h3>{stats.avgRating}</h3>
              <p>Average Rating</p>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">👍</div>
            <div className="stat-info">
              <h3>{stats.recommended}</h3>
              <p>Recommended</p>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">🆕</div>
            <div className="stat-info">
              <h3>{stats.recentCount}</h3>
              <p>This Week</p>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="filters-section">
          <div className="filter-group">
            <label>Rating:</label>
            <select
              value={filters.rating}
              onChange={(e) => setFilters({...filters, rating: e.target.value})}
            >
              <option value="">All Ratings</option>
              <option value="5">5 Stars</option>
              <option value="4">4 Stars</option>
              <option value="3">3 Stars</option>
              <option value="2">2 Stars</option>
              <option value="1">1 Star</option>
            </select>
          </div>

          <div className="filter-group">
            <label>Recommendation:</label>
            <select
              value={filters.recommended}
              onChange={(e) => setFilters({...filters, recommended: e.target.value})}
            >
              <option value="">All</option>
              <option value="true">Recommended</option>
              <option value="false">Not Recommended</option>
            </select>
          </div>

          <div className="filter-group">
            <label>Date:</label>
            <select
              value={filters.dateRange}
              onChange={(e) => setFilters({...filters, dateRange: e.target.value})}
            >
              <option value="all">All Time</option>
              <option value="today">Today</option>
              <option value="week">This Week</option>
              <option value="month">This Month</option>
              <option value="year">This Year</option>
            </select>
          </div>

          <div className="filter-group">
            <label>Product:</label>
            <input
              type="text"
              placeholder="Search by product name..."
              value={filters.productName}
              onChange={(e) => setFilters({...filters, productName: e.target.value})}
            />
          </div>

          <div className="filter-group">
            <label>Customer:</label>
            <input
              type="text"
              placeholder="Search by customer name..."
              value={filters.customerName}
              onChange={(e) => setFilters({...filters, customerName: e.target.value})}
            />
          </div>

          <div className="filter-group">
            <label>Sort by:</label>
            <select
              value={`${sortBy}-${sortDir}`}
              onChange={(e) => {
                const [newSortBy, newSortDir] = e.target.value.split('-');
                setSortBy(newSortBy);
                setSortDir(newSortDir);
              }}
            >
              <option value="reviewDate-desc">Newest First</option>
              <option value="reviewDate-asc">Oldest First</option>
              <option value="rating-desc">Highest Rating</option>
              <option value="rating-asc">Lowest Rating</option>
              <option value="productName-asc">Product A-Z</option>
              <option value="customerName-asc">Customer A-Z</option>
            </select>
          </div>
        </div>

        {/* Reviews Table */}
        <div className="admin-table-container">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Product</th>
                <th>Customer</th>
                <th>Rating</th>
                <th>Review Title</th>
                <th>Date</th>
                <th>Recommended</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredReviews.length === 0 ? (
                <tr>
                  <td colSpan="7" className="no-data">
                    {reviews.length === 0 ? 'No reviews found' : 'No reviews match your filters'}
                  </td>
                </tr>
              ) : (
                filteredReviews.map(review => (
                  <tr key={review.reviewId}>
                    <td>
                      <div className="product-info">
                        <span className="product-name">{review.productName || 'Unknown Product'}</span>
                        <span className="product-id">ID: {review.productId}</span>
                      </div>
                    </td>
                    <td>
                      <div className="customer-info">
                        <span className="customer-name">{review.customerName || 'Anonymous'}</span>
                        <span className="customer-id">ID: {review.customerId}</span>
                      </div>
                    </td>
                    <td>
                      <div className="rating-display">
                        <div className="stars">
                          {renderStars(review.rating)}
                        </div>
                        <span className="rating-number">{review.rating}/5</span>
                      </div>
                    </td>
                    <td>
                      <div className="review-title">
                        {review.title}
                      </div>
                    </td>
                    <td>
                      <span className="review-date">{formatDate(review.reviewDate)}</span>
                    </td>
                    <td>
                      <span className={`recommendation-badge ${review.recommended ? 'recommended' : 'not-recommended'}`}>
                        {review.recommended ? '👍 Yes' : '👎 No'}
                      </span>
                    </td>
                    <td>
                      <div className="action-buttons">
                        <button
                          className="btn-view"
                          onClick={() => handleViewReview(review)}
                        >
                          View
                        </button>
                        <button
                          className="btn-delete"
                          onClick={() => handleDeleteReview(review.reviewId)}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Review Details Modal */}
        {showModal && selectedReview && (
          <div className="modal-overlay" onClick={() => setShowModal(false)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h2>Review Details</h2>
                <button className="modal-close" onClick={() => setShowModal(false)}>×</button>
              </div>
              
              <div className="modal-body">
                <div className="review-details">
                  <div className="review-info-section">
                    <h3>Product Information</h3>
                    <p><strong>Product:</strong> {selectedReview.productName}</p>
                    <p><strong>Product ID:</strong> {selectedReview.productId}</p>
                  </div>

                  <div className="review-info-section">
                    <h3>Customer Information</h3>
                    <p><strong>Customer:</strong> {selectedReview.customerName}</p>
                    <p><strong>Customer ID:</strong> {selectedReview.customerId}</p>
                    <p><strong>Review Date:</strong> {formatDate(selectedReview.reviewDate)}</p>
                  </div>

                  <div className="review-info-section">
                    <h3>Review Content</h3>
                    <p><strong>Title:</strong> {selectedReview.title}</p>
                    <div className="rating-display">
                      <strong>Rating:</strong>
                      <div className="stars">
                        {renderStars(selectedReview.rating)}
                      </div>
                      <span className="rating-number">({selectedReview.rating}/5)</span>
                    </div>
                    <p><strong>Recommended:</strong> 
                      <span className={`recommendation-badge ${selectedReview.recommended ? 'recommended' : 'not-recommended'}`}>
                        {selectedReview.recommended ? '👍 Yes' : '👎 No'}
                      </span>
                    </p>
                    <div className="review-text">
                      <strong>Review Text:</strong>
                      <p>{selectedReview.reviewText}</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="modal-footer">
                <button className="btn-secondary" onClick={() => setShowModal(false)}>
                  Close
                </button>
                <button 
                  className="btn-delete" 
                  onClick={() => handleDeleteReview(selectedReview.reviewId)}
                >
                  Delete Review
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminReviews;
