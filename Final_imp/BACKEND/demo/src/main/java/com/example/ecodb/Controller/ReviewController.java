package com.example.ecodb.Controller;

import com.example.ecodb.Service.ReviewService;
import com.example.ecodb.dto.request.ReviewRequest;
import com.example.ecodb.dto.response.ApiResponse;
import com.example.ecodb.dto.response.ReviewResponse;
import com.example.ecodb.util.AppConstants;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/reviews")
@RequiredArgsConstructor
public class ReviewController {

    private final ReviewService reviewService;

    @PostMapping
    public ResponseEntity<ReviewResponse> createReview(@Valid @RequestBody ReviewRequest reviewRequest) {
        return new ResponseEntity<>(reviewService.createReview(reviewRequest), HttpStatus.CREATED);
    }

    @GetMapping("/{reviewId}")
    public ResponseEntity<ReviewResponse> getReviewById(@PathVariable Long reviewId) {
        return ResponseEntity.ok(reviewService.getReviewById(reviewId));
    }

    @GetMapping("/product/{productId}")
    public ResponseEntity<Page<ReviewResponse>> getProductReviews(
            @PathVariable Long productId,
            @RequestParam(defaultValue = AppConstants.DEFAULT_PAGE_NUMBER) int page,
            @RequestParam(defaultValue = AppConstants.DEFAULT_PAGE_SIZE) int size,
            @RequestParam(defaultValue = "reviewDate") String sortBy,
            @RequestParam(defaultValue = "desc") String sortDir) {
        Sort sort = Sort.by(Sort.Direction.fromString(sortDir), sortBy);
        Pageable pageable = PageRequest.of(page, size, sort);
        return ResponseEntity.ok(reviewService.getProductReviews(productId, pageable));
    }

    @GetMapping("/my-reviews")
    public ResponseEntity<List<ReviewResponse>> getCurrentUserReviews() {
        return ResponseEntity.ok(reviewService.getCurrentUserReviews());
    }

    @GetMapping("/product/{productId}/rating")
    public ResponseEntity<Map<String, Double>> calculateProductAverageRating(@PathVariable Long productId) {
        Double averageRating = reviewService.calculateProductAverageRating(productId);
        return ResponseEntity.ok(Map.of("averageRating", averageRating));
    }

    @GetMapping("/product/{productId}/recommendations")
    public ResponseEntity<Map<String, Long>> countProductRecommendations(@PathVariable Long productId) {
        Long recommendationCount = reviewService.countProductRecommendations(productId);
        return ResponseEntity.ok(Map.of("recommendationCount", recommendationCount));
    }

    @PutMapping("/{reviewId}")
    public ResponseEntity<ReviewResponse> updateReview(
            @PathVariable Long reviewId,
            @Valid @RequestBody ReviewRequest reviewRequest) {
        return ResponseEntity.ok(reviewService.updateReview(reviewId, reviewRequest));
    }

    @DeleteMapping("/{reviewId}")
    public ResponseEntity<ApiResponse> deleteReview(@PathVariable Long reviewId) {
        return ResponseEntity.ok(reviewService.deleteReview(reviewId));
    }
}
