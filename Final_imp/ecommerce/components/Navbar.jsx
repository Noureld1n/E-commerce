import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { AiOutlineShopping, AiOutlineUser, AiOutlineDown } from 'react-icons/ai';
import { BiCategoryAlt } from 'react-icons/bi';
import Cart from './Cart'; // Direct import for Cart
import { SearchBar } from './SearchBar'; // Direct import for SearchBar
import { useStateContext } from '../context/StateContext';

const Navbar = () => {
  const { showCart, setShowCart, totalQuantities, user, isAuthenticated, logout } = useStateContext();  const [showUserMenu, setShowUserMenu] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);
  const [isAtTop, setIsAtTop] = useState(true);
  // Handle scroll behavior
  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      
      // Close user menu when scrolling
      if (showUserMenu) {
        setShowUserMenu(false);
      }
      
      // Check if at top of page
      setIsAtTop(currentScrollY < 10);
      
      // Show navbar when at top of page
      if (currentScrollY < 10) {
        setIsVisible(true);
      }
      // Hide navbar when scrolling down, show when scrolling up
      else if (currentScrollY > lastScrollY && currentScrollY > 100) {
        setIsVisible(false);
      } else if (currentScrollY < lastScrollY) {
        setIsVisible(true);
      }
      
      setLastScrollY(currentScrollY);
    };

    // Add scroll event listener
    window.addEventListener('scroll', handleScroll, { passive: true });
    
    // Cleanup
    return () => window.removeEventListener('scroll', handleScroll);
  }, [lastScrollY, showUserMenu]);const handleLogout = async () => {
    await logout();
    setShowUserMenu(false);
  };  return (
    <div className={`navbar-container ${isVisible ? 'navbar-visible' : 'navbar-hidden'} ${isAtTop ? 'at-top' : ''}`}>
      <div className='logo'>
        <Link href="/">
          <div className="logo-content">
            <Image 
              src="/icon/1000064780-removebg-preview.png" 
              alt="Store Logo" 
              width={50} 
              height={50} 
              className="logo-icon"
            />
          </div>
        </Link>
      </div>
        {/* Search Bar */}      <div style={{ display: 'flex', alignItems: 'center' }}>
        <div className='navbar-search'>
          <SearchBar placeholder="Search products..." />
        </div>        <Link href="/categories">
          <div className='categories-icon'>
            <BiCategoryAlt />
            <span className='categories-text'>Categories</span>
          </div>
        </Link>
      </div>
      
      <div className='navbar-actions'>
        {/* Authentication Section */}
        {isAuthenticated ? (
          <div className='user-menu-container'>
            <button 
              type='button' 
              className='user-menu-trigger'
              onClick={() => setShowUserMenu(!showUserMenu)}
            >
              <AiOutlineUser />
              <span className='user-name'>{user?.firstName || 'User'}</span>
              <AiOutlineDown />
            </button>
              {showUserMenu && (
              <div className='user-dropdown'>
                <Link href="/profile" onClick={() => setShowUserMenu(false)}>
                  <div className='dropdown-item'>Profile</div>
                </Link>
                <Link href="/orders" onClick={() => setShowUserMenu(false)}>
                  <div className='dropdown-item'>Orders</div>
                </Link>
                <Link href="/wishlist" onClick={() => setShowUserMenu(false)}>
                  <div className='dropdown-item'>Wishlist</div>
                </Link>
                {user?.role === 'ADMIN' && (
                  <>
                    <div className='dropdown-divider'></div>
                    <Link href="/admin" onClick={() => setShowUserMenu(false)}>
                      <div className='dropdown-item admin-item'>Admin Dashboard</div>
                    </Link>
                  </>
                )}
                <div className='dropdown-divider'></div>
                <button 
                  type='button' 
                  className='dropdown-item logout-btn'
                  onClick={handleLogout}
                >
                  Logout
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className='auth-links'>
            <Link href="/login" className='auth-link'>
              Login
            </Link>
            <Link href="/register" className='auth-link register-link'>
              Register
            </Link>
          </div>
        )}

        {/* Cart Icon */}
        <button type='button' className='cart-icon' onClick={() => setShowCart(true)}>
          <AiOutlineShopping />
          <span className='cart-item-qty'>{totalQuantities}</span>
        </button>
      </div>
      
      {showCart && <Cart />}
    </div>
  );
};

export default Navbar;
