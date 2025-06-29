package com.example.ecodb.Controller;

import com.example.ecodb.Service.CartService;
import com.example.ecodb.dto.request.CartItemRequest;
import com.example.ecodb.dto.response.ApiResponse;
import com.example.ecodb.dto.response.ShoppingCartResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/cart")
@RequiredArgsConstructor
public class CartController {

    private final CartService cartService;

    @GetMapping
    public ResponseEntity<ShoppingCartResponse> getCurrentUserCart() {
        return ResponseEntity.ok(cartService.getCurrentUserCart());
    }

    @PostMapping("/items")
    public ResponseEntity<ShoppingCartResponse> addItemToCart(@Valid @RequestBody CartItemRequest cartItemRequest) {
        return new ResponseEntity<>(cartService.addItemToCart(cartItemRequest), HttpStatus.CREATED);
    }

    @PutMapping("/items/{productId}")
    public ResponseEntity<ShoppingCartResponse> updateCartItem(
            @PathVariable Long productId,
            @Valid @RequestBody CartItemRequest cartItemRequest) {
        return ResponseEntity.ok(cartService.updateCartItem(productId, cartItemRequest));
    }

    @DeleteMapping("/items/{productId}")
    public ResponseEntity<ApiResponse> removeItemFromCart(@PathVariable Long productId) {
        return ResponseEntity.ok(cartService.removeItemFromCart(productId));
    }

    @DeleteMapping("/clear")
    public ResponseEntity<ApiResponse> clearCart() {
        return ResponseEntity.ok(cartService.clearCart());
    }
}
