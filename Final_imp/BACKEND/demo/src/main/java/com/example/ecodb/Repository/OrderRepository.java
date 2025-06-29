package com.example.ecodb.Repository;

import com.example.ecodb.Model.Order;
import com.example.ecodb.Model.Customer;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface OrderRepository extends JpaRepository<Order, Long> {
    
    Page<Order> findByCustomerCustomerId(Long customerId, Pageable pageable);
    
    List<Order> findByOrderStatus(Order.OrderStatus status);
    
    List<Order> findByPaymentStatus(Order.PaymentStatus status);
    
    @Query("SELECT o FROM Order o WHERE o.creationDate BETWEEN :startDate AND :endDate")
    List<Order> findOrdersByDateRange(LocalDateTime startDate, LocalDateTime endDate);
    
    @Query("SELECT SUM(o.totalPrice) FROM Order o WHERE o.creationDate BETWEEN :startDate AND :endDate AND o.paymentStatus = 'Completed'")
    Double calculateRevenueByDateRange(LocalDateTime startDate, LocalDateTime endDate);
    
    @Query("SELECT COUNT(o) FROM Order o WHERE o.creationDate BETWEEN :startDate AND :endDate")
    Long countOrdersByDateRange(LocalDateTime startDate, LocalDateTime endDate);
}
