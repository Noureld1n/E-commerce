package com.example.ecodb.Service;

import com.example.ecodb.dto.request.ProductRequest;
import com.example.ecodb.dto.response.ApiResponse;
import com.example.ecodb.dto.response.ProductResponse;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

public interface ProductService {
    
    ProductResponse createProduct(ProductRequest productRequest);
    
    ProductResponse getProductById(Long id);
    
    Page<ProductResponse> getAllProducts(Pageable pageable);
    
    Page<ProductResponse> getProductsByCategory(Long categoryId, Pageable pageable);
    
    Page<ProductResponse> searchProducts(String keyword, Pageable pageable);
    
    List<ProductResponse> getLatestProducts(int count);
    
    List<ProductResponse> getProductsLowInStock(int threshold);
    
    List<ProductResponse> getProductsByAdmin(Long adminId);
    
    ProductResponse updateProduct(Long id, ProductRequest productRequest);
    
    ApiResponse deleteProduct(Long id);
    
    ProductResponse addProductImage(Long productId, MultipartFile imageFile, Boolean isMain);
    
    ProductResponse addProductImageByUrl(Long productId, String imageUrl, Boolean isMain);
      ApiResponse deleteProductImage(Long imageId);
    
    ApiResponse deleteProductImageByUrl(Long productId, String imageUrl);
    
    ApiResponse setMainProductImage(Long imageId);
}
