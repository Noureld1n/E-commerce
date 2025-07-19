import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { useStateContext } from '../context/StateContext';
import { api, getImageUrl } from '../lib/client';
import { AiOutlineArrowLeft, AiOutlineEye, AiOutlineClose } from 'react-icons/ai';
import styles from '../styles/orders.module.css';

const Orders = () => {
  const router = useRouter();
  const { isAuthenticated, loading } = useStateContext();
  const [orders, setOrders] = useState([]);
  const [ordersLoading, setOrdersLoading] = useState(true);
  const [cancellingOrderId, setCancellingOrderId] = useState(null);
  useEffect(() => {
    let isMounted = true;

    const loadOrdersData = async () => {
      if (!loading && !isAuthenticated) {
        router.push('/login');
        return;
      }

      if (isAuthenticated && isMounted) {
        try {
          if (isMounted) setOrdersLoading(true);
          console.log('Loading orders...');
          const response = await api.orders.getAll();
          console.log('Raw response:', response);
          
          if (isMounted) {
            // Handle paginated response from Spring Boot
            const orderData = response.data?.content || response.data || [];
            console.log('Processed order data:', orderData);
            
            if (Array.isArray(orderData)) {
              setOrders(orderData);
            } else {
              console.error('Order data is not an array:', orderData);
              setOrders([]);
            }
          }
        } catch (error) {
          console.error('Error loading orders:', error);
          console.error('Error response:', error.response?.data);
          if (isMounted) {
            setOrders([]);
          }
        } finally {
          if (isMounted) {
            setOrdersLoading(false);
          }
        }
      }
    };

    loadOrdersData();

    return () => {
      isMounted = false;
    };  }, [isAuthenticated, loading, router]);

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
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const canCancelOrder = (orderStatus) => {
    return orderStatus?.toLowerCase() === 'pending' || orderStatus?.toLowerCase() === 'processing';
  };  const handleCancelOrder = async (orderId) => {
    try {
      setCancellingOrderId(orderId);
      await api.orders.cancel(orderId);
      
      // Update the order status in the local state
      setOrders(orders.map(order => 
        order.orderId === orderId 
          ? { ...order, orderStatus: 'Cancelled' }
          : order
      ));
      
      // Order cancelled successfully - no alert needed
    } catch (error) {
      console.error('Error cancelling order:', error);
      // Failed to cancel order - no alert needed
    } finally {
      setCancellingOrderId(null);
    }
  };
  if (loading || ordersLoading) {
    return (
      <div className={styles.ordersContainer}>
        <div className={styles.loading}>Loading...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className={styles.ordersContainer}>
      <div className={styles.ordersHeader}>
        <button 
          type="button" 
          className={styles.backButton}
          onClick={() => router.back()}
        >
          <AiOutlineArrowLeft />
          Back
        </button>
        <h1>Order History</h1>
      </div>

      <div className={styles.ordersContent}>
        {orders.length === 0 ? (
          <div className={styles.noOrders}>
            <h2>No orders found</h2>
            <p>You haven't placed any orders yet.</p>
            <Link href="/" className={styles.shopNowBtn}>
              Start Shopping
            </Link>
          </div>
        ) : (
          <div className={styles.ordersList}>            {orders.map((order) => (
              <div key={order.orderId} className={styles.orderCard}>
                <div className={styles.orderHeader}>
                  <div className={styles.orderInfo}>
                    <h3>Order #{order.orderId}</h3>
                    <p className={styles.orderDate}>
                      Placed on {formatDate(order.creationDate)}
                    </p>
                  </div>
                  <div className={styles.orderStatus}>
                    <span 
                      className={styles.statusBadge}
                      style={{ backgroundColor: getStatusColor(order.orderStatus) }}
                    >
                      {order.orderStatus}
                    </span>
                  </div>
                </div>

                <div className={styles.orderItems}>                  {order.orderItems && order.orderItems.slice(0, 3).map((item, index) => (
                    <div key={index} className={styles.orderItem}>                      <img 
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
                        <p>Quantity: {item.quantity}</p>
                        <p className={styles.itemPrice}>${item.priceAtPurchase?.toFixed(2)}</p>
                      </div>
                    </div>
                  ))}
                  {order.orderItems && order.orderItems.length > 3 && (
                    <div className={styles.moreItems}>
                      +{order.orderItems.length - 3} more items
                    </div>
                  )}
                </div>                <div className={styles.orderFooter}>
                  <div className={styles.orderTotal}>
                    <strong>Total: ${order.totalPrice?.toFixed(2)}</strong>
                  </div>                  <div className={styles.orderActions}>
                    <button
                      type="button"
                      className={styles.viewOrderBtn}
                      onClick={() => router.push(`/order/${order.orderId}`)}
                    >
                      <AiOutlineEye />
                      View Details
                    </button>
                    {canCancelOrder(order.orderStatus) && (
                      <button
                        type="button"
                        className={styles.cancelOrderBtn}
                        onClick={() => handleCancelOrder(order.orderId)}
                        disabled={cancellingOrderId === order.orderId}
                      >
                        <AiOutlineClose />
                        {cancellingOrderId === order.orderId ? 'Cancelling...' : 'Cancel Order'}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Orders;
