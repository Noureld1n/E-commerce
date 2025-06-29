package com.example.ecodb.Repository;

import com.example.ecodb.Model.ProductImage;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ProductImageRepository extends JpaRepository<ProductImage, Long> {
    
    List<ProductImage> findByProductProductId(Long productId);
    
    Optional<ProductImage> findByProductProductIdAndIsMainTrue(Long productId);
    
    Optional<ProductImage> findByProductProductIdAndImageUrl(Long productId, String imageUrl);
    
    void deleteByProductProductId(Long productId);
}
