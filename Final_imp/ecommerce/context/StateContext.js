import React, { createContext, useContext, useState, useEffect } from "react";
import { toast } from 'react-hot-toast';
import Cookies from 'js-cookie';
import { api } from '../lib/client';

const Context = createContext();

export const StateContext = ({ children }) => {
    // UI State (preserve for voice control)
    const [showCart, setShowCart] = useState(false);
    const [qty, setQty] = useState(1);
    const [voiceCommandCategory, setVoiceCommandCategory] = useState(null); // Added for voice control
    
    // Backend integrated states
    const [cartItems, setCartItems] = useState([]);
    const [totalPrice, setTotalPrice] = useState(0);
    const [totalQuantities, setTotalQuantities] = useState(0);
      // User authentication state
    const [user, setUser] = useState(null);
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [loading, setLoading] = useState(true);
    
    // Review voice control states
    const [showAddReview, setShowAddReview] = useState(false);
    const [voiceReviewData, setVoiceReviewData] = useState(null);
    
    // Products state
    const [products, setProducts] = useState([]);
    const [categories, setCategories] = useState([]);    // Initialize authentication state
    useEffect(() => {
        const token = Cookies.get('authToken');
        const userData = Cookies.get('user') || localStorage.getItem('user'); // Try localStorage as fallback
        
        if (token && userData) {
            try {
                setUser(JSON.parse(userData));
                setIsAuthenticated(true);
            } catch (error) {
                console.error('Error parsing user data:', error);
                logout();
            }
        }
        setLoading(false);
    }, []);// Load cart when authentication state changes
    useEffect(() => {
        if (isAuthenticated && !loading) {
            loadCart();
        }
    }, [isAuthenticated, loading]);// Authentication functions
    const login = async (credentials) => {
        try {
            const response = await api.auth.login(credentials);
            console.log('Login response:', response.data);
            
            // Backend returns: { tokenType, accessToken, id, firstName, lastName, email, role }
            const { 
                accessToken, 
                tokenType, 
                id, 
                firstName, 
                lastName, 
                email, 
                role 
            } = response.data;
            
            // Create user object from the response
            const userData = {
                id,
                firstName,
                lastName,
                email,
                role
            };
            
            console.log('Extracted user data:', userData);
            console.log('Access token:', accessToken);
            
            Cookies.set('authToken', accessToken);
            // Note: Backend doesn't provide refreshToken in current implementation
            Cookies.set('user', JSON.stringify(userData));
            localStorage.setItem('user', JSON.stringify(userData)); // Add this line for local storage
            
            setUser(userData);
            setIsAuthenticated(true);
            
            // Load user's cart after login
            await loadCart();
            
            toast.success('Login successful!');
            return { success: true, userData };
        } catch (error) {
            console.error('Login error:', error);
            toast.error(error.response?.data?.message || 'Login failed');
            return { success: false, error: error.response?.data?.message };
        }
    };
    
    const register = async (userData) => {
        try {
            const response = await api.auth.register(userData);
            // Don't show toast here, let the component handle it
            return { success: true };
        } catch (error) {
            console.error('Registration error:', error);
            throw error; // Re-throw to allow the component to handle it
        }
    };
    
    const logout = async () => {
        try {
            await api.auth.logout();
        } catch (error) {
            console.error('Logout error:', error);
        } finally {
            Cookies.remove('authToken');
            Cookies.remove('user');
            localStorage.removeItem('user'); // Add this line to clear localStorage
            // Note: refreshToken not used in current backend implementation
            setUser(null);
            setIsAuthenticated(false);
            setCartItems([]);
            setTotalPrice(0);
            setTotalQuantities(0);
            toast.success('Logged out successfully');
        }
    };

    const updateUserProfile = async (profileData) => {
        try {
            const response = await api.users.updateProfile(profileData);
            const updatedUser = response.data;
            
            // Update user in state and cookies
            setUser(updatedUser);
            Cookies.set('user', JSON.stringify(updatedUser));
            
            return { success: true, data: updatedUser };
        } catch (error) {
            console.error('Update profile error:', error);
            return { success: false, error: error.response?.data?.message || 'Profile update failed' };
        }
    };
    
    // Cart functions with backend integration
    const loadCart = async () => {
        try {
            const response = await api.cart.get();
            const cartData = response.data;
            
            // Transform backend cart items to match frontend structure
            const transformedItems = cartData.items ? cartData.items.map(item => ({
                id: item.productId,
                productId: item.productId,
                name: item.productName,
                productName: item.productName,
                imageUrl: item.imageUrl,
                price: item.price,
                quantity: item.quantity,
                cartItemId: item.productId // For backend operations
            })) : [];
            
            setCartItems(transformedItems);
            setTotalPrice(cartData.totalPrice || 0);
            setTotalQuantities(cartData.totalItems || 0);
        } catch (error) {
            console.error('Error loading cart:', error);
            // If user not authenticated, keep local cart
            if (error.response?.status !== 401) {
                toast.error('Failed to load cart');
            }
        }
    };
    
    const onAdd = async (product, quantity) => {
        if (!isAuthenticated) {
            // Local cart for non-authenticated users
            const productId = product.id || product.productId;
            const productName = product.name || product.productName;
            const checkProductInCart = cartItems.find((item) => (item.id || item.productId) === productId);
            setTotalPrice((prevTotalPrice) => prevTotalPrice + product.price * quantity);
            setTotalQuantities((prevTotalQuantities) => prevTotalQuantities + quantity);

            if (checkProductInCart) {
                const updatedCartItems = cartItems.map((cartProduct) => {
                    if ((cartProduct.id || cartProduct.productId) === productId) return {
                        ...cartProduct,
                        quantity: cartProduct.quantity + quantity
                    }
                    return cartProduct;
                });
                setCartItems(updatedCartItems);
            } else {
                setCartItems([...cartItems, { 
                    ...product, 
                    id: productId,
                    productId: productId,
                    name: productName,
                    productName: productName,
                    quantity 
                }]);
            }
            toast.success(`${quantity} ${productName} added to the cart.`);
            return;
        }

        // Backend cart for authenticated users
        try {
            const productId = product.id || product.productId;
            await api.cart.add(productId, quantity);
            await loadCart(); // Refresh cart from backend
            const productName = product.name || product.productName;
            toast.success(`${quantity} ${productName} added to the cart.`);
        } catch (error) {
            console.error('Error adding to cart:', error);
            toast.error('Failed to add item to cart');
        }
    };
    
    const toggleCartItemQuanitity = async (id, value) => {
        if (!isAuthenticated) {
            // Local cart logic for non-authenticated users
            const foundProduct = cartItems.find((item) => (item.id || item.productId) === id);
            const index = cartItems.findIndex((item) => (item.id || item.productId) === id);
        
            if (!foundProduct) return;
        
            const newCartItems = [...cartItems];
        
            if (value === 'inc') {
                newCartItems[index].quantity += 1;
                setCartItems(newCartItems);
                setTotalPrice((prevTotalPrice) => prevTotalPrice + foundProduct.price);
                setTotalQuantities((prevTotalQuantities) => prevTotalQuantities + 1);
            } else if (value === 'dec' && foundProduct.quantity > 1) {
                newCartItems[index].quantity -= 1;
                setCartItems(newCartItems);
                setTotalPrice((prevTotalPrice) => prevTotalPrice - foundProduct.price);
                setTotalQuantities((prevTotalQuantities) => prevTotalQuantities - 1);
            }
            return;
        }

        // Backend cart for authenticated users
        try {
            const foundProduct = cartItems.find((item) => (item.id || item.productId) === id);
            if (!foundProduct) return;

            let newQuantity = foundProduct.quantity;
            if (value === 'inc') {
                newQuantity += 1;
            } else if (value === 'dec' && foundProduct.quantity > 1) {
                newQuantity -= 1;
            }

            await api.cart.update(id, newQuantity);
            await loadCart(); // Refresh cart from backend
        } catch (error) {
            console.error('Error updating cart item:', error);
            toast.error('Failed to update cart item');
        }
    };
    
    const onRemove = async (product) => {
        if (!isAuthenticated) {
            // Local cart logic
            const productId = product.id || product.productId;
            setCartItems(cartItems.filter((item) => (item.id || item.productId) !== productId));
            setTotalPrice((prevTotalPrice) => prevTotalPrice - product.price * product.quantity);
            setTotalQuantities((prevTotalQuantities) => prevTotalQuantities - product.quantity);
            return;
        }

        // Backend cart for authenticated users
        try {
            const productId = product.id || product.productId;
            await api.cart.remove(productId);
            await loadCart(); // Refresh cart from backend
            toast.success('Item removed from cart');
        } catch (error) {
            console.error('Error removing from cart:', error);
            toast.error('Failed to remove item from cart');
        }
    };

    // Quantity controls for product pages (preserve for voice control)
    const incQty = () => {
        setQty((prevQty) => prevQty + 1);
    };

    const decQty = () => {
        setQty((prevQty) => {
            if (prevQty - 1 < 1) { return 1 }
            return prevQty - 1;
        });
    };

    // Product functions
    const loadProducts = async (params = {}) => {
        try {
            const response = await api.products.getAll(params);
            setProducts(response.data.content || response.data);
            return response.data;
        } catch (error) {
            console.error('Error loading products:', error);
            toast.error('Failed to load products');
            return [];
        }
    };

    const loadCategories = async () => {
        try {
            const response = await api.categories.getAll();
            setCategories(response.data);
            return response.data;
        } catch (error) {
            console.error('Error loading categories:', error);
            toast.error('Failed to load categories');
            return [];
        }
    };

    return (
        <Context.Provider value={{
            // UI State (preserved for voice control)
            showCart,
            setShowCart,
            qty,
            incQty,
            decQty,
            
            // Cart state and functions
            cartItems,
            totalPrice,
            totalQuantities,
            onAdd,
            toggleCartItemQuanitity,
            onRemove,
            loadCart,
              // Authentication
            user,
            isAuthenticated,
            loading,
            login,
            register,
            logout,
            updateUserProfile,
            
            // Products and categories
            products,
            categories,
            loadProducts,
            loadCategories,
              // Voice command category
            voiceCommandCategory,
            setVoiceCommandCategory,

            // Voice review control
            showAddReview,
            setShowAddReview,
            voiceReviewData,
            setVoiceReviewData,

            // Legacy setters (for backward compatibility)
            setCartItems,
            setTotalPrice,
            setTotalQuantities
        }}>
            {children}
        </Context.Provider>
    );
};

export const useStateContext = () => useContext(Context);