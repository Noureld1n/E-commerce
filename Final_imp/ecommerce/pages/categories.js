import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import { AiOutlineShoppingCart, AiOutlineLaptop, AiOutlineApple, AiOutlineHome } from 'react-icons/ai';
import { Product } from '../components';
import { api } from '../lib/client';
import styles from '../styles/categories-page.module.css';

const CategoriesPage = () => {
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [categoryProducts, setCategoryProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeView, setActiveView] = useState('categories'); // 'categories' or 'products'
  
  const categories = [
    {
      id: 1,
      name: 'Electronics',
      description: 'Latest technology, gadgets, smartphones, laptops, smart devices, and cutting-edge innovations',
      icon: <AiOutlineLaptop className={styles.categoryIcon} />,
      color: '#324d67',
      image: '/assets/categories/electronics.jpg'
    },
    {
      id: 2,
      name: 'Groceries',
      description: 'Fresh produce, organic foods, pantry essentials, dairy products, snacks, and beverages',
      icon: <AiOutlineApple className={styles.categoryIcon} />,
      color: '#4CAF50',
      image: '/assets/categories/groceries.jpg'
    },    {
      id: 3,
      name: 'Wearings',
      description: 'Trendy fashion, casual wear, formal attire, accessories, shoes, and seasonal collections',
      icon: <AiOutlineShoppingCart className={styles.categoryIcon} />,
      color: '#f02d34',
      image: '/assets/categories/clothes.jpg'
    }
  ];
  const handleCategoryClick = async (categoryId, categoryName) => {
    try {
      setLoading(true);
      setSelectedCategory({
        id: categoryId,
        name: categoryName
      });
      setActiveView('products');
      
      // Fetch products by category
      const response = await api.products.getByCategory(categoryId);
      console.log('Category products response:', response);
      
      if (response.data) {
        // Handle both array and paginated response formats
        const products = Array.isArray(response.data) 
          ? response.data 
          : response.data.content || [];
        setCategoryProducts(products);
      } else {
        setCategoryProducts([]);
      }
    } catch (error) {
      console.error('Error fetching category products:', error);
      setCategoryProducts([]);
    } finally {
      setLoading(false);
    }
  };
  
  const handleBackToCategories = () => {
    setActiveView('categories');
    setSelectedCategory(null);
  };
  return (
    <div className={styles.container}>
      <Head>
        <title>
          {selectedCategory 
            ? `${selectedCategory.name} | E-Commerce Store` 
            : 'Shop by Category | E-Commerce Store'}
        </title>
        <meta name="description" content="Browse all product categories in our online store" />
      </Head>

      {activeView === 'categories' ? (
        <>
          <div className={styles.header}>
            <h1>Shop by Category</h1>
            <p>Explore our wide range of products by category</p>
          </div>

          <div className={styles.categoriesGrid}>
            {categories.map((category) => (
              <div
                key={category.id}
                className={styles.categoryCard}
                style={{ '--category-color': category.color }}
                onClick={() => handleCategoryClick(category.id, category.name)}
              >
                <div className={styles.categoryContent}>
                  <div className={styles.iconWrapper}>
                    {category.icon}
                  </div>
                  <h2 className={styles.categoryName}>{category.name}</h2>
                  <p className={styles.categoryDescription}>{category.description}</p>
                  <div className={styles.viewButton}>
                    Browse Products
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      ) : (
        <div className={styles.productsView}>
          <div className={styles.productsHeader}>
            <button 
              className={styles.backButton}
              onClick={handleBackToCategories}
            >
              <AiOutlineHome /> Back to Categories
            </button>
            <h1>{selectedCategory?.name}</h1>
            <p>{categoryProducts.length} products found</p>
          </div>

          {loading ? (
            <div className={styles.loadingContainer}>
              <div className={styles.loadingSpinner}>Loading products...</div>
            </div>
          ) : (
            <div className={styles.productsGrid}>
              {categoryProducts.length > 0 ? (
                categoryProducts.map((product, index) => (
                  <Product 
                    key={product.id || product.productId} 
                    product={product}
                    productNumber={index + 1}
                  />
                ))
              ) : (
                <div className={styles.noProductsMessage}>
                  <p>No products found in this category.</p>
                  <button onClick={handleBackToCategories}>
                    Browse Other Categories
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>  );
};

export default CategoriesPage;
