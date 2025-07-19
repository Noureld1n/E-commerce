import React from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { useStateContext } from '../context/StateContext';

const AdminNavbar = () => {
  const router = useRouter();
  const currentPath = router.pathname;
  const { logout } = useStateContext();

  const isActive = (path) => {
    return currentPath === path ? 'active' : '';
  };
  
  const handleLogout = async () => {
    await logout();
    router.push('/login');
  };

  return (
    <div className="admin-navbar">
      <div className="admin-logo">
        <Link href="/admin">
          <a className="logo">
            <span className="logo-icon">📊</span>
            <span className="logo-text">Admin Panel</span>
          </a>
        </Link>
      </div>
      
      <nav className="admin-nav">
        <Link href="/admin">
          <a className={isActive('/admin')}>Dashboard</a>
        </Link>
        <Link href="/admin/products">
          <a className={isActive('/admin/products')}>Products</a>
        </Link>
        <Link href="/admin/categories">
          <a className={isActive('/admin/categories')}>Categories</a>
        </Link>
        <Link href="/admin/orders">
          <a className={isActive('/admin/orders')}>Orders</a>
        </Link>        <Link href="/admin/users">
          <a className={isActive('/admin/users')}>Users</a>
        </Link>
        <Link href="/admin/reviews">
          <a className={isActive('/admin/reviews')}>Reviews</a>
        </Link>
        <Link href="/admin/analytics">
          <a className={isActive('/admin/analytics')}>Analytics</a>
        </Link>
      </nav>
        <div className="admin-actions-menu">
        <button onClick={handleLogout} className="admin-logout-btn">
          Logout
        </button>
      </div>
    </div>
  );
};

export default AdminNavbar;
