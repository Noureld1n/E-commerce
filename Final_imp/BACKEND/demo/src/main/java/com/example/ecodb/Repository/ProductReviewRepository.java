package com.example.ecodb.Repository;

import com.example.ecodb.Model.ProductReview;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ProductReviewRepository extends JpaRepository<ProductReview, Long> {
    
    Page<ProductReview> findByProductProductId(Long productId, Pageable pageable);
    
    List<ProductReview> findByCustomerCustomerId(Long customerId);
    
    @Query("SELECT AVG(r.rating) FROM ProductReview r WHERE r.product.productId = :productId")
    Double findAverageRatingByProductId(Long productId);
    
    @Query("SELECT COUNT(r) FROM ProductReview r WHERE r.product.productId = :productId AND r.recommended = true")
    Long countRecommendedByProductId(Long productId);
}
