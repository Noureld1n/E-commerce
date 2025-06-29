package com.example.ecodb.Repository;

import com.example.ecodb.Model.Product;
import com.example.ecodb.Model.Category;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ProductRepository extends JpaRepository<Product, Long> {
    
    Page<Product> findByIsAvailableTrue(Pageable pageable);
    
    Page<Product> findByCategory(Category category, Pageable pageable);
    
    @Query("SELECT p FROM Product p WHERE " +
           "p.isAvailable = true AND " +
           "(LOWER(p.productName) LIKE LOWER(CONCAT('%', :keyword, '%')) OR " +
           "LOWER(p.description) LIKE LOWER(CONCAT('%', :keyword, '%')))")
    Page<Product> searchProducts(String keyword, Pageable pageable);
    
    List<Product> findByCategoryCategoryIdAndIsAvailableTrue(Long categoryId);
    
    List<Product> findTop10ByOrderByCreationDateDesc();
    
    List<Product> findByAdminAdminId(Long adminId);
    
    @Query("SELECT p FROM Product p WHERE p.quantityInStock <= :threshold")
    List<Product> findProductsLowInStock(int threshold);
}
