package com.example.ecodb.Repository;

import com.example.ecodb.Model.WishList;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface WishListRepository extends JpaRepository<WishList, Long> {
    
    List<WishList> findByCustomerCustomerId(Long customerId);
    
    Optional<WishList> findByCustomerCustomerIdAndProductProductId(Long customerId, Long productId);
    
    boolean existsByCustomerCustomerIdAndProductProductId(Long customerId, Long productId);
    
    void deleteByCustomerCustomerIdAndProductProductId(Long customerId, Long productId);
}
