package com.example.ecodb.Repository;

import com.example.ecodb.Model.CartItem;
import com.example.ecodb.Model.CartItemId;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface CartItemRepository extends JpaRepository<CartItem, CartItemId> {
    
    List<CartItem> findByCartCartId(Long cartId);
    
    Optional<CartItem> findByCartCartIdAndProductProductId(Long cartId, Long productId);
    
    void deleteByCartCartIdAndProductProductId(Long cartId, Long productId);
}
