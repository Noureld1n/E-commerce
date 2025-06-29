package com.example.ecodb.dto.request;

import com.example.ecodb.Model.Order;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class OrderStatusUpdateRequest {
    
    @NotNull(message = "Order status is required")
    private Order.OrderStatus orderStatus;
}
