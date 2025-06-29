package com.example.ecodb.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.PositiveOrZero;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class ProductRequest {

    @NotBlank(message = "Product name is required")
    private String productName;

    @NotNull(message = "Price is required")
    @Positive(message = "Price must be positive")
    private Double price;
    
    @NotNull(message = "Category ID is required")
    private Long categoryId;
    
    private String description;
      private String details;
    
    @PositiveOrZero(message = "Quantity in stock cannot be negative")
    @Builder.Default
    private Integer quantityInStock = 0;
    
    @Builder.Default
    private Boolean isAvailable = true;
    
    private String size;
    
    private String color;
}
