import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useStateContext } from '../context/StateContext';
import { api } from '../lib/client';
import { Product } from '../components';
import styles from '../styles/wishlist.module.css';
import toast from 'react-hot-toast';

const Wishlist = () => {
  const { user, isAuthenticated, loadCart } = useStateContext();
  const router = useRouter();
  const [wishlistItems, setWishlistItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }

    fetchWishlist();
  }, [isAuthenticated, router]);  const fetchWishlist = async () => {
    try {
      setLoading(true);
      const response = await api.wishlist.get();
      const wishlistData = response.data || [];
      
      // Transform wishlist response to match Product component expectations
      const transformedItems = wishlistData.map(item => ({
        wishlistId: item.listId,
        product: {
          productId: item.productId,
          id: item.productId, // For compatibility
          productName: item.productName,
          name: item.productName, // For compatibility
          price: item.productPrice,
          imageUrl: item.imageUrl,
          images: item.imageUrl ? [{ imageUrl: item.imageUrl }] : [],
          slug: item.productId // Use productId as slug for now
        },
        addedDate: item.addedDate
      }));
      
      setWishlistItems(transformedItems);
    } catch (error) {
      console.error('Error fetching wishlist:', error);
    } finally {
      setLoading(false);
    }
  };  const removeFromWishlist = async (productId) => {
    try {
      await api.wishlist.remove(productId);
      await fetchWishlist(); // Refresh the wishlist
      toast.success('Item removed from wishlist');
    } catch (error) {
      console.error('Error removing from wishlist:', error);
      toast.error('Error removing item from wishlist');
    }
  };const addToCart = async (product, showAlert = true) => {
    try {
      const productId = product.productId || product.id;
      await api.cart.add(productId, 1);
      if (showAlert) {
        toast.success('Product added to cart!');
      }
      return true;
    } catch (error) {
      console.error('Error adding to cart:', error);
      if (showAlert) {
        toast.error('Error adding product to cart');
      }
      return false;
    }
  };
  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.loadingSpinner}>Loading your wishlist...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className={styles.wishlistPage}>
      <div className={styles.wishlistHeader}>
        <h1>My Wishlist</h1>
        <p>{wishlistItems.length} item{wishlistItems.length !== 1 ? 's' : ''} saved</p>
      </div>
      
      {wishlistItems.length === 0 ? (
        <div className={styles.emptyWishlist}>
          <div className={styles.emptyIcon}>💝</div>
          <h2>Your wishlist is empty</h2>
          <p>Save items you love to your wishlist to buy them later</p>
          <button 
            className={styles.btnPrimary}
            onClick={() => router.push('/')}
          >
            Start Shopping
          </button>
        </div>
      ) : (
        <>          <div className={styles.wishlistActions}>
            <button 
              className={styles.btnSecondary}
              onClick={async () => {
                try {
                  // Add all items sequentially
                  for (const item of wishlistItems) {
                    await addToCart(item.product, false); // Pass false to not show individual alerts
                  }
                  
                  // Refresh cart data from backend after all items are added
                  await loadCart();
                  
                  // Show success message
                  toast.success('All items added to cart!');
                } catch (error) {
                  console.error('Error adding all items to cart:', error);
                  toast.error('Failed to add all items to cart');
                }
              }}
            >
              Add All to Cart
            </button>
          </div>

          <div className={styles.wishlistGrid}>
            {wishlistItems.map((item, index) => (
              <div key={item.wishlistId} className={styles.wishlistItem}>
                <div className={styles.productWrapper} data-product-number={index + 1}>
                  <Product 
                    product={item.product} 
                    productNumber={index + 1}
                  />
                </div>                <div className={styles.wishlistItemActions}>
                  <button 
                    className={styles.addToCartBtn}
                    onClick={async () => {
                      if (await addToCart(item.product)) {
                        // Refresh cart if item was added successfully
                        await loadCart();
                      }
                    }}
                  >
                    Add to Cart
                  </button>
                  <button 
                    className={styles.btnRemove}
                    onClick={() => removeFromWishlist(item.product.productId)}
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default Wishlist;
