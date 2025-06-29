package com.example.ecodb.dto.response;

import com.example.ecodb.Model.ProductReview;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class ReviewResponse {
    private Long reviewId;
    private String title;
    private String reviewText;
    private Integer rating;
    private Boolean recommended;
    private LocalDateTime reviewDate;
    private Long productId;
    private String productName;
    private String productImageUrl;
    private Long customerId;
    private String customerName;

    public static ReviewResponse fromEntity(ProductReview review) {
        // Get main image URL or first available image for product
        String imageUrl = null;
        if (review.getProduct().getImages() != null && !review.getProduct().getImages().isEmpty()) {
            imageUrl = review.getProduct().getImages().stream()
                    .filter(img -> img.getIsMain())
                    .findFirst()
                    .orElse(review.getProduct().getImages().get(0))
                    .getImageUrl();
        }
        
        return ReviewResponse.builder()
                .reviewId(review.getReviewId())
                .title(review.getTitle())
                .reviewText(review.getReviewText())
                .rating(review.getRating())
                .recommended(review.getRecommended())
                .reviewDate(review.getReviewDate())
                .productId(review.getProduct().getProductId())
                .productName(review.getProduct().getProductName())
                .productImageUrl(imageUrl)
                .customerId(review.getCustomer().getCustomerId())
                .customerName(review.getCustomer().getUser().getFirstName() + " " + 
                             review.getCustomer().getUser().getLastName())
                .build();
    }
}
