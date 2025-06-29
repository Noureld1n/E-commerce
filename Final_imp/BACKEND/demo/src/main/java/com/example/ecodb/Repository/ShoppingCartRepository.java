package com.example.ecodb.Repository;

import com.example.ecodb.Model.ShoppingCart;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface ShoppingCartRepository extends JpaRepository<ShoppingCart, Long> {
    
    Optional<ShoppingCart> findByCustomerCustomerId(Long customerId);
    
    Optional<ShoppingCart> findByCustomerUserEmail(String email);
}
