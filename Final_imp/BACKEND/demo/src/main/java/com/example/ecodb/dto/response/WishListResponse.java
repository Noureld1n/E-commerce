package com.example.ecodb.dto.response;

import com.example.ecodb.Model.WishList;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class WishListResponse {
    private Long listId;
    private Long productId;
    private String productName;
    private Double productPrice;
    private String imageUrl;
    private LocalDateTime addedDate;
    
    public static WishListResponse fromEntity(WishList wishList) {
        // Get main image URL or first available image
        String imageUrl = null;
        if (wishList.getProduct().getImages() != null && !wishList.getProduct().getImages().isEmpty()) {
            imageUrl = wishList.getProduct().getImages().stream()
                    .filter(img -> img.getIsMain())
                    .findFirst()
                    .orElse(wishList.getProduct().getImages().get(0))
                    .getImageUrl();
        }
        
        return WishListResponse.builder()
                .listId(wishList.getWishItemId())
                .productId(wishList.getProduct().getProductId())
                .productName(wishList.getProduct().getProductName())
                .productPrice(wishList.getProduct().getPrice())
                .imageUrl(imageUrl)
                .addedDate(wishList.getAddedDate())
                .build();
    }
}
