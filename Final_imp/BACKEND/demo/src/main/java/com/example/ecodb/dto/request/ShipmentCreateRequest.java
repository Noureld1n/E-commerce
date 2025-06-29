package com.example.ecodb.dto.request;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;

import java.time.LocalDateTime;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class ShipmentCreateRequest {
    
    @NotNull(message = "Order ID is required")
    private Long orderId;
    
    @Size(max = 100, message = "Carrier name cannot exceed 100 characters")
    private String carrier;
    
    @Size(max = 50, message = "Tracking number cannot exceed 50 characters")
    private String trackingNumber;
    
    @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME)
    private LocalDateTime expectedTime;
}
