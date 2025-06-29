package com.example.ecodb.Controller;

import com.example.ecodb.Service.WishListService;
import com.example.ecodb.dto.response.ApiResponse;
import com.example.ecodb.dto.response.WishListResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/wishlist")
@RequiredArgsConstructor
public class WishListController {

    private final WishListService wishListService;

    @GetMapping
    public ResponseEntity<List<WishListResponse>> getCurrentUserWishList() {
        return ResponseEntity.ok(wishListService.getCurrentUserWishList());
    }

    @PostMapping("/{productId}")
    public ResponseEntity<WishListResponse> addProductToWishList(@PathVariable Long productId) {
        return new ResponseEntity<>(wishListService.addProductToWishList(productId), HttpStatus.CREATED);
    }

    @DeleteMapping("/{productId}")
    public ResponseEntity<ApiResponse> removeProductFromWishList(@PathVariable Long productId) {
        return ResponseEntity.ok(wishListService.removeProductFromWishList(productId));
    }

    @GetMapping("/check/{productId}")
    public ResponseEntity<ApiResponse> checkProductInWishList(@PathVariable Long productId) {
        return ResponseEntity.ok(wishListService.checkProductInWishList(productId));
    }

    @PostMapping("/{productId}/move-to-cart")
    public ResponseEntity<ApiResponse> moveWishListItemToCart(@PathVariable Long productId) {
        return ResponseEntity.ok(wishListService.moveWishListItemToCart(productId));
    }
}
