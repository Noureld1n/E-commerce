import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { useStateContext } from '../../context/StateContext';
import { api, getImageUrl } from '../../lib/client';
import styles from '../../styles/order-detail.module.css';

const OrderDetail = () => {
  const router = useRouter();
  const { id } = router.query;
  const { isAuthenticated, loading } = useStateContext();
  const [order, setOrder] = useState(null);
  const [orderLoading, setOrderLoading] = useState(true);
  const [error, setError] = useState(null);

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
      setError(null);
      const response = await api.orders.getById(id);
      setOrder(response.data);
    } catch (error) {
      console.error('Error loading order:', error);
      setError('Failed to load order details');
    } finally {
      setOrderLoading(false);
    }
  };
  const handleCancelOrder = async () => {
    try {
      setOrderLoading(true);
      await api.orders.cancel(order.orderId);
      
      // Update the local order status
      setOrder(prev => ({
        ...prev,
        orderStatus: 'Cancelled'
      }));
      
      // Order cancelled successfully - no alert needed
    } catch (error) {
      console.error('Error cancelling order:', error);
      // Failed to cancel order - no alert needed
    } finally {
      setOrderLoading(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'pending':
        return '#f39c12';
      case 'processing':
        return '#3498db';
      case 'shipped':
        return '#9b59b6';
      case 'delivered':
        return '#27ae60';
      case 'cancelled':
        return '#e74c3c';
      default:
        return '#95a5a6';
    }
  };
  const getStatusIcon = (status) => {
    switch (status?.toLowerCase()) {
      case 'pending':
        return '⏳';
      case 'processing':
        return '⚙️';
      case 'shipped':
        return '🚛';
      case 'delivered':
        return '✅';
      case 'cancelled':
        return '❌';
      default:
        return '📦';
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading || orderLoading) {
    return (
      <div className={styles.orderDetailContainer}>
        <div className={styles.loading}>Loading order details...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  if (error) {
    return (
      <div className={styles.orderDetailContainer}>
        <div className={styles.error}>
          <h2>Order Not Found</h2>
          <p>{error}</p>
          <Link href="/orders" className={styles.backToOrdersBtn}>
            Back to Orders
          </Link>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className={styles.orderDetailContainer}>
        <div className={styles.loading}>No order data available</div>
      </div>
    );
  }

  return (
    <div className={styles.orderDetailContainer}>
      <div className={styles.orderDetailHeader}>        <button 
          type="button" 
          className={styles.backButton}
          onClick={() => router.back()}
        >
          ← Back
        </button>
        <h1>Order Details</h1>
      </div>

      <div className={styles.orderDetailContent}>
        {/* Order Summary Card */}
        <div className={styles.orderSummaryCard}>
          <div className={styles.orderSummaryHeader}>
            <div className={styles.orderInfo}>
              <h2>Order #{order.orderId}</h2>
              <p className={styles.orderDate}>
                Placed on {formatDate(order.creationDate)}
              </p>
            </div>
            <div className={styles.orderStatus}>
              <span 
                className={styles.statusBadge}
                style={{ backgroundColor: getStatusColor(order.orderStatus) }}
              >
                {getStatusIcon(order.orderStatus)}
                {order.orderStatus}
              </span>
            </div>
          </div>

          <div className={styles.orderDetails}>
            <div className={styles.detailRow}>
              <span>Total Amount:</span>
              <strong>${order.totalPrice?.toFixed(2)}</strong>
            </div>
            <div className={styles.detailRow}>
              <span>Payment Status:</span>
              <span className={styles.paymentStatus}>{order.paymentStatus}</span>
            </div>
            {order.shipment && (
              <div className={styles.detailRow}>
                <span>Tracking Number:</span>
                <span className={styles.trackingNumber}>{order.shipment.trackingNumber}</span>
              </div>
            )}
          </div>
        </div>

        {/* Shipping Information */}
        {order.shippingAddress && (
          <div className={styles.addressCard}>
            <h3>Shipping Address</h3>
            <div className={styles.addressDetails}>
              <p>{order.shippingAddress.street}</p>
              <p>{order.shippingAddress.city}, {order.shippingAddress.state} {order.shippingAddress.zipcode}</p>
              <p className={styles.addressType}>{order.shippingAddress.addressType}</p>
            </div>
          </div>
        )}

        {/* Order Items */}
        <div className={styles.orderItemsCard}>
          <h3>Order Items</h3>
          <div className={styles.orderItemsList}>
            {order.orderItems && order.orderItems.map((item, index) => (
              <div key={index} className={styles.orderItem}>                <img 
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
                  className={styles.orderItemImage}
                  onError={(e) => {
                    e.target.src = '/assets/placeholder.svg';
                  }}
                />
                <div className={styles.orderItemDetails}>
                  <h4>{item.product?.name || item.productName}</h4>
                  <p className={styles.itemDescription}>
                    {item.product?.description || item.productDescription}
                  </p>
                  <div className={styles.itemInfo}>
                    <span>Quantity: {item.quantity}</span>
                    <span>Price: ${item.priceAtPurchase?.toFixed(2)}</span>
                    <span>Total: ${(item.quantity * item.priceAtPurchase)?.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Order Actions */}
        <div className={styles.orderActions}>          {order.orderStatus === 'Pending' && (
            <button 
              className={styles.cancelButton}
              onClick={handleCancelOrder}
              disabled={orderLoading}
            >
              {orderLoading ? 'Cancelling...' : 'Cancel Order'}
            </button>
          )}<button 
            onClick={() => router.push('/orders')} 
            className={styles.cancelButton}
            style={{ backgroundColor: '#3498db' }}
          >
            View All Orders
          </button>
        </div>
      </div>
    </div>
  );
};

export default OrderDetail;
