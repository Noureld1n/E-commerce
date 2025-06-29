package com.example.ecodb.Service.impl;

import com.example.ecodb.Model.*;
import com.example.ecodb.Repository.CartItemRepository;
import com.example.ecodb.Repository.CustomerRepository;
import com.example.ecodb.Repository.ProductRepository;
import com.example.ecodb.Repository.ShoppingCartRepository;
import com.example.ecodb.Repository.UserRepository;
import com.example.ecodb.Service.CartService;
import com.example.ecodb.dto.request.CartItemRequest;
import com.example.ecodb.dto.response.ApiResponse;
import com.example.ecodb.dto.response.ShoppingCartResponse;
import com.example.ecodb.exception.BadRequestException;
import com.example.ecodb.exception.ResourceNotFoundException;
import com.example.ecodb.exception.UnauthorizedException;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Optional;

@Service
@RequiredArgsConstructor
public class CartServiceImpl implements CartService {

    private final ShoppingCartRepository shoppingCartRepository;
    private final CartItemRepository cartItemRepository;
    private final UserRepository userRepository;
    private final CustomerRepository customerRepository;
    private final ProductRepository productRepository;

    @Override
    public ShoppingCartResponse getCurrentUserCart() {
        // Get current authenticated user
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        User user = userRepository.findByEmail(authentication.getName())
                .orElseThrow(() -> new UnauthorizedException("User not found"));

        // Check if user is a customer
        Customer customer = customerRepository.findByUserEmail(user.getEmail());
        if (customer == null) {
            throw new UnauthorizedException("Only customers can access shopping carts");
        }

        // Get or create shopping cart
        ShoppingCart cart = getOrCreateShoppingCart(customer);

        // Return cart response
        return ShoppingCartResponse.fromEntity(cart);
    }

    @Override
    @Transactional
    public ShoppingCartResponse addItemToCart(CartItemRequest cartItemRequest) {
        // Get current authenticated user
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        User user = userRepository.findByEmail(authentication.getName())
                .orElseThrow(() -> new UnauthorizedException("User not found"));

        // Check if user is a customer
        Customer customer = customerRepository.findByUserEmail(user.getEmail());
        if (customer == null) {
            throw new UnauthorizedException("Only customers can add items to shopping carts");
        }

        // Get or create shopping cart
        ShoppingCart cart = getOrCreateShoppingCart(customer);

        // Check if product exists
        Product product = productRepository.findById(cartItemRequest.getProductId())
                .orElseThrow(() -> new ResourceNotFoundException("Product", "id", cartItemRequest.getProductId()));        // Check if product is available
        if (!product.getIsAvailable()) {
            throw new BadRequestException("Product is not available");
        }

        // Check if item already exists in cart
        Optional<CartItem> existingItem = cartItemRepository.findByCartCartIdAndProductProductId(
                cart.getCartId(), cartItemRequest.getProductId());

        // Calculate the total quantity that will be in cart after adding
        int totalQuantityAfterAdding;
        if (existingItem.isPresent()) {
            totalQuantityAfterAdding = existingItem.get().getQuantity() + cartItemRequest.getQuantity();
        } else {
            totalQuantityAfterAdding = cartItemRequest.getQuantity();
        }

        // Check if there's enough stock for the total quantity
        if (product.getQuantityInStock() < totalQuantityAfterAdding) {
            throw new BadRequestException("Not enough stock available. Only " + product.getQuantityInStock() + " items left.");
        }

        if (existingItem.isPresent()) {
            // Update quantity
            CartItem cartItem = existingItem.get();
            cartItem.setQuantity(cartItem.getQuantity() + cartItemRequest.getQuantity());
            cartItemRepository.save(cartItem);
        } else {
            // Create new cart item
            CartItem cartItem = CartItem.builder()
                    .id(new CartItemId(cart.getCartId(), cartItemRequest.getProductId()))
                    .cart(cart)
                    .product(product)
                    .quantity(cartItemRequest.getQuantity())
                    .build();
            cartItemRepository.save(cartItem);
        }

        // Return updated cart
        return ShoppingCartResponse.fromEntity(cart);
    }

    @Override
    @Transactional
    public ShoppingCartResponse updateCartItem(Long productId, CartItemRequest cartItemRequest) {
        // Get current authenticated user
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        User user = userRepository.findByEmail(authentication.getName())
                .orElseThrow(() -> new UnauthorizedException("User not found"));

        // Check if user is a customer
        Customer customer = customerRepository.findByUserEmail(user.getEmail());
        if (customer == null) {
            throw new UnauthorizedException("Only customers can update items in shopping carts");
        }

        // Get shopping cart
        ShoppingCart cart = shoppingCartRepository.findByCustomerCustomerId(customer.getCustomerId())
                .orElseThrow(() -> new ResourceNotFoundException("Shopping cart", "customer id", customer.getCustomerId()));

        // Check if product exists
        Product product = productRepository.findById(productId)
                .orElseThrow(() -> new ResourceNotFoundException("Product", "id", productId));

        // Check if item exists in cart
        CartItem cartItem = cartItemRepository.findByCartCartIdAndProductProductId(cart.getCartId(), productId)
                .orElseThrow(() -> new ResourceNotFoundException("Cart item", "product id", productId));

        // Check if product is available
        if (!product.getIsAvailable()) {
            throw new BadRequestException("Product is not available");
        }

        // Check if there's enough stock
        if (product.getQuantityInStock() < cartItemRequest.getQuantity()) {
            throw new BadRequestException("Not enough stock available. Only " + product.getQuantityInStock() + " items left.");
        }

        // Update quantity
        cartItem.setQuantity(cartItemRequest.getQuantity());
        cartItemRepository.save(cartItem);

        // Return updated cart
        return ShoppingCartResponse.fromEntity(cart);
    }

    @Override
    @Transactional
    public ApiResponse removeItemFromCart(Long productId) {
        // Get current authenticated user
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        User user = userRepository.findByEmail(authentication.getName())
                .orElseThrow(() -> new UnauthorizedException("User not found"));

        // Check if user is a customer
        Customer customer = customerRepository.findByUserEmail(user.getEmail());
        if (customer == null) {
            throw new UnauthorizedException("Only customers can remove items from shopping carts");
        }

        // Get shopping cart
        ShoppingCart cart = shoppingCartRepository.findByCustomerCustomerId(customer.getCustomerId())
                .orElseThrow(() -> new ResourceNotFoundException("Shopping cart", "customer id", customer.getCustomerId()));

        // Check if item exists in cart
        cartItemRepository.findByCartCartIdAndProductProductId(cart.getCartId(), productId)
                .orElseThrow(() -> new ResourceNotFoundException("Cart item", "product id", productId));

        // Remove item from cart
        cartItemRepository.deleteByCartCartIdAndProductProductId(cart.getCartId(), productId);

        return new ApiResponse(true, "Item removed from cart successfully");
    }

    @Override
    @Transactional
    public ApiResponse clearCart() {
        // Get current authenticated user
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        User user = userRepository.findByEmail(authentication.getName())
                .orElseThrow(() -> new UnauthorizedException("User not found"));

        // Check if user is a customer
        Customer customer = customerRepository.findByUserEmail(user.getEmail());
        if (customer == null) {
            throw new UnauthorizedException("Only customers can clear shopping carts");
        }

        // Get shopping cart
        ShoppingCart cart = shoppingCartRepository.findByCustomerCustomerId(customer.getCustomerId())
                .orElseThrow(() -> new ResourceNotFoundException("Shopping cart", "customer id", customer.getCustomerId()));

        // Remove all items from cart
        cartItemRepository.findByCartCartId(cart.getCartId())
                .forEach(cartItem -> cartItemRepository.delete(cartItem));

        return new ApiResponse(true, "Cart cleared successfully");
    }

    // Helper method to get or create shopping cart
    private ShoppingCart getOrCreateShoppingCart(Customer customer) {
        return shoppingCartRepository.findByCustomerCustomerId(customer.getCustomerId())
                .orElseGet(() -> {
                    ShoppingCart newCart = ShoppingCart.builder()
                            .customer(customer)
                            .cartStatus(ShoppingCart.CartStatus.Active)
                            .build();
                    return shoppingCartRepository.save(newCart);
                });
    }
}
