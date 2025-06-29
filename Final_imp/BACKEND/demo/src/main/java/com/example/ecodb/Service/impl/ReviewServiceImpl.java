package com.example.ecodb.Service.impl;

import com.example.ecodb.Model.Customer;
import com.example.ecodb.Model.Product;
import com.example.ecodb.Model.ProductReview;
import com.example.ecodb.Model.User;
import com.example.ecodb.Repository.CustomerRepository;
import com.example.ecodb.Repository.ProductRepository;
import com.example.ecodb.Repository.ProductReviewRepository;
import com.example.ecodb.Repository.UserRepository;
import com.example.ecodb.Service.ReviewService;
import com.example.ecodb.dto.request.ReviewRequest;
import com.example.ecodb.dto.response.ApiResponse;
import com.example.ecodb.dto.response.ReviewResponse;
import com.example.ecodb.exception.BadRequestException;
import com.example.ecodb.exception.ResourceNotFoundException;
import com.example.ecodb.exception.UnauthorizedException;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ReviewServiceImpl implements ReviewService {

    private final ProductReviewRepository productReviewRepository;
    private final ProductRepository productRepository;
    private final UserRepository userRepository;
    private final CustomerRepository customerRepository;

    @Override
    @Transactional
    public ReviewResponse createReview(ReviewRequest reviewRequest) {
        // Get current authenticated user
        Customer customer = getCurrentCustomer();
        
        // Check if product exists
        Product product = productRepository.findById(reviewRequest.getProductId())
                .orElseThrow(() -> new ResourceNotFoundException("Product", "id", reviewRequest.getProductId()));
        
        // Check if customer has already reviewed this product
        List<ProductReview> existingReviews = productReviewRepository.findByCustomerCustomerId(customer.getCustomerId());
        if (existingReviews.stream().anyMatch(review -> review.getProduct().getProductId().equals(reviewRequest.getProductId()))) {
            throw new BadRequestException("You have already reviewed this product");
        }
        
        // Create new review
        ProductReview review = ProductReview.builder()
                .title(reviewRequest.getTitle())
                .reviewText(reviewRequest.getReviewText())
                .rating(reviewRequest.getRating())
                .recommended(reviewRequest.getRecommended())
                .customer(customer)
                .product(product)
                .build();
        
        // Save review
        ProductReview savedReview = productReviewRepository.save(review);
        
        return ReviewResponse.fromEntity(savedReview);
    }

    @Override
    public ReviewResponse getReviewById(Long reviewId) {
        ProductReview review = productReviewRepository.findById(reviewId)
                .orElseThrow(() -> new ResourceNotFoundException("Review", "id", reviewId));
        
        return ReviewResponse.fromEntity(review);
    }

    @Override
    public Page<ReviewResponse> getProductReviews(Long productId, Pageable pageable) {
        // Check if product exists
        if (!productRepository.existsById(productId)) {
            throw new ResourceNotFoundException("Product", "id", productId);
        }
        
        Page<ProductReview> reviews = productReviewRepository.findByProductProductId(productId, pageable);
        
        List<ReviewResponse> reviewResponses = reviews.getContent().stream()
                .map(ReviewResponse::fromEntity)
                .collect(Collectors.toList());
        
        return new PageImpl<>(reviewResponses, pageable, reviews.getTotalElements());
    }

    @Override
    public List<ReviewResponse> getCurrentUserReviews() {
        // Get current authenticated user
        Customer customer = getCurrentCustomer();
        
        // Get all reviews by this customer
        List<ProductReview> reviews = productReviewRepository.findByCustomerCustomerId(customer.getCustomerId());
        
        return reviews.stream()
                .map(ReviewResponse::fromEntity)
                .collect(Collectors.toList());
    }

    @Override
    public Double calculateProductAverageRating(Long productId) {
        // Check if product exists
        if (!productRepository.existsById(productId)) {
            throw new ResourceNotFoundException("Product", "id", productId);
        }
        
        Double averageRating = productReviewRepository.findAverageRatingByProductId(productId);
        return averageRating != null ? averageRating : 0.0;
    }

    @Override
    public Long countProductRecommendations(Long productId) {
        // Check if product exists
        if (!productRepository.existsById(productId)) {
            throw new ResourceNotFoundException("Product", "id", productId);
        }
        
        Long recommendationCount = productReviewRepository.countRecommendedByProductId(productId);
        return recommendationCount != null ? recommendationCount : 0L;
    }

    @Override
    @Transactional
    public ReviewResponse updateReview(Long reviewId, ReviewRequest reviewRequest) {
        // Get current authenticated user
        Customer customer = getCurrentCustomer();
        
        // Find the review
        ProductReview review = productReviewRepository.findById(reviewId)
                .orElseThrow(() -> new ResourceNotFoundException("Review", "id", reviewId));
        
        // Check if review belongs to the authenticated customer
        if (!review.getCustomer().getCustomerId().equals(customer.getCustomerId())) {
            throw new UnauthorizedException("You do not have permission to update this review");
        }
        
        // Update review fields
        review.setTitle(reviewRequest.getTitle());
        review.setReviewText(reviewRequest.getReviewText());
        review.setRating(reviewRequest.getRating());
        review.setRecommended(reviewRequest.getRecommended());
        
        // Save updated review
        ProductReview updatedReview = productReviewRepository.save(review);
        
        return ReviewResponse.fromEntity(updatedReview);
    }

    @Override
    @Transactional
    public ApiResponse deleteReview(Long reviewId) {
        // Get current authenticated user
        Customer customer = getCurrentCustomer();
        
        // Find the review
        ProductReview review = productReviewRepository.findById(reviewId)
                .orElseThrow(() -> new ResourceNotFoundException("Review", "id", reviewId));
        
        // Check if review belongs to the authenticated customer
        if (!review.getCustomer().getCustomerId().equals(customer.getCustomerId())) {
            throw new UnauthorizedException("You do not have permission to delete this review");
        }
        
        // Delete the review
        productReviewRepository.delete(review);
        
        return new ApiResponse(true, "Review deleted successfully");
    }
    
    // Helper method to get current customer
    private Customer getCurrentCustomer() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        User user = userRepository.findByEmail(authentication.getName())
                .orElseThrow(() -> new UnauthorizedException("User not found"));
        
        Customer customer = customerRepository.findByUserEmail(user.getEmail());
        if (customer == null) {
            throw new UnauthorizedException("Only customers can manage reviews");
        }
        
        return customer;
    }
}
