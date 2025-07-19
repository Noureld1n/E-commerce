import React, { useRef } from 'react';
import { AiOutlineMinus, AiOutlinePlus, AiOutlineLeft, AiOutlineShopping } from 'react-icons/ai';
import { TiDeleteOutline } from 'react-icons/ti';
import Link from 'next/link';
import { useRouter } from 'next/router';
import toast from 'react-hot-toast';
import { useStateContext } from '../context/StateContext';
import { getImageUrl } from '../lib/client';




const Cart = () => {
  const cartRef = useRef();
  const router = useRouter();
  const { totalPrice, totalQuantities, cartItems, setShowCart, toggleCartItemQuanitity, onRemove, isAuthenticated } = useStateContext();

  const handleCheckout = async () => {
    if (!isAuthenticated) {
      toast.error('Please login to proceed with checkout');
      router.push('/login');
      return;
    }

    if (cartItems.length === 0) {
      toast.error('Your cart is empty');
      return;
    }

    // Navigate to checkout page (to be created)
    router.push('/checkout');
    setShowCart(false);
  };
  


  return (
    <div className="cart-wrapper" ref={cartRef}>
      <div className="cart-container">
        <button
        type="button"
        className="cart-heading"
        onClick={() => setShowCart(false)}>
          <AiOutlineLeft />
          <span className="heading">Your Cart</span>
          <span className="cart-num-items">({totalQuantities} items)</span>
        </button>

        {cartItems.length < 1 && (
          <div className="empty-cart">
            <AiOutlineShopping size={150} />
            <h3>Your shopping bag is empty</h3>
            <Link href="/">
              <button
                type="button"
                onClick={() => setShowCart(false)}
                className="btn"
              >
                Continue Shopping
              </button>
            </Link>
          </div>
        )}        <div className="product-container">
          {cartItems.length >= 1 && cartItems.map((item, index) => (
            <div className="product" key={item.id || item._id || item.productId} data-cart-item={index + 1}>
              <img 
                src={getImageUrl(item.imageUrl || item.images?.[0]?.imageUrl || item.images?.[0] || item.image?.[0])} 
                className="cart-product-image" 
                alt={item.name || item.productName}
              />
              <div className="item-desc">
                <div className="flex top">
                  <h5>{item.name || item.productName}</h5>
                  <h4>${item.price}</h4>
                </div>
                <div className="flex bottom">
                  <div>
                    <p className="quantity-desc">
                      <span className="minus" onClick={() => toggleCartItemQuanitity(item.id || item._id || item.productId, 'dec')}>
                        <AiOutlineMinus />
                      </span>
                      <span className="num">{item.quantity}</span>
                      <span className="plus" onClick={() => toggleCartItemQuanitity(item.id || item._id || item.productId, 'inc')}>
                        <AiOutlinePlus />
                      </span>
                    </p>
                  </div>
                  <button
                    type="button"
                    className="remove-item"
                    onClick={() => onRemove(item)}
                  >
                    <TiDeleteOutline />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
        {cartItems.length >= 1 && (
          <div className="cart-bottom">
            <div className="total">
              <h3>Subtotal:</h3>
              <h3>${totalPrice}</h3>
            </div>            <div className="btn-container">
              <button type="button" className="btn checkout-btn" onClick={handleCheckout}>
                {isAuthenticated ? 'Proceed to Checkout' : 'Login to Checkout'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default Cart
