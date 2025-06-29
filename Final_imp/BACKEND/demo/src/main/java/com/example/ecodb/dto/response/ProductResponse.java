package com.example.ecodb.dto.response;

import com.example.ecodb.Model.Product;
import com.example.ecodb.Model.ProductImage;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class ProductResponse {
    private Long productId;
    private String productName;
    private Double price;
    private Boolean isAvailable;
    private LocalDateTime creationDate;
    private String description;    private String details;
    private Integer quantityInStock;
    private String size;
    private String color;
    private Long categoryId;    private String categoryName;
    private Long adminId;
    private String adminName;
    @Builder.Default
    private List<ProductImageResponse> images = new ArrayList<>();
    private Double averageRating;

    public static ProductResponse fromEntity(Product product) {
        return ProductResponse.builder()
                .productId(product.getProductId())
                .productName(product.getProductName())
                .price(product.getPrice())
                .isAvailable(product.getAvailable())
                .creationDate(product.getCreationDate())                .description(product.getDescription())
                .details(product.getDetails())
                .quantityInStock(product.getQuantityInStock())
                .size(product.getSize())
                .color(product.getColor())
                .categoryId(product.getCategory().getCategoryId())
                .categoryName(product.getCategory().getCategoryName())
                .adminId(product.getAdmin().getAdminId())
                .adminName(product.getAdmin().getUser().getFirstName() + " " + product.getAdmin().getUser().getLastName())
                .images(product.getImages().stream()
                        .map(ProductImageResponse::fromEntity)
                        .collect(Collectors.toList()))
                .build();
    }
    
    @Data
    @Builder
    @AllArgsConstructor
    @NoArgsConstructor
    public static class ProductImageResponse {
        private Long imageId;
        private String imageUrl;
        private Boolean isMain;
        
        public static ProductImageResponse fromEntity(ProductImage image) {
            return ProductImageResponse.builder()
                    .imageId(image.getImageId())
                    .imageUrl(image.getImageUrl())
                    .isMain(image.getIsMain())
                    .build();
        }
    }
}
