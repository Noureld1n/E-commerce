package com.example.ecodb.Service;

import com.example.ecodb.dto.request.CategoryRequest;
import com.example.ecodb.dto.response.ApiResponse;
import com.example.ecodb.dto.response.CategoryResponse;

import java.util.List;

public interface CategoryService {
    
    CategoryResponse createCategory(CategoryRequest categoryRequest);
    
    CategoryResponse getCategoryById(Long id);
    
    List<CategoryResponse> getAllCategories();
    
    CategoryResponse updateCategory(Long id, CategoryRequest categoryRequest);
    
    ApiResponse deleteCategory(Long id);
}
