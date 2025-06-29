package com.example.ecodb.Service.impl;

import com.example.ecodb.Model.Customer;
import com.example.ecodb.Model.Product;
import com.example.ecodb.Model.User;
import com.example.ecodb.Model.WishList;
import com.example.ecodb.Repository.CustomerRepository;
import com.example.ecodb.Repository.ProductRepository;
import com.example.ecodb.Repository.UserRepository;
import com.example.ecodb.Repository.WishListRepository;
import com.example.ecodb.Service.CartService;
import com.example.ecodb.Service.WishListService;
import com.example.ecodb.dto.request.CartItemRequest;
import com.example.ecodb.dto.response.ApiResponse;
import com.example.ecodb.dto.response.WishListResponse;
import com.example.ecodb.exception.BadRequestException;
import com.example.ecodb.exception.ResourceNotFoundException;
import com.example.ecodb.exception.UnauthorizedException;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class WishListServiceImpl implements WishListService {

    private final WishListRepository wishListRepository;
    private final UserRepository userRepository;
    private final CustomerRepository customerRepository;
    private final ProductRepository productRepository;
    private final CartService cartService;

    @Override
    public List<WishListResponse> getCurrentUserWishList() {
        // Get current customer
        Customer customer = getCurrentCustomer();

        // Get wish list items
        List<WishList> wishListItems = wishListRepository.findByCustomerCustomerId(customer.getCustomerId());

        // Return response
        return wishListItems.stream()
                .map(WishListResponse::fromEntity)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional
    public WishListResponse addProductToWishList(Long productId) {
        // Get current customer
        Customer customer = getCurrentCustomer();

        // Check if product exists
        Product product = productRepository.findById(productId)
                .orElseThrow(() -> new ResourceNotFoundException("Product", "id", productId));

        // Check if product is already in wish list
        if (wishListRepository.existsByCustomerCustomerIdAndProductProductId(customer.getCustomerId(), productId)) {
            throw new BadRequestException("Product already exists in wish list");
        }

        // Create wish list item
        WishList wishList = WishList.builder()
                .customer(customer)
                .product(product)
                .build();

        // Save wish list item
        WishList savedWishList = wishListRepository.save(wishList);

        // Return response
        return WishListResponse.fromEntity(savedWishList);
    }

    @Override
    @Transactional
    public ApiResponse removeProductFromWishList(Long productId) {
        // Get current customer
        Customer customer = getCurrentCustomer();

        // Check if product is in wish list
        if (!wishListRepository.existsByCustomerCustomerIdAndProductProductId(customer.getCustomerId(), productId)) {
            throw new ResourceNotFoundException("Product", "id", productId);
        }

        // Remove product from wish list
        wishListRepository.deleteByCustomerCustomerIdAndProductProductId(customer.getCustomerId(), productId);

        // Return response
        return new ApiResponse(true, "Product removed from wish list successfully");
    }

    @Override
    public ApiResponse checkProductInWishList(Long productId) {
        // Get current customer
        Customer customer = getCurrentCustomer();

        // Check if product is in wish list
        boolean isInWishList = wishListRepository.existsByCustomerCustomerIdAndProductProductId(
                customer.getCustomerId(), productId);

        // Return response
        return new ApiResponse(isInWishList, isInWishList ? "Product is in wish list" : "Product is not in wish list");
    }

    @Override
    @Transactional
    public ApiResponse moveWishListItemToCart(Long productId) {
        // Get current customer
        Customer customer = getCurrentCustomer();

        // Check if product is in wish list
        if (!wishListRepository.existsByCustomerCustomerIdAndProductProductId(customer.getCustomerId(), productId)) {
            throw new ResourceNotFoundException("Product", "id", productId);
        }

        // Add product to cart
        CartItemRequest cartItemRequest = new CartItemRequest();
        cartItemRequest.setProductId(productId);
        cartItemRequest.setQuantity(1);
        cartService.addItemToCart(cartItemRequest);

        // Remove product from wish list
        wishListRepository.deleteByCustomerCustomerIdAndProductProductId(customer.getCustomerId(), productId);

        // Return response
        return new ApiResponse(true, "Product moved to cart successfully");
    }

    // Helper method to get current customer
    private Customer getCurrentCustomer() {
        // Get current authenticated user
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        User user = userRepository.findByEmail(authentication.getName())
                .orElseThrow(() -> new UnauthorizedException("User not found"));

        // Check if user is a customer
        Customer customer = customerRepository.findByUserEmail(user.getEmail());
        if (customer == null) {
            throw new UnauthorizedException("Only customers can access wish lists");
        }

        return customer;
    }
}
