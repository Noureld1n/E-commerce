package com.example.ecodb.Service.impl;

import com.example.ecodb.Model.Category;
import com.example.ecodb.Repository.CategoryRepository;
import com.example.ecodb.Service.CategoryService;
import com.example.ecodb.dto.request.CategoryRequest;
import com.example.ecodb.dto.response.ApiResponse;
import com.example.ecodb.dto.response.CategoryResponse;
import com.example.ecodb.exception.BadRequestException;
import com.example.ecodb.exception.ResourceNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class CategoryServiceImpl implements CategoryService {

    private final CategoryRepository categoryRepository;

    @Override
    public CategoryResponse createCategory(CategoryRequest categoryRequest) {
        // Check if category with the same name already exists
        if (categoryRepository.existsByCategoryName(categoryRequest.getCategoryName())) {
            throw new BadRequestException("Category with name '" + categoryRequest.getCategoryName() + "' already exists");
        }
        
        // Create and save new category
        Category category = Category.builder()
                .categoryName(categoryRequest.getCategoryName())
                .build();
        
        Category savedCategory = categoryRepository.save(category);
        
        return CategoryResponse.fromEntity(savedCategory);
    }

    @Override
    public CategoryResponse getCategoryById(Long id) {
        Category category = categoryRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Category", "id", id));
        
        return CategoryResponse.fromEntity(category);
    }

    @Override
    public List<CategoryResponse> getAllCategories() {
        return categoryRepository.findAll().stream()
                .map(CategoryResponse::fromEntity)
                .collect(Collectors.toList());
    }

    @Override
    public CategoryResponse updateCategory(Long id, CategoryRequest categoryRequest) {
        Category category = categoryRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Category", "id", id));
        
        // Check if another category with the same name already exists
        if (!category.getCategoryName().equals(categoryRequest.getCategoryName()) && 
                categoryRepository.existsByCategoryName(categoryRequest.getCategoryName())) {
            throw new BadRequestException("Category with name '" + categoryRequest.getCategoryName() + "' already exists");
        }
        
        // Update category
        category.setCategoryName(categoryRequest.getCategoryName());
        
        Category updatedCategory = categoryRepository.save(category);
        
        return CategoryResponse.fromEntity(updatedCategory);
    }

    @Override
    public ApiResponse deleteCategory(Long id) {
        Category category = categoryRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Category", "id", id));
        
        // Check if category has products
        if (category.getProducts() != null && !category.getProducts().isEmpty()) {
            throw new BadRequestException("Cannot delete category with associated products");
        }
        
        // Delete category
        categoryRepository.delete(category);
        
        return new ApiResponse(true, "Category deleted successfully");
    }
}
