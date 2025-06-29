package com.example.ecodb.Repository;

import com.example.ecodb.Model.OrderItem;
import com.example.ecodb.Model.OrderItemId;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface OrderItemRepository extends JpaRepository<OrderItem, OrderItemId> {
    
    List<OrderItem> findByOrderOrderId(Long orderId);
    
    List<OrderItem> findByProductProductId(Long productId);
}
