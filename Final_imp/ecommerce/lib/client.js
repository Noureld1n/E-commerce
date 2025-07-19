import axios from 'axios';
import Cookies from 'js-cookie';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api';

// Create axios instance
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
apiClient.interceptors.request.use(
  (config) => {
    const token = Cookies.get('authToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      
      try {
        const refreshToken = Cookies.get('refreshToken');
        if (refreshToken) {
          const response = await axios.post(`${API_BASE_URL}/auth/refresh`, {
            refreshToken
          });
          
          const { token } = response.data;
          Cookies.set('authToken', token);
          
          originalRequest.headers.Authorization = `Bearer ${token}`;
          return apiClient(originalRequest);
        }
      } catch (refreshError) {
        Cookies.remove('authToken');
        Cookies.remove('refreshToken');
        Cookies.remove('user');
        window.location.href = '/login';
      }
    }
    
    return Promise.reject(error);
  }
);

// API functions
export const api = {
  // Authentication
  auth: {
    register: (userData) => apiClient.post('/auth/register', userData),
    login: (credentials) => apiClient.post('/auth/login', credentials),
    logout: () => apiClient.post('/auth/logout'),
    refresh: (refreshToken) => apiClient.post('/auth/refresh', { refreshToken }),
  },

  // Products
  products: {
    getAll: (params = {}) => apiClient.get('/products', { params }),
    getById: (id) => apiClient.get(`/products/${id}`),
    search: (params) => apiClient.get('/products/search', { params }),
    getByCategory: (categoryId, params = {}) => apiClient.get(`/products/category/${categoryId}`, { params }),
    create: (productData) => apiClient.post('/products', productData),
    update: (id, productData) => apiClient.put(`/products/${id}`, productData),
    delete: (id) => apiClient.delete(`/products/${id}`),
  },

  // Categories
  categories: {
    getAll: () => apiClient.get('/categories'),
    getById: (id) => apiClient.get(`/categories/${id}`),
    create: (categoryData) => apiClient.post('/categories', categoryData),
    update: (id, categoryData) => apiClient.put(`/categories/${id}`, categoryData),
    delete: (id) => apiClient.delete(`/categories/${id}`),
  },  // Cart
  cart: {
    get: () => apiClient.get('/cart'),
    add: (productId, quantity = 1) => apiClient.post('/cart/items', { productId, quantity }),
    update: (productId, quantity) => apiClient.put(`/cart/items/${productId}`, { productId, quantity }),
    remove: (productId) => apiClient.delete(`/cart/items/${productId}`),
    clear: () => apiClient.delete('/cart/clear'),
  },
  // Orders
  orders: {
    create: (orderData) => apiClient.post('/orders', orderData),
    getAll: (params = {}) => apiClient.get('/orders/my-orders', { params }), // Customer orders
    getAllAdmin: (params = {}) => apiClient.get('/orders', { params }), // Admin only
    getById: (id) => apiClient.get(`/orders/${id}`),
    updateStatus: (id, status) => apiClient.put(`/orders/${id}/status`, { status }),
    cancel: (id) => apiClient.put(`/orders/${id}/cancel`),
  },// Users
  users: {
    getProfile: () => apiClient.get('/users/profile'),
    updateProfile: (userData) => apiClient.put('/users/profile', userData),
    getCreditCards: () => apiClient.get('/users/credit-cards'),
    addCreditCard: (cardData) => apiClient.post('/users/credit-cards', cardData),
    updateCreditCard: (id, cardData) => apiClient.put(`/users/credit-cards/${id}`, cardData),
    deleteCreditCard: (id) => apiClient.delete(`/users/credit-cards/${id}`),
  },

  // Addresses
  addresses: {
    getAll: () => apiClient.get('/addresses'),
    getById: (id) => apiClient.get(`/addresses/${id}`),
    create: (addressData) => apiClient.post('/addresses', addressData),
    update: (id, addressData) => apiClient.put(`/addresses/${id}`, addressData),
    delete: (id) => apiClient.delete(`/addresses/${id}`),
    setDefault: (id) => apiClient.put(`/addresses/${id}/default`),
  },
  // Reviews
  reviews: {
    getByProduct: (productId) => apiClient.get(`/reviews/product/${productId}`),
    create: (reviewData) => apiClient.post('/reviews', reviewData),
    update: (id, reviewData) => apiClient.put(`/reviews/${id}`, reviewData),
    delete: (id) => apiClient.delete(`/reviews/${id}`),
    getAverageRating: (productId) => apiClient.get(`/reviews/product/${productId}/rating`),
    getRecommendationCount: (productId) => apiClient.get(`/reviews/product/${productId}/recommendations`),
  },
  // Wishlist
  wishlist: {
    get: () => apiClient.get('/wishlist'),
    add: (productId) => apiClient.post(`/wishlist/${productId}`),
    remove: (productId) => apiClient.delete(`/wishlist/${productId}`),
  },
};

// Helper function to get image URL from backend
export const getImageUrl = (imagePath) => {
  if (!imagePath) return '/assets/placeholder.svg';
  if (typeof imagePath === 'string' && imagePath.startsWith('http')) return imagePath;
  return `${API_BASE_URL.replace('/api', '')}/uploads/${imagePath}`;
};

export default api;