import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { toast } from 'react-hot-toast';
import { useStateContext } from '../context/StateContext';
import { AiOutlineEye, AiOutlineEyeInvisible } from 'react-icons/ai';

const Login = () => {
  const router = useRouter();
  const { login, isAuthenticated, loading } = useStateContext();
  
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  // Redirect if already authenticated
  useEffect(() => {
    if (!loading && isAuthenticated) {      // Check if user is admin and redirect to admin dashboard
      const userData = JSON.parse(localStorage.getItem('user') || '{}');
      if (userData && userData.role === 'ROLE_ADMIN') {
        router.push('/admin');
      } else {
        router.push('/');
      }
    }
  }, [isAuthenticated, loading, router]);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.email || !formData.password) {
      toast.error('Please fill in all fields');
      return;
    }

    setIsLoading(true);
    
    try {
      const result = await login(formData);
      toast.success('Login successful!');
        // Check if user is an admin and redirect accordingly
      if (result.success && result.userData && result.userData.role === 'ROLE_ADMIN') {
        router.push('/admin');
      } else {
        router.push('/');
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Login failed');
    } finally {
      setIsLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="auth-container">
        <div className="auth-form">
          <div>Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-container">
      <div className="auth-form">
        <div className="auth-header">
          <h1>Sign In</h1>
          <p>Welcome back! Please sign in to your account.</p>
        </div>        <form onSubmit={handleSubmit} className="auth-form-content">
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="email">Email Address</label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                required
                className="form-input"
                placeholder="Enter your email"
              />
            </div>

            <div className="form-group">
              <label htmlFor="password">Password</label>
              <div className="password-input-container">
                <input
                  type={showPassword ? 'text' : 'password'}
                  id="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  required
                  className="form-input"
                  placeholder="Enter your password"
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <AiOutlineEyeInvisible /> : <AiOutlineEye />}
                </button>
              </div>
            </div>          </div>

          <div className="auth-button-container">
            <button
              type="submit"
              disabled={isLoading}
              className="auth-button"
            >
              {isLoading ? 'Signing In...' : 'Sign In'}
            </button>
          </div>
        </form>

        <div className="auth-footer">
          <p>
            Don't have an account?{' '}
            <Link href="/register" className="auth-link">
              Sign up here
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
