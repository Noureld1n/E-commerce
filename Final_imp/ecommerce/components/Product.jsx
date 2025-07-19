import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { AiOutlineHeart, AiFillHeart } from 'react-icons/ai';
import { getImageUrl, api } from '../lib/client';
import { useStateContext } from '../context/StateContext';

const Product = ({ product, productNumber }) => {
  const { isAuthenticated, user } = useStateContext();
  const [isInWishlist, setIsInWishlist] = useState(false);
  const [wishlistLoading, setWishlistLoading] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);
  
  // Early return if product is not available
  if (!product) {
    return null;
  }
  
  // Handle both old and new product structure
  const productId = product.id || product.productId || product._id;
  const productName = product.name || product.productName || product.title;
  const productPrice = product.price;
  const productSlug = product.slug || productId;
  // Extract imageUrl from the images array object structure
  const productImage = product.images?.[0]?.imageUrl || product.image?.[0] || product.imageUrl;

  // Check if product is in wishlist when component mounts
  useEffect(() => {
    const checkWishlistStatus = async () => {
      if (!isAuthenticated || !productId) return;
      
      try {
        const response = await api.wishlist.get();
        const wishlistItems = response.data || [];
        const isInList = wishlistItems.some(item => 
          (item.product?.productId || item.product?.id) === productId ||
          item.productId === productId
        );
        setIsInWishlist(isInList);
      } catch (error) {
        console.error('Error checking wishlist status:', error);
      }
    };

    checkWishlistStatus();
  }, [isAuthenticated, productId]);

  const handleWishlistToggle = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!isAuthenticated) {
      alert('Please login to add items to wishlist');
      return;
    }

    setWishlistLoading(true);
    try {
      if (isInWishlist) {
        await api.wishlist.remove(productId);
        setIsInWishlist(false);
      } else {
        await api.wishlist.add(productId);
        setIsInWishlist(true);
      }
    } catch (error) {
      console.error('Error updating wishlist:', error);
      alert('Error updating wishlist');
    } finally {
      setWishlistLoading(false);
    }
  };

  return (
    <div>
      <Link href={`/product/${productSlug}`} passHref>
        <a data-product-number={productNumber}>
          <div className='product-card'>            {/* Display product number for voice control */}
            <div className="product-number-badge">
              {productNumber !== undefined ? productNumber : 'N/A'}
            </div>
            
            {/* Wishlist Button */}
            {isAuthenticated && (
              <button 
                className="wishlist-btn"
                onClick={handleWishlistToggle}
                disabled={wishlistLoading}
              >
                {isInWishlist ? <AiFillHeart /> : <AiOutlineHeart />}
              </button>
            )}{/* Image container with loading placeholder */}
            <div className="product-image-container">
              {!imageLoaded && !imageError && (
                <div className="image-placeholder">
                  <div className="placeholder-shimmer"></div>
                </div>
              )}
              <img 
                src={getImageUrl(productImage)} 
                width={250} 
                height={250} 
                className='product-image' 
                alt={productName}
                onLoad={() => setImageLoaded(true)}                onError={(e) => {
                  setImageError(true);
                  setImageLoaded(true);
                  e.target.src = '/assets/placeholder.svg';
                }}
                style={{
                  opacity: imageLoaded ? 1 : 0,
                  transition: 'opacity 0.3s ease'
                }}
              />
            </div>
            <p className='product-name'>{productName}</p>
            <p className='product-price'>${productPrice}</p>
          </div>
        </a>
      </Link>
    </div>
  );
};

export default Product;
