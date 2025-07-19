import React, { useState, useEffect } from 'react';
import { AiOutlineShoppingCart, AiOutlineLaptop, AiOutlineApple, AiOutlineHome } from 'react-icons/ai';
import { Product } from './';
import { api } from '../lib/client';
import styles from '../styles/categories.module.css';

const Categories = ({ onCategoryClick, selectedCategoryId, displayProducts, isLoading }) => {
  const [loadingCategory, setLoadingCategory] = useState(false);
  const [categoryProducts, setCategoryProducts] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null);
  
  const categories = [    {
      id: 1,
      name: 'Electronics',
      description: 'Tech & Gadgets',
      icon: <AiOutlineLaptop />,
      color: '#324d67'
    },
    {
      id: 2,
      name: 'Groceries',
      description: 'Food & Beverages',
      icon: <AiOutlineApple />,
      color: '#4CAF50'
    },    {
      id: 3,
      name: 'Wearings',
      description: 'Fashion & Apparel',
      icon: <AiOutlineShoppingCart />,
      color: '#f02d34'
    }];

  // Function to handle category selection and fetch products
  const handleCategorySelect = async (categoryId, categoryName) => {
    try {
      setLoadingCategory(true);
      setSelectedCategory({
        id: categoryId,
        name: categoryName
      });
      
      if (categoryId === null) {
        // Show all products (handled by parent component)
        setCategoryProducts([]);
        onCategoryClick(null, 'All Products');
      } else {
        // Fetch products by category
        const response = await api.products.getByCategory(categoryId);
        console.log('Category products response:', response);
        
        if (response.data) {
          // Handle both array and paginated response formats
          const products = Array.isArray(response.data) 
            ? response.data 
            : response.data.content || [];
          setCategoryProducts(products);
          onCategoryClick(categoryId, categoryName, products);
        } else {
          setCategoryProducts([]);
          onCategoryClick(categoryId, categoryName, []);
        }
      }
    } catch (error) {
      console.error('Error fetching category products:', error);
      setCategoryProducts([]);
    } finally {
      setLoadingCategory(false);
    }
  };  // Use products from props if available, otherwise use local state
  // For "Show All Products", ensure exactly 10 products
  let productsToDisplay;
  if (selectedCategoryId) {
    // When a category is selected, show all products in that category
    productsToDisplay = displayProducts || categoryProducts;
  } else {
    // For "Show All Products", get exactly 10 products
    const availableProducts = displayProducts || categoryProducts;
    if (availableProducts.length === 10) {
      // If we already have exactly 10 products, use them
      productsToDisplay = availableProducts;
    } else if (availableProducts.length > 10) {
      // If we have more than 10, limit to exactly 10
      productsToDisplay = availableProducts.slice(0, 10);
    } else {
      // If we have fewer than 10, use all available
      productsToDisplay = availableProducts;
    }
  }
  const loading = isLoading || loadingCategory;

  return (
    <div className="categories-section">
      <div className="categories-header">
        <h2>Shop by Category</h2>
        <p>Browse our voice-enabled product categories</p>
      </div>
      <div className="categories-container">
        {categories.map((category) => (
          <div 
            key={category.id}
            className={`category-card ${selectedCategoryId === category.id ? 'selected' : ''}`}
            style={{ '--category-color': category.color }}
            onClick={() => handleCategorySelect(category.id, category.name)}
          >
            <div className="category-icon">
              {category.icon}
            </div>
            <div className="category-content">
              <h3 className="category-name">{category.name}</h3>
              <p className="category-description">{category.description}</p>
              <div className="category-voice-hint">
                Say "Show me {category.name.toLowerCase()}"
              </div>            </div>
            <div className="category-arrow">→</div>
          </div>
        ))}      </div>
      <div className={styles['category-filter-info']}>
        <button 
          className={styles['clear-filter-btn']}
          onClick={() => handleCategorySelect(null, 'All Products')}
        >
          <AiOutlineHome style={{ fontSize: '1.2rem' }} /> Show All Products
        </button>
      </div>
      
      {/* Products Display Section */}
      {selectedCategoryId && (
        <div className={styles['category-products-section']}>
          <div className={styles['category-products-header']}>
            <h3>{selectedCategory?.name || 'Category Products'}</h3>
            <p>
              {!loading && `${productsToDisplay.length} products found`}
            </p>
          </div>
          
          {loading ? (
            <div className={styles['loading-container']}>
              <div className={styles['loading-spinner']}>Loading products...</div>
            </div>
          ) : (
            <div className={styles['products-grid']}>
              {productsToDisplay.length > 0 ? (
                productsToDisplay.map((product, index) => (
                  <Product 
                    key={product.id || product.productId || index} 
                    product={product}
                    productNumber={index + 1}
                  />
                ))
              ) : (
                <div className={styles['no-products-message']}>
                  <p>No products found in this category.</p>
                  <button onClick={() => handleCategorySelect(null, 'All Products')}>
                    View All Products
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Categories;