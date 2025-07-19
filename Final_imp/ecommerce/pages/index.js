import React, { useState, useEffect } from 'react';
import { Product, FooterBanner, HerroBanner, Categories } from '../components';
import { useStateContext } from '../context/StateContext';
import { api } from '../lib/client';

const Home = () => {
  const { products, loadProducts, loadCategories, voiceCommandCategory, setVoiceCommandCategory } = useStateContext();
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState(null);
  const [selectedCategoryName, setSelectedCategoryName] = useState('All Products');
  const [randomizedProducts, setRandomizedProducts] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        // Load products and categories
        await loadProducts();
        const categoriesData = await loadCategories();
        setCategories(categoriesData);
        
        // Debug: Check product structure
        console.log('Products loaded:', products);
        if (products.length > 0) {
          console.log('First product structure:', products[0]);
          console.log('First product images:', products[0]?.images);
        }
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Check for category in URL query params
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const categoryParam = urlParams.get('category');
    
    if (categoryParam) {
      const categoryId = parseInt(categoryParam);
      // Find the category name
      const categoryName = categoryId === 1 ? 'Electronics' : 
                          categoryId === 2 ? 'Groceries' : 
                          categoryId === 3 ? 'Wearings' : 'All Products';
      
      handleCategoryClick(categoryId, categoryName);
    }
  }, []);

  // Update filtered products when products change
  useEffect(() => {
    if (!selectedCategoryId) {
      setFilteredProducts(products);
    }
    
    // Create randomized products list when products are loaded
    if (products && products.length > 0) {
      createRandomizedProductsList(products);
    }
  }, [products, selectedCategoryId]);
  
  // Effect to handle voice command category changes
  useEffect(() => {
    if (voiceCommandCategory) {
      console.log('[Home] Voice command category received:', voiceCommandCategory);
      let categoryIdToSelect = null;
      let categoryNameToSelect = 'All Products';

      if (voiceCommandCategory === 'Electronics') {
        categoryIdToSelect = 1;
        categoryNameToSelect = 'Electronics';
      } else if (voiceCommandCategory === 'Groceries') {
        categoryIdToSelect = 2;
        categoryNameToSelect = 'Groceries';
      } else if (voiceCommandCategory === 'Wearings') {
        categoryIdToSelect = 3;
        categoryNameToSelect = 'Wearings';
      } else if (voiceCommandCategory === 'All Products') {
        // Handled by setting categoryIdToSelect to null
      }

      handleCategoryClick(categoryIdToSelect, categoryNameToSelect);
      // Reset voiceCommandCategory in context after processing
      setVoiceCommandCategory(null); 
    }
  }, [voiceCommandCategory, setVoiceCommandCategory]);
  
  // Function to create a randomized list of products from each category
  const createRandomizedProductsList = async (allProducts) => {
    try {
      // Fetch products from each category (1: Electronics, 2: Groceries, 3: Wearings)
      const categoryIds = [1, 2, 3];
      const randomProducts = [];
      
      for (const categoryId of categoryIds) {
        try {
          const response = await api.products.getByCategory(categoryId);
          
          if (response.data) {
            // Handle both array and paginated response formats
            const categoryProducts = Array.isArray(response.data) 
              ? response.data 
              : response.data.content || [];
              
            // Get random products from this category (up to 4 per category to get 10-12 total)
            if (categoryProducts.length > 0) {
              const shuffled = [...categoryProducts].sort(() => 0.5 - Math.random());
              const selected = shuffled.slice(0, Math.min(4, categoryProducts.length));
              randomProducts.push(...selected);
            }
          }
        } catch (error) {
          console.error(`Error fetching category ${categoryId} products:`, error);
        }
      }
      
      // If we couldn't get products from categories, use random products from the full list
      if (randomProducts.length === 0 && allProducts.length > 0) {
        const shuffled = [...allProducts].sort(() => 0.5 - Math.random());
        randomProducts.push(...shuffled.slice(0, Math.min(10, allProducts.length)));
      }
      
      // Shuffle the final list to mix products from different categories
      // Ensure we get exactly 10 products or all available if less than 10
      let limitedRandomProducts = randomProducts.sort(() => 0.5 - Math.random());
      if (limitedRandomProducts.length > 10) {
        limitedRandomProducts = limitedRandomProducts.slice(0, 10);
      } else if (limitedRandomProducts.length < 10 && allProducts.length >= 10) {
        // If we have fewer than 10 products, add more from allProducts to reach 10
        const additionalNeeded = 10 - limitedRandomProducts.length;
        const additionalProducts = [...allProducts]
          .filter(p => !limitedRandomProducts.some(rp => rp.id === p.id)) // Avoid duplicates
          .sort(() => 0.5 - Math.random())
          .slice(0, additionalNeeded);
        limitedRandomProducts = [...limitedRandomProducts, ...additionalProducts];
      }
      setRandomizedProducts(limitedRandomProducts);
    } catch (error) {
      console.error('Error creating randomized products list:', error);
      setRandomizedProducts([]);
    }
  };

  const handleCategoryClick = async (categoryId, categoryName, products = null) => {
    try {
      setLoading(true);
      setSelectedCategoryId(categoryId);
      setSelectedCategoryName(categoryName);

      if (categoryId === null) {
        // Show randomized products when "Show All Products" is clicked (exactly 10)
        let productsToShow = randomizedProducts.length > 0 ? randomizedProducts : (products || []);
        
        // Ensure we have exactly 10 products
        if (productsToShow.length > 10) {
          productsToShow = productsToShow.slice(0, 10);
        } else if (productsToShow.length < 10 && products && products.length >= 10) {
          // If we have fewer than 10 randomized products, add more from all products to reach exactly 10
          const additionalNeeded = 10 - productsToShow.length;
          const additionalProducts = [...products]
            .filter(p => !productsToShow.some(rp => rp.id === p.id)) // Avoid duplicates
            .sort(() => 0.5 - Math.random())
            .slice(0, additionalNeeded);
          productsToShow = [...productsToShow, ...additionalProducts];
        }
        
        setFilteredProducts(productsToShow);
      } else if (products) {
        // Use products passed from the Categories component
        setFilteredProducts(products);
      } else {
        // Fetch products by category if not provided
        const response = await api.products.getByCategory(categoryId);
        console.log('Category products response:', response);
        
        if (response.data) {
          // Handle both array and paginated response formats
          const categoryProducts = Array.isArray(response.data) 
            ? response.data 
            : response.data.content || [];
          setFilteredProducts(categoryProducts);
        } else {
          setFilteredProducts([]);
        }
      }
    } catch (error) {
      console.error('Error fetching category products:', error);
      setFilteredProducts([]);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <>
        <HerroBanner />
        <Categories 
          onCategoryClick={handleCategoryClick}
          selectedCategoryId={selectedCategoryId}
          isLoading={loading}
        />
        <div className='products-heading'>
          <h2>{selectedCategoryName}</h2>
          <p>Discover our amazing collection</p>
        </div>
        <div className="loading-container">
          <div className="loading-spinner">Loading products...</div>
        </div>
      </>
    );
  }

  // Decide which products to display based on selection
  let displayProducts;
  if (selectedCategoryId) {
    // For a selected category, show all products in that category
    displayProducts = filteredProducts;
  } else {
    // For "Show All Products", ensure exactly 10 products
    if (randomizedProducts.length === 10) {
      // If we already have exactly 10 randomized products, use them
      displayProducts = randomizedProducts;
    } else if (randomizedProducts.length > 10) {
      // If we have more than 10, limit to exactly 10
      displayProducts = randomizedProducts.slice(0, 10);
    } else if (products.length >= 10) {
      // If randomized products are fewer than 10 but we have enough products, get exactly 10
      const additionalNeeded = 10 - randomizedProducts.length;
      const additionalProducts = [...products]
        .filter(p => !randomizedProducts.some(rp => rp.id === p.id))
        .sort(() => 0.5 - Math.random())
        .slice(0, additionalNeeded);
      displayProducts = [...randomizedProducts, ...additionalProducts];
    } else {
      // If we have fewer than 10 products total, show all available
      displayProducts = products;
    }
  }

  return (
    <>
      <HerroBanner />
      <Categories 
        onCategoryClick={handleCategoryClick}
        selectedCategoryId={selectedCategoryId}
        displayProducts={displayProducts}
        isLoading={loading}
      />
      <div className='products-heading'>
        <h2>{selectedCategoryName}</h2>
        <p>
          {selectedCategoryId 
            ? `${displayProducts.length} products found in ${selectedCategoryName}` 
            : 'Showing 10 featured products from our collection'}
        </p>
      </div>
      <div className='products-container'>
        {displayProducts?.length > 0 ? (
          displayProducts.map((product, index) => (
            <Product 
              key={product.id || index} 
              product={product} 
              productNumber={index + 1}
            />
          ))
        ) : (
          <div className="no-products-message">
            <p>No products found in this category.</p>
            <button 
              className="back-to-all-btn"
              onClick={() => handleCategoryClick(null, 'All Products')}
            >
              View All Products
            </button>
          </div>
        )}
      </div>
    </>
  );
};


export default Home;
