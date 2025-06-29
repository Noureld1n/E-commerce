package com.example.ecodb.Controller;

import com.example.ecodb.Service.ProductService;
import com.example.ecodb.dto.request.ProductRequest;
import com.example.ecodb.dto.response.ApiResponse;
import com.example.ecodb.dto.response.ProductResponse;
import com.example.ecodb.util.AppConstants;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import jakarta.validation.Valid;
import java.util.List;

@RestController
@RequestMapping("/api/products")
@RequiredArgsConstructor
public class ProductController {

    private final ProductService productService;

    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ProductResponse> createProduct(@Valid @RequestBody ProductRequest productRequest) {
        return new ResponseEntity<>(productService.createProduct(productRequest), HttpStatus.CREATED);
    }

    @GetMapping("/{id}")
    public ResponseEntity<ProductResponse> getProductById(@PathVariable Long id) {
        return ResponseEntity.ok(productService.getProductById(id));
    }

    @GetMapping
    public ResponseEntity<Page<ProductResponse>> getAllProducts(
            @RequestParam(defaultValue = AppConstants.DEFAULT_PAGE_NUMBER) int page,
            @RequestParam(defaultValue = AppConstants.DEFAULT_PAGE_SIZE) int size,
            @RequestParam(defaultValue = AppConstants.DEFAULT_SORT_BY) String sortBy,
            @RequestParam(defaultValue = AppConstants.DEFAULT_SORT_DIRECTION) String sortDir) {
        
        Sort sort = sortDir.equalsIgnoreCase("asc") ? 
                Sort.by(sortBy).ascending() : 
                Sort.by(sortBy).descending();
        
        Pageable pageable = PageRequest.of(page, size, sort);
        
        return ResponseEntity.ok(productService.getAllProducts(pageable));
    }

    @GetMapping("/category/{categoryId}")
    public ResponseEntity<Page<ProductResponse>> getProductsByCategory(
            @PathVariable Long categoryId,
            @RequestParam(defaultValue = AppConstants.DEFAULT_PAGE_NUMBER) int page,
            @RequestParam(defaultValue = AppConstants.DEFAULT_PAGE_SIZE) int size,
            @RequestParam(defaultValue = AppConstants.DEFAULT_SORT_BY) String sortBy,
            @RequestParam(defaultValue = AppConstants.DEFAULT_SORT_DIRECTION) String sortDir) {
        
        Sort sort = sortDir.equalsIgnoreCase("asc") ? 
                Sort.by(sortBy).ascending() : 
                Sort.by(sortBy).descending();
        
        Pageable pageable = PageRequest.of(page, size, sort);
        
        return ResponseEntity.ok(productService.getProductsByCategory(categoryId, pageable));
    }

    @GetMapping("/search")
    public ResponseEntity<Page<ProductResponse>> searchProducts(
            @RequestParam String keyword,
            @RequestParam(defaultValue = AppConstants.DEFAULT_PAGE_NUMBER) int page,
            @RequestParam(defaultValue = AppConstants.DEFAULT_PAGE_SIZE) int size,
            @RequestParam(defaultValue = AppConstants.DEFAULT_SORT_BY) String sortBy,
            @RequestParam(defaultValue = AppConstants.DEFAULT_SORT_DIRECTION) String sortDir) {
        
        Sort sort = sortDir.equalsIgnoreCase("asc") ? 
                Sort.by(sortBy).ascending() : 
                Sort.by(sortBy).descending();
        
        Pageable pageable = PageRequest.of(page, size, sort);
        
        return ResponseEntity.ok(productService.searchProducts(keyword, pageable));
    }

    @GetMapping("/latest")
    public ResponseEntity<List<ProductResponse>> getLatestProducts(
            @RequestParam(defaultValue = "10") int count) {
        return ResponseEntity.ok(productService.getLatestProducts(count));
    }

    @GetMapping("/low-in-stock")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<List<ProductResponse>> getProductsLowInStock(
            @RequestParam(defaultValue = "5") int threshold) {
        return ResponseEntity.ok(productService.getProductsLowInStock(threshold));
    }

    @GetMapping("/admin/{adminId}")
    public ResponseEntity<List<ProductResponse>> getProductsByAdmin(@PathVariable Long adminId) {
        return ResponseEntity.ok(productService.getProductsByAdmin(adminId));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ProductResponse> updateProduct(
            @PathVariable Long id,
            @Valid @RequestBody ProductRequest productRequest) {
        return ResponseEntity.ok(productService.updateProduct(id, productRequest));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse> deleteProduct(@PathVariable Long id) {
        return ResponseEntity.ok(productService.deleteProduct(id));
    }    @PostMapping(value = "/{id}/images", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ProductResponse> addProductImage(
            @PathVariable Long id,
            @RequestParam("image") MultipartFile image,
            @RequestParam(defaultValue = "false") Boolean isMain) {
        return ResponseEntity.ok(productService.addProductImage(id, image, isMain));
    }

    @DeleteMapping("/images/{imageId}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse> deleteProductImage(@PathVariable Long imageId) {
        return ResponseEntity.ok(productService.deleteProductImage(imageId));
    }

    // @DeleteMapping("/{id}/images/url")
    // @PreAuthorize("hasRole('ADMIN')")
    // public ResponseEntity<ApiResponse> deleteProductImageByUrl(
    //         @PathVariable Long id,
    //         @RequestParam("imageUrl") String imageUrl) {
    //     return ResponseEntity.ok(productService.deleteProductImageByUrl(id, imageUrl));
    // }

    @PutMapping("/images/{imageId}/main")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse> setMainProductImage(@PathVariable Long imageId) {
        return ResponseEntity.ok(productService.setMainProductImage(imageId));
    }

    // @PostMapping("/{id}/images/url")
    // @PreAuthorize("hasRole('ADMIN')")
    // public ResponseEntity<ProductResponse> addProductImageByUrl(
    //         @PathVariable Long id,
    //         @RequestParam("imageUrl") String imageUrl,
    //         @RequestParam(defaultValue = "false") Boolean isMain) {
    //     return ResponseEntity.ok(productService.addProductImageByUrl(id, imageUrl, isMain));
    // }
}
