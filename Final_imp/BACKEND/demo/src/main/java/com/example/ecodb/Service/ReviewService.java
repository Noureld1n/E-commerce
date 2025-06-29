package com.example.ecodb.Service;

import com.example.ecodb.dto.request.ReviewRequest;
import com.example.ecodb.dto.response.ApiResponse;
import com.example.ecodb.dto.response.ReviewResponse;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.List;

public interface ReviewService {
    
    ReviewResponse createReview(ReviewRequest reviewRequest);
    
    ReviewResponse getReviewById(Long reviewId);
    
    Page<ReviewResponse> getProductReviews(Long productId, Pageable pageable);
    
    List<ReviewResponse> getCurrentUserReviews();
    
    Double calculateProductAverageRating(Long productId);
    
    Long countProductRecommendations(Long productId);
    
    ReviewResponse updateReview(Long reviewId, ReviewRequest reviewRequest);
    
    ApiResponse deleteReview(Long reviewId);
}
