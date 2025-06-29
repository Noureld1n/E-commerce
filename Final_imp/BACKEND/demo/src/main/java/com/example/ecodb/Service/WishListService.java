package com.example.ecodb.Service;

import com.example.ecodb.dto.response.ApiResponse;
import com.example.ecodb.dto.response.WishListResponse;

import java.util.List;

public interface WishListService {
    
    List<WishListResponse> getCurrentUserWishList();
    
    WishListResponse addProductToWishList(Long productId);
    
    ApiResponse removeProductFromWishList(Long productId);
    
    ApiResponse checkProductInWishList(Long productId);
    
    ApiResponse moveWishListItemToCart(Long productId);
}
