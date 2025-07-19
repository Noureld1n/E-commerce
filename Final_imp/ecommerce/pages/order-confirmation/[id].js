import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { useStateContext } from '../../context/StateContext';
import { api, getImageUrl } from '../../lib/client';
import { AiOutlineCheck, AiOutlineShoppingCart } from 'react-icons/ai';
import styles from '../../styles/order-confirmation.module.css';

const OrderConfirmation = () => {
  const router = useRouter();
  const { id } = router.query;
  const { isAuthenticated, loading } = useStateContext();
  const [order, setOrder] = useState(null);
  const [orderLoading, setOrderLoading] = useState(true);

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.push('/login');
      return;
    }

    if (isAuthenticated && id) {
      loadOrder();
    }
  }, [isAuthenticated, loading, id, router]);

  const loadOrder = async () => {
    try {
      setOrderLoading(true);
      const response = await api.orders.getById(id);
      setOrder(response.data);
    } catch (error) {
      console.error('Error loading order:', error);
    } finally {
      setOrderLoading(false);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  if (loading || orderLoading) {
    return (
      <div className={styles.confirmationContainer}>
        <div className={styles.loading}>Loading...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  if (!order) {
    return (
      <div className={styles.confirmationContainer}>
        <div className={styles.error}>
          <h2>Order not found</h2>
          <Link href="/orders">View all orders</Link>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.confirmationContainer}>
      <div className={styles.confirmationCard}>
        <div className={styles.successIcon}>
          <AiOutlineCheck />
        </div>
        
        <h1>Order Confirmed!</h1>
        <p className={styles.thankYouMessage}>
          Thank you for your order. We'll send you a confirmation email shortly.
        </p>

        <div className={styles.orderSummary}>
          <h2>Order Details</h2>
          <div className={styles.orderInfo}>
            <div className={styles.infoRow}>
              <span>Order Number:</span>
              <strong>#{order.orderId}</strong>
            </div>
            <div className={styles.infoRow}>
              <span>Order Date:</span>
              <span>{formatDate(order.creationDate)}</span>
            </div>
            <div className={styles.infoRow}>
              <span>Total Amount:</span>
              <strong>${order.totalPrice?.toFixed(2)}</strong>
            </div>
            <div className={styles.infoRow}>
              <span>Payment Status:</span>
              <span className={styles.paymentStatus}>{order.paymentStatus}</span>
            </div>
          </div>
        </div>

        {order.orderItems && (
          <div className={styles.itemsPreview}>
            <h3>Items Ordered</h3>
            <div className={styles.itemsList}>
              {order.orderItems.slice(0, 3).map((item, index) => (
                <div key={index} className={styles.item}>                  <img 
                    src={getImageUrl(
                      item.imageUrl || 
                      item.images?.[0]?.imageUrl || 
                      item.images?.[0] || 
                      item.image?.[0] ||
                      item.product?.images?.[0]?.imageUrl || 
                      item.product?.images?.[0] || 
                      item.productImage ||
                      item.product?.imageUrl
                    )} 
                    alt={item.product?.name || item.productName || item.name}
                    className={styles.itemImage}
                    onError={(e) => {
                      e.target.src = '/assets/placeholder.svg';
                    }}
                  />
                  <div className={styles.itemDetails}>
                    <h4>{item.product?.name}</h4>
                    <p>Qty: {item.quantity}</p>
                  </div>
                </div>
              ))}
              {order.orderItems.length > 3 && (
                <div className={styles.moreItems}>
                  +{order.orderItems.length - 3} more items
                </div>
              )}
            </div>
          </div>
        )}

        <div className={styles.actions}>
          <Link href={`/order/${order.orderId}`} className={styles.viewOrderBtn}>
            View Order Details
          </Link>
          <Link href="/" className={styles.continueShoppingBtn}>
            <AiOutlineShoppingCart />
            Continue Shopping
          </Link>
        </div>
      </div>
    </div>
  );
};

export default OrderConfirmation;
