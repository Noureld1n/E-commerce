package com.example.ecodb.dto.response;

import com.example.ecodb.Model.CartItem;
import com.example.ecodb.Model.ShoppingCart;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class ShoppingCartResponse {
    private Long cartId;
    private Long customerId;
    private String customerName;
    private String cartStatus;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    @Builder.Default
    private List<CartItemResponse> items = new ArrayList<>();
    private Double totalPrice;
    private Integer totalItems;

    public static ShoppingCartResponse fromEntity(ShoppingCart cart) {
        // Calculate total price and total items
        double totalPrice = cart.getCartItems().stream()
                .mapToDouble(item -> item.getProduct().getPrice() * item.getQuantity())
                .sum();
        
        int totalItems = cart.getCartItems().stream()
                .mapToInt(CartItem::getQuantity)
                .sum();
        
        return ShoppingCartResponse.builder()
                .cartId(cart.getCartId())
                .customerId(cart.getCustomer().getCustomerId())
                .customerName(cart.getCustomer().getUser().getFirstName() + " " + cart.getCustomer().getUser().getLastName())
                .cartStatus(cart.getCartStatus().name())
                .createdAt(cart.getCreatedAt())
                .updatedAt(cart.getUpdatedAt())
                .items(cart.getCartItems().stream()
                        .map(CartItemResponse::fromEntity)
                        .collect(Collectors.toList()))
                .totalPrice(totalPrice)
                .totalItems(totalItems)
                .build();
    }
    
    @Data
    @Builder
    @AllArgsConstructor
    @NoArgsConstructor
    public static class CartItemResponse {
        private Long productId;
        private String productName;
        private String imageUrl;
        private Double price;
        private Integer quantity;
        private Double subtotal;
        
        public static CartItemResponse fromEntity(CartItem cartItem) {
            // Get main image URL or first available image
            String imageUrl = null;
            if (cartItem.getProduct().getImages() != null && !cartItem.getProduct().getImages().isEmpty()) {
                imageUrl = cartItem.getProduct().getImages().stream()
                        .filter(img -> img.getIsMain())
                        .findFirst()
                        .orElse(cartItem.getProduct().getImages().get(0))
                        .getImageUrl();
            }
            
            return CartItemResponse.builder()
                    .productId(cartItem.getProduct().getProductId())
                    .productName(cartItem.getProduct().getProductName())
                    .imageUrl(imageUrl)
                    .price(cartItem.getProduct().getPrice())
                    .quantity(cartItem.getQuantity())
                    .subtotal(cartItem.getProduct().getPrice() * cartItem.getQuantity())
                    .build();
        }
    }
}
