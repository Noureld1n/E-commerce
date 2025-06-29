package com.example.ecodb.Service;

import com.example.ecodb.Model.Order;
import com.example.ecodb.dto.request.FrontendOrderRequest;
import com.example.ecodb.dto.request.OrderRequest;
import com.example.ecodb.dto.request.OrderStatusUpdateRequest;
import com.example.ecodb.dto.response.ApiResponse;
import com.example.ecodb.dto.response.OrderResponse;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.time.LocalDateTime;
import java.util.List;

public interface OrderService {
    
    OrderResponse createOrder(OrderRequest orderRequest);
    
    OrderResponse createOrderFromFrontend(FrontendOrderRequest frontendOrderRequest);
    
    OrderResponse getOrderById(Long orderId);
    
    Page<OrderResponse> getCurrentUserOrders(Pageable pageable);
    
    Page<OrderResponse> getAllOrders(Pageable pageable);
    
    List<OrderResponse> getOrdersByStatus(Order.OrderStatus status);
    
    List<OrderResponse> getOrdersByDateRange(LocalDateTime startDate, LocalDateTime endDate);
    
    OrderResponse updateOrderStatus(Long orderId, OrderStatusUpdateRequest statusUpdateRequest);
    
    ApiResponse cancelOrder(Long orderId);
    
    Double calculateRevenueByDateRange(LocalDateTime startDate, LocalDateTime endDate);
    
    Long countOrdersByDateRange(LocalDateTime startDate, LocalDateTime endDate);
}
