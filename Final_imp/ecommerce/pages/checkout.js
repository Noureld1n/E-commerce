import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { toast } from 'react-hot-toast';
import { useStateContext } from '../context/StateContext';
import { api, getImageUrl } from '../lib/client';
import { AiOutlineArrowLeft } from 'react-icons/ai';
import styles from '../styles/checkout.module.css';

const Checkout = () => {
  const router = useRouter();
  const { 
    cartItems, 
    totalPrice, 
    totalQuantities, 
    isAuthenticated, 
    user,
    loadCart 
  } = useStateContext();

  const [loading, setLoading] = useState(false);
  const [addresses, setAddresses] = useState([]);
  const [selectedAddress, setSelectedAddress] = useState(null);
  const [showAddressForm, setShowAddressForm] = useState(false);  const [newAddress, setNewAddress] = useState({
    street: '',
    city: '',
    state: '',
    zipcode: '',
    addressType: 'HOME',
    isDefault: false
  });

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }

    if (cartItems.length === 0) {
      router.push('/');
      return;
    }

    loadAddresses();
  }, [isAuthenticated, cartItems]);
  const loadAddresses = async () => {
    try {
      const response = await api.addresses.getAll();
      setAddresses(response.data || []);
      if (response.data && response.data.length > 0) {
        setSelectedAddress(response.data[0]);
      }
    } catch (error) {
      console.error('Error loading addresses:', error);
    }
  };  const handleAddAddress = async (e) => {
    e.preventDefault();
    
    try {
      await api.addresses.create(newAddress);
      setNewAddress({
        street: '',
        city: '',
        state: '',
        zipcode: '',
        addressType: 'HOME',
        isDefault: false
      });
      setShowAddressForm(false);
      await loadAddresses();
      toast.success('Address added successfully');
    } catch (error) {
      console.error('Error adding address:', error);
      toast.error('Failed to add address');
    }
  };  const handlePlaceOrder = async () => {
    if (!selectedAddress) {
      toast.error('Please select a delivery address');
      return;
    }

    setLoading(true);
    
    try {
      // Make sure to sanitize data and avoid any characters that might cause issues
      const sanitizedCartItems = cartItems.map(item => ({
        productId: Number(item.id), // Ensure this is a number
        quantity: Number(item.quantity), // Ensure this is a number
        // Exclude price to let backend calculate it from product data
      }));
      
      const orderData = {
        addressId: Number(selectedAddress.addressId), // Ensure this is a number
        items: sanitizedCartItems
      };      const response = await api.orders.create(orderData);
      
      toast.success('Order placed successfully!');
      await loadCart(); // Clear cart
      router.push(`/order/${response.data.orderId}`);
    } catch (error) {
      console.error('Error placing order:', error);
      toast.error('Failed to place order');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles['checkout-container']}>
      <div className={styles['checkout-header']}>
        <button 
          type="button" 
          className={styles['back-button']}
          onClick={() => router.back()}
        >
          <AiOutlineArrowLeft />
          Back
        </button>
        <h1>Checkout</h1>
      </div>

      <div className={styles['checkout-content']}>
        <div className={styles['checkout-main']}>
          <div className={styles['checkout-section']}>
            <h2>Delivery Address</h2>
            
            {addresses.length > 0 ? (
              <div className={styles['address-list']}>
                {addresses.map((address) => (
                  <div 
                    key={address.addressId}
                    className={`${styles['address-item']} ${selectedAddress?.addressId === address.addressId ? styles['selected'] : ''}`}
                    onClick={() => setSelectedAddress(address)}
                  >
                    <input
                      type="radio"
                      name="address"
                      checked={selectedAddress?.addressId === address.addressId}
                      onChange={() => setSelectedAddress(address)}
                    />
                    <div className={styles['address-details']}>
                      <p>{address.street}</p>
                      <p>{address.city}, {address.state} {address.zipcode}</p>
                      <p>{address.addressType}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className={styles['no-addresses']}>
                <p>No addresses found. Please add a delivery address.</p>
              </div>
            )}

            <button
              type="button"
              className={styles['add-address-btn']}
              onClick={() => setShowAddressForm(!showAddressForm)}
            >
              {showAddressForm ? 'Cancel' : 'Add New Address'}
            </button>

            {showAddressForm && (
              <form onSubmit={handleAddAddress} className={styles['address-form']}>
                <div className={styles['form-group']}>
                  <input
                    type="text"
                    placeholder="Street Address"
                    value={newAddress.street}
                    onChange={(e) => setNewAddress({...newAddress, street: e.target.value})}
                    required
                  />
                </div>
                <div className={styles['form-row']}>
                  <input
                    type="text"
                    placeholder="City"
                    value={newAddress.city}
                    onChange={(e) => setNewAddress({...newAddress, city: e.target.value})}
                    required
                  />
                  <input
                    type="text"
                    placeholder="State"
                    value={newAddress.state}
                    onChange={(e) => setNewAddress({...newAddress, state: e.target.value})}
                    required
                  />
                </div>
                <div className={styles['form-row']}>
                  <input
                    type="text"
                    placeholder="ZIP Code"
                    value={newAddress.zipcode}
                    onChange={(e) => setNewAddress({...newAddress, zipcode: e.target.value})}
                  />
                  <select
                    value={newAddress.addressType}
                    onChange={(e) => setNewAddress({...newAddress, addressType: e.target.value})}
                    required
                  >
                    <option value="HOME">Home</option>
                    <option value="WORK">Work</option>
                  </select>
                </div>
                <div className={styles['form-group']}>
                  <label>
                    <input
                      type="checkbox"
                      checked={newAddress.isDefault}
                      onChange={(e) => setNewAddress({...newAddress, isDefault: e.target.checked})}
                    />
                    Set as default address
                  </label>
                </div>
                <button type="submit" className={styles['save-address-btn']}>
                  Save Address
                </button>
              </form>
            )}
          </div>
        </div>

        <div className={styles['checkout-sidebar']}>
          <div className={styles['order-summary']}>
            <h3>Order Summary</h3>
            <div className={styles['order-items']}>
              {cartItems.map((item) => (
                <div key={item.id || item.productId} className={styles['order-item']}>
                  <img 
                    src={getImageUrl(item.imageUrl || item.images?.[0]?.imageUrl || item.images?.[0] || item.image?.[0])} 
                    alt={item.name || item.productName}
                    className={styles['order-item-image']}
                  />
                  <div className={styles['order-item-details']}>
                    <h4>{item.name || item.productName}</h4>
                    <p>Quantity: {item.quantity}</p>
                    <p className={styles['order-item-price']}>${(item.price * item.quantity).toFixed(2)}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className={styles['order-totals']}>
              <div className={styles['total-line']}>
                <span>Items ({totalQuantities}):</span>
                <span>${totalPrice.toFixed(2)}</span>
              </div>
              <div className={styles['total-line']}>
                <span>Shipping:</span>
                <span>Free</span>
              </div>
              <div className={`${styles['total-line']} ${styles['total-final']}`}>
                <strong>
                  <span>Total:</span>
                  <span>${totalPrice.toFixed(2)}</span>
                </strong>
              </div>
            </div>

            <button
              type="button"
              className={styles['place-order-btn']}
              onClick={handlePlaceOrder}
              disabled={loading || !selectedAddress}
            >
              {loading ? 'Placing Order...' : 'Place Order'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Checkout;
