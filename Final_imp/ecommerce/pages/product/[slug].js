import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/router';
import { Product, Reviews } from '../../components';
import { api, getImageUrl } from '../../lib/client';
import { AiOutlineMinus, AiOutlinePlus, AiOutlineStar, AiFillStar, AiOutlineLeft, AiOutlineRight, AiOutlineHeart, AiFillHeart } from 'react-icons/ai';
import { useStateContext } from '../../context/StateContext';
import toast from 'react-hot-toast';
import styles from '../../styles/product-detail.module.css';

const ProductDetails = () => {
  const router = useRouter();
  const { slug } = router.query;
  const [product, setProduct] = useState(null);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [index, setIndex] = useState(0);
  const [currentSlide, setCurrentSlide] = useState(0);  const [ratingData, setRatingData] = useState({
    averageRating: 0,
    recommendationCount: 0,
    totalReviews: 0
  });
  const [isInWishlist, setIsInWishlist] = useState(false);
  const [wishlistLoading, setWishlistLoading] = useState(false);
  
  const { decQty, incQty, qty, onAdd, setShowCart, isAuthenticated } = useStateContext();// Load product data when slug changes
  useEffect(() => {
    if (!slug) return;
    
    const loadProductData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        console.log('Loading product with slug:', slug);
        
        let foundProduct = null;
        
        // First, try to get product by ID if slug is numeric
        if (!isNaN(slug)) {
          try {
            console.log('Trying to get product by ID:', slug);
            const productResponse = await api.products.getById(slug);
            foundProduct = productResponse.data;
            console.log('Found product by ID:', foundProduct);
          } catch (idError) {
            console.error('Product not found by ID:', idError);
          }
        }
        
        // If not found by ID, try to find by name in all products
        if (!foundProduct) {
          try {
            console.log('Trying to get all products to find by name...');
            const productsResponse = await api.products.getAll();
            const allProducts = productsResponse.data.content || productsResponse.data;
            console.log('All products:', allProducts);
            
            // Find product by slug (could be name slug or product name)
            foundProduct = allProducts.find(p => 
              p.productName?.toLowerCase().replace(/\s+/g, '-') === slug ||
              p.name?.toLowerCase().replace(/\s+/g, '-') === slug ||
              p.productId?.toString() === slug ||
              p.id?.toString() === slug
            );
            
            console.log('Found product by name search:', foundProduct);
          } catch (searchError) {
            console.error('Error searching products:', searchError);
          }
        }
        
        if (!foundProduct) {
          console.error('No product found for slug:', slug);
          setError('Product not found');
          return;
        }        setProduct(foundProduct);
        
        // Load rating data for the product
        await loadRatingData(foundProduct.productId || foundProduct.id);
        
        // Get other products for recommendations
        try {
          const productsResponse = await api.products.getAll();
          const allProducts = productsResponse.data.content || productsResponse.data;
          const otherProducts = allProducts.filter(p => 
            (p.productId || p.id) !== (foundProduct.productId || foundProduct.id)
          ).slice(0, 10);
          setProducts(otherProducts);
        } catch (productsError) {
          console.error('Error loading other products:', productsError);
          setProducts([]);        }
        
        // Load reviews for this product - removed duplicate loading since Reviews component handles this
        
      } catch (error) {
        console.error('Error loading product:', error);
        setError('Error loading product');
      } finally {
        setLoading(false);
      }
    };
      loadProductData();  }, [slug]);  

  // Get responsive items per slide based on window width  
  const [itemsPerSlide, setItemsPerSlide] = useState(4);

  const loadRatingData = async (productId) => {
    try {
      // Load average rating and recommendation count in parallel
      const [ratingResponse, recommendationResponse, reviewsResponse] = await Promise.all([
        api.reviews.getAverageRating(productId).catch(() => ({ data: { averageRating: 0 } })),
        api.reviews.getRecommendationCount(productId).catch(() => ({ data: { recommendationCount: 0 } })),
        api.reviews.getByProduct(productId).catch(() => ({ data: { content: [] } }))
      ]);

      const reviewsData = reviewsResponse.data?.content || reviewsResponse.data || [];
      
      setRatingData({
        averageRating: ratingResponse.data.averageRating || 0,
        recommendationCount: recommendationResponse.data.recommendationCount || 0,
        totalReviews: reviewsData.length
      });
    } catch (error) {
      console.error('Error loading rating data:', error);
      setRatingData({
        averageRating: 0,
        recommendationCount: 0,
        totalReviews: 0
      });
    }
  };  const handleBuyNow = () => {
    if (!inStock) {
      toast.error('This product is out of stock');
      return;
    }
    onAdd(product, qty);
    setShowCart(true);
  };
  
  // Check if product is in wishlist when product loads
  useEffect(() => {
    const checkWishlistStatus = async () => {
      if (!isAuthenticated || !product) return;
      
      const productId = product.productId || product.id;
      if (!productId) return;
      
      try {
        const response = await api.wishlist.get();
        const wishlistItems = response.data || [];
        const isInList = wishlistItems.some(item => 
          (item.product?.productId || item.product?.id || item.productId) === productId
        );
        setIsInWishlist(isInList);
      } catch (error) {
        console.error('Error checking wishlist status:', error);
      }
    };

    checkWishlistStatus();
  }, [isAuthenticated, product]);

  const handleWishlistToggle = async () => {
    if (!isAuthenticated) {
      toast.error('Please login to add items to wishlist');
      return;
    }

    if (!product) return;
    const productId = product.productId || product.id;
    
    setWishlistLoading(true);
    try {
      if (isInWishlist) {
        await api.wishlist.remove(productId);
        setIsInWishlist(false);
        toast.success('Removed from wishlist');
      } else {
        await api.wishlist.add(productId);
        setIsInWishlist(true);
        toast.success('Added to wishlist');
      }
    } catch (error) {
      console.error('Error updating wishlist:', error);
      toast.error('Error updating wishlist');
    } finally {
      setWishlistLoading(false);
    }
  };
  
  // Calculate total slides based on products length and items per slide
  const totalSlides = useMemo(() => {
    return Math.max(1, Math.ceil(products.length / itemsPerSlide));
  }, [products.length, itemsPerSlide]);
  
  // Auto-advance slideshow
  useEffect(() => {
    if (products.length <= itemsPerSlide) return;
    
    const interval = setInterval(() => {
      setCurrentSlide((prevSlide) => 
        prevSlide === totalSlides - 1 ? 0 : prevSlide + 1
      );
    }, 5000); // Change slide every 5 seconds
    
    return () => clearInterval(interval);
  }, [products.length, totalSlides, itemsPerSlide]);
  
  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      if (width <= 600) {
        setItemsPerSlide(1);
      } else if (width <= 800) {
        setItemsPerSlide(2);
      } else if (width <= 1200) {
        setItemsPerSlide(3);
      } else {
        setItemsPerSlide(4);
      }
    };
    
    // Set initial value
    handleResize();
    
    // Add event listener
    window.addEventListener('resize', handleResize);
    
    // Clean up
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  const nextSlide = () => {
    setCurrentSlide((prevSlide) => 
      prevSlide === totalSlides - 1 ? 0 : prevSlide + 1
    );
  };
  
  const prevSlide = () => {
    setCurrentSlide((prevSlide) => 
      prevSlide === 0 ? totalSlides - 1 : prevSlide - 1
    );
  };
  
  // Slideshow keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'ArrowLeft') {
        prevSlide();
      } else if (e.key === 'ArrowRight') {
        nextSlide();
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const renderStars = (rating, totalReviews = 0) => {
    // If there are reviews but the rating is 0, we'll still show stars with a different style
    const hasReviews = totalReviews > 0;
    const displayRating = (rating === 0 && hasReviews) ? 0 : rating;
    
    return Array.from({ length: 5 }, (_, i) => {
      const filled = i < Math.floor(displayRating);
      const halfFilled = i === Math.floor(displayRating) && (displayRating % 1) >= 0.5;
      // Special class when there are reviews but 0 rating
      const reviewsButZeroRating = (rating === 0 && hasReviews);
      
      return (
        <span 
          key={i} 
          className={`star ${filled ? 'filled' : halfFilled ? 'half-filled' : reviewsButZeroRating ? 'has-reviews' : ''}`}
          style={{ 
            fontSize: '1.2rem'
          }}
        >
          ★
        </span>
      );
    });
  };
  if (loading) {
    return (
      <div className="product-detail-container">
        <div className="product-detail-image-container">Loading...</div>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="product-detail-container">
        <div className="product-detail-image-container">Product not found</div>
      </div>
    );
  }  const { images, productName, name, description, price, quantityInStock } = product;
  const productImages = images || [];
  const displayName = productName || name;
  const inStock = quantityInStock > 0;return (
    <div>
      <div className="product-detail-container">
        <div className="product-detail-image-container">
          <div className="image-container">            <img 
              src={productImages.length > 0 ? getImageUrl(productImages[index]?.imageUrl || productImages[index]) : '/assets/placeholder.png'} 
              className="product-detail-image" 
              alt={displayName}
            />
          </div>
          <div className="small-images-container">            {productImages?.map((item, i) => (
              <img 
                key={i}
                src={getImageUrl(item?.imageUrl || item)}
                className={i === index ? 'small-image selected-image' : 'small-image'}
                onMouseEnter={() => setIndex(i)}
                alt={`${displayName} view ${i + 1}`}
              />
            ))}
          </div>        </div><div className="product-detail-desc">
          <div className={styles.productHeader}>
            <h1>{displayName}</h1>
            {isAuthenticated && (
              <button
                type='button'
                className={styles.productDetailWishlistBtn}
                onClick={handleWishlistToggle}
                disabled={wishlistLoading}
                aria-label={isInWishlist ? 'Remove from wishlist' : 'Add to wishlist'}
              >
                {isInWishlist ? <AiFillHeart /> : <AiOutlineHeart />}
              </button>
            )}
          </div>
          <h4>Details: </h4>
          <p>{description}</p>
            {/* Product Rating Section */}
          <div className="product-rating-section">
            <div className="rating-display">              <div className="stars-container">
                {renderStars(ratingData.averageRating, ratingData.totalReviews)}
                <span className="rating-number">
                  {ratingData.totalReviews > 0 ? 
                    (ratingData.averageRating > 0 ? ratingData.averageRating.toFixed(1) : '0.0') : 
                    'No ratings yet'}
                </span>
              </div>
              {ratingData.totalReviews > 0 && (
                <div className="rating-details">
                  <span className="review-count">
                    ({ratingData.totalReviews} review{ratingData.totalReviews !== 1 ? 's' : ''})
                  </span>
                  {ratingData.recommendationCount > 0 && (
                    <span className="recommendation-count">
                      • {Math.round((ratingData.recommendationCount / ratingData.totalReviews) * 100)}% recommend this product
                    </span>
                  )}
                </div>
              )}            </div>          </div>
          
          <div className={styles.priceStockContainer}>
            <p className="price">${price}</p>
            {quantityInStock !== undefined && (
              <span className={styles.quantityInStock}>
                {inStock ? `${quantityInStock} items available` : 'Currently unavailable'}
              </span>
            )}
          </div>
          
          <div className="quantity">
            <h3>Quantity:</h3>
            <p className="quantity-desc">
              <span className="minus" onClick={decQty}><AiOutlineMinus /></span>
              <span className="num">{qty}</span>
              <span className="plus" onClick={incQty}><AiOutlinePlus /></span>
            </p>
          </div>
          <div className='buttons'>
            <button 
              type='button' 
              className='add-to-cart'
              onClick={() => onAdd(product, qty)}
              disabled={!inStock}
            >
              Add to Cart
            </button>            <button 
              type='button' 
              className='buy-now'
              onClick={handleBuyNow}
              disabled={!inStock}
            >
              Buy Now
            </button>
          </div>
        </div>
      </div>      {/* Product Reviews Section */}<div className="reviews-container">
        <Reviews productId={product.productId || product.id} />
      </div>      <div className='maylike-products-wrapper'>
        <h2>You may also like</h2>
        <div className='product-slideshow'>
          {products.length > itemsPerSlide && (
            <button className='slideshow-nav prev-button' onClick={prevSlide}>
              <AiOutlineLeft />
            </button>
          )}
          
          <div className='slideshow-container'>
            <div 
              className='slideshow-track' 
              style={{ transform: `translateX(-${currentSlide * 100}%)` }}
            >
              {products.length > 0 ? (
                products.map((item, index) => (
                  <div className="slideshow-item" key={item.id || item.productId || index}>
                    <Product 
                      product={item} 
                      productNumber={index + 1}
                    />
                  </div>
                ))
              ) : (
                <div className="no-recommendations">
                  <p>No product recommendations available</p>
                </div>
              )}
            </div>
          </div>
          
          {products.length > itemsPerSlide && (
            <button className='slideshow-nav next-button' onClick={nextSlide}>
              <AiOutlineRight />
            </button>
          )}
        </div>
        
        {/* Slide indicators */}
        {totalSlides > 1 && (
          <div className="slideshow-indicators">
            {Array.from({ length: totalSlides }, (_, i) => (
              <button 
                key={i}
                className={`indicator ${currentSlide === i ? 'active' : ''}`}
                onClick={() => setCurrentSlide(i)}
                aria-label={`Go to slide ${i + 1}`}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ProductDetails;