package com.example.ecodb.dto.response;

import com.example.ecodb.Model.Category;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class CategoryResponse {
    private Long categoryId;
    private String categoryName;
    private int productCount;

    public static CategoryResponse fromEntity(Category category) {
        return CategoryResponse.builder()
                .categoryId(category.getCategoryId())
                .categoryName(category.getCategoryName())
                .productCount(category.getProducts() != null ? category.getProducts().size() : 0)
                .build();
    }
}
