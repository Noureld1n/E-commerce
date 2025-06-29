package com.example.ecodb.Service;

import com.example.ecodb.dto.request.CartItemRequest;
import com.example.ecodb.dto.response.ApiResponse;
import com.example.ecodb.dto.response.ShoppingCartResponse;

public interface CartService {
    
    ShoppingCartResponse getCurrentUserCart();
    
    ShoppingCartResponse addItemToCart(CartItemRequest cartItemRequest);
    
    ShoppingCartResponse updateCartItem(Long productId, CartItemRequest cartItemRequest);
    
    ApiResponse removeItemFromCart(Long productId);
    
    ApiResponse clearCart();
}
