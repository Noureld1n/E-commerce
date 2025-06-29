package com.example.ecodb.Service.impl;

import com.example.ecodb.Model.*;
import com.example.ecodb.Repository.*;
import com.example.ecodb.Service.FileService;
import com.example.ecodb.Service.ProductService;
import com.example.ecodb.dto.request.ProductRequest;
import com.example.ecodb.dto.response.ApiResponse;
import com.example.ecodb.dto.response.ProductResponse;
import com.example.ecodb.exception.ResourceNotFoundException;
import com.example.ecodb.exception.UnauthorizedException;
import com.example.ecodb.util.AppConstants;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ProductServiceImpl implements ProductService {

    private final ProductRepository productRepository;
    private final CategoryRepository categoryRepository;
    private final AdminRepository adminRepository;
    private final UserRepository userRepository;
    private final ProductImageRepository productImageRepository;
    private final ProductReviewRepository productReviewRepository;
    private final FileService fileService;

    @Override
    @Transactional
    public ProductResponse createProduct(ProductRequest productRequest) {
        // Get current authenticated user
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        User user = userRepository.findByEmail(authentication.getName())
                .orElseThrow(() -> new UnauthorizedException("User not found"));

        // Check if user is admin
        Admin admin = adminRepository.findByUserEmail(user.getEmail());
        if (admin == null) {
            throw new UnauthorizedException("Only admins can create products");
        }

        // Find category
        Category category = categoryRepository.findById(productRequest.getCategoryId())
                .orElseThrow(() -> new ResourceNotFoundException("Category", "id", productRequest.getCategoryId()));        // Create product
        Product product = Product.builder()
                .productName(productRequest.getProductName())
                .price(productRequest.getPrice())
                .isAvailable(productRequest.getIsAvailable())
                .description(productRequest.getDescription())
                .details(productRequest.getDetails())
                .quantityInStock(productRequest.getQuantityInStock())
                .size(productRequest.getSize())
                .color(productRequest.getColor())
                .admin(admin)
                .category(category)
                .build();

        // Save product
        Product savedProduct = productRepository.save(product);

        // Return response
        ProductResponse response = ProductResponse.fromEntity(savedProduct);
        response.setAverageRating(calculateAverageRating(savedProduct.getProductId()));
        return response;
    }

    @Override
    public ProductResponse getProductById(Long id) {
        Product product = productRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Product", "id", id));

        ProductResponse response = ProductResponse.fromEntity(product);
        response.setAverageRating(calculateAverageRating(id));
        return response;
    }

    @Override
    public Page<ProductResponse> getAllProducts(Pageable pageable) {
        return productRepository.findByIsAvailableTrue(pageable)
                .map(product -> {
                    ProductResponse response = ProductResponse.fromEntity(product);
                    response.setAverageRating(calculateAverageRating(product.getProductId()));
                    return response;
                });
    }

    @Override
    public Page<ProductResponse> getProductsByCategory(Long categoryId, Pageable pageable) {
        // Check if category exists
        categoryRepository.findById(categoryId)
                .orElseThrow(() -> new ResourceNotFoundException("Category", "id", categoryId));

        return productRepository.findByCategory(
                Category.builder().categoryId(categoryId).build(), 
                pageable
            ).map(product -> {
                ProductResponse response = ProductResponse.fromEntity(product);
                response.setAverageRating(calculateAverageRating(product.getProductId()));
                return response;
            });
    }

    @Override
    public Page<ProductResponse> searchProducts(String keyword, Pageable pageable) {
        return productRepository.searchProducts(keyword, pageable)
                .map(product -> {
                    ProductResponse response = ProductResponse.fromEntity(product);
                    response.setAverageRating(calculateAverageRating(product.getProductId()));
                    return response;
                });
    }

    @Override
    public List<ProductResponse> getLatestProducts(int count) {
        return productRepository.findTop10ByOrderByCreationDateDesc().stream()
                .map(product -> {
                    ProductResponse response = ProductResponse.fromEntity(product);
                    response.setAverageRating(calculateAverageRating(product.getProductId()));
                    return response;
                })
                .limit(count)
                .collect(Collectors.toList());
    }

    @Override
    public List<ProductResponse> getProductsLowInStock(int threshold) {
        return productRepository.findProductsLowInStock(threshold).stream()
                .map(product -> {
                    ProductResponse response = ProductResponse.fromEntity(product);
                    response.setAverageRating(calculateAverageRating(product.getProductId()));
                    return response;
                })
                .collect(Collectors.toList());
    }

    @Override
    public List<ProductResponse> getProductsByAdmin(Long adminId) {
        // Check if admin exists
        adminRepository.findById(adminId)
                .orElseThrow(() -> new ResourceNotFoundException("Admin", "id", adminId));

        return productRepository.findByAdminAdminId(adminId).stream()
                .map(product -> {
                    ProductResponse response = ProductResponse.fromEntity(product);
                    response.setAverageRating(calculateAverageRating(product.getProductId()));
                    return response;
                })
                .collect(Collectors.toList());
    }

    @Override
    @Transactional
    public ProductResponse updateProduct(Long id, ProductRequest productRequest) {
        // Get current authenticated user
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        User user = userRepository.findByEmail(authentication.getName())
                .orElseThrow(() -> new UnauthorizedException("User not found"));

        // Check if user is admin
        Admin admin = adminRepository.findByUserEmail(user.getEmail());
        if (admin == null) {
            throw new UnauthorizedException("Only admins can update products");
        }

        // Find product
        Product product = productRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Product", "id", id));

        // Check if admin is the owner of the product or is super admin with ROLE_ADMIN
        if (!product.getAdmin().getAdminId().equals(admin.getAdminId()) &&
                !authentication.getAuthorities().stream().anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN"))) {
            throw new UnauthorizedException("You can only update your own products");
        }

        // Find category
        Category category = categoryRepository.findById(productRequest.getCategoryId())
                .orElseThrow(() -> new ResourceNotFoundException("Category", "id", productRequest.getCategoryId()));        // Update product
        product.setProductName(productRequest.getProductName());
        product.setPrice(productRequest.getPrice());
        product.setIsAvailable(productRequest.getIsAvailable());
        product.setDescription(productRequest.getDescription());
        product.setDetails(productRequest.getDetails());
        product.setQuantityInStock(productRequest.getQuantityInStock());
        product.setSize(productRequest.getSize());
        product.setColor(productRequest.getColor());
        product.setCategory(category);

        // Save product
        Product updatedProduct = productRepository.save(product);

        // Return response
        ProductResponse response = ProductResponse.fromEntity(updatedProduct);
        response.setAverageRating(calculateAverageRating(updatedProduct.getProductId()));
        return response;
    }

    @Override
    @Transactional
    public ApiResponse deleteProduct(Long id) {
        // Get current authenticated user
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        User user = userRepository.findByEmail(authentication.getName())
                .orElseThrow(() -> new UnauthorizedException("User not found"));

        // Check if user is admin
        Admin admin = adminRepository.findByUserEmail(user.getEmail());
        if (admin == null) {
            throw new UnauthorizedException("Only admins can delete products");
        }

        // Find product
        Product product = productRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Product", "id", id));

        // Check if admin is the owner of the product or is super admin with ROLE_ADMIN
        if (!product.getAdmin().getAdminId().equals(admin.getAdminId()) &&
                !authentication.getAuthorities().stream().anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN"))) {
            throw new UnauthorizedException("You can only delete your own products");
        }

        // Delete product images
        for (ProductImage image : product.getImages()) {
            fileService.deleteFile(image.getImageUrl());
        }

        // Delete product
        productRepository.delete(product);

        return new ApiResponse(true, "Product deleted successfully");
    }

    @Override
    @Transactional
    public ProductResponse addProductImage(Long productId, MultipartFile imageFile, Boolean isMain) {
        // Get current authenticated user
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        User user = userRepository.findByEmail(authentication.getName())
                .orElseThrow(() -> new UnauthorizedException("User not found"));

        // Check if user is admin
        Admin admin = adminRepository.findByUserEmail(user.getEmail());
        if (admin == null) {
            throw new UnauthorizedException("Only admins can add product images");
        }

        // Find product
        Product product = productRepository.findById(productId)
                .orElseThrow(() -> new ResourceNotFoundException("Product", "id", productId));

        // Check if admin is the owner of the product or is super admin with ROLE_ADMIN
        if (!product.getAdmin().getAdminId().equals(admin.getAdminId()) &&
                !authentication.getAuthorities().stream().anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN"))) {
            throw new UnauthorizedException("You can only add images to your own products");
        }

        // Upload file
        String imageUrl = fileService.uploadFile(imageFile, AppConstants.PRODUCT_IMAGES_DIR);

        // If this is the main image, set all other images as not main
        if (isMain) {
            productImageRepository.findByProductProductIdAndIsMainTrue(productId)
                    .ifPresent(image -> {
                        image.setIsMain(false);
                        productImageRepository.save(image);
                    });
        }

        // Create product image
        ProductImage productImage = ProductImage.builder()
                .imageUrl(imageUrl)
                .isMain(isMain)
                .product(product)
                .build();

        // Save product image
        productImageRepository.save(productImage);

        // Return updated product
        ProductResponse response = ProductResponse.fromEntity(product);
        response.setAverageRating(calculateAverageRating(productId));
        return response;
    }

    @Override
    @Transactional
    public ProductResponse addProductImageByUrl(Long productId, String imageUrl, Boolean isMain) {
        // Get current authenticated user
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        User user = userRepository.findByEmail(authentication.getName())
                .orElseThrow(() -> new UnauthorizedException("User not found"));

        // Check if user is admin
        Admin admin = adminRepository.findByUserEmail(user.getEmail());
        if (admin == null) {
            throw new UnauthorizedException("Only admins can add product images");
        }

        // Find product
        Product product = productRepository.findById(productId)
                .orElseThrow(() -> new ResourceNotFoundException("Product", "id", productId));

        // Check if admin is the owner of the product or is super admin with ROLE_ADMIN
        if (!product.getAdmin().getAdminId().equals(admin.getAdminId()) &&
                !authentication.getAuthorities().stream().anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN"))) {
            throw new UnauthorizedException("You can only add images to your own products");
        }

        // If this is the main image, set all other images as not main
        if (isMain) {
            productImageRepository.findByProductProductIdAndIsMainTrue(productId)
                    .ifPresent(image -> {
                        image.setIsMain(false);
                        productImageRepository.save(image);
                    });
        }

        // Create product image with URL
        ProductImage productImage = ProductImage.builder()
                .imageUrl(imageUrl)
                .isMain(isMain)
                .product(product)
                .build();

        // Save product image
        productImageRepository.save(productImage);

        // Return updated product
        ProductResponse response = ProductResponse.fromEntity(product);
        response.setAverageRating(calculateAverageRating(productId));
        return response;
    }

    @Override
    @Transactional
    public ApiResponse deleteProductImage(Long imageId) {
        // Get current authenticated user
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        User user = userRepository.findByEmail(authentication.getName())
                .orElseThrow(() -> new UnauthorizedException("User not found"));

        // Check if user is admin
        Admin admin = adminRepository.findByUserEmail(user.getEmail());
        if (admin == null) {
            throw new UnauthorizedException("Only admins can delete product images");
        }

        // Find product image
        ProductImage image = productImageRepository.findById(imageId)
                .orElseThrow(() -> new ResourceNotFoundException("ProductImage", "id", imageId));

        // Check if admin is the owner of the product or is super admin with ROLE_ADMIN
        if (!image.getProduct().getAdmin().getAdminId().equals(admin.getAdminId()) &&
                !authentication.getAuthorities().stream().anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN"))) {
            throw new UnauthorizedException("You can only delete images of your own products");
        }

        // Delete image file
        fileService.deleteFile(image.getImageUrl());

        // Delete product image
        productImageRepository.delete(image);

        return new ApiResponse(true, "Product image deleted successfully");
    }

    @Override
    @Transactional
    public ApiResponse setMainProductImage(Long imageId) {
        // Get current authenticated user
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        User user = userRepository.findByEmail(authentication.getName())
                .orElseThrow(() -> new UnauthorizedException("User not found"));

        // Check if user is admin
        Admin admin = adminRepository.findByUserEmail(user.getEmail());
        if (admin == null) {
            throw new UnauthorizedException("Only admins can set main product images");
        }

        // Find product image
        ProductImage image = productImageRepository.findById(imageId)
                .orElseThrow(() -> new ResourceNotFoundException("ProductImage", "id", imageId));

        // Check if admin is the owner of the product or is super admin with ROLE_ADMIN
        if (!image.getProduct().getAdmin().getAdminId().equals(admin.getAdminId()) &&
                !authentication.getAuthorities().stream().anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN"))) {
            throw new UnauthorizedException("You can only set main images for your own products");
        }

        // Set all other images as not main
        productImageRepository.findByProductProductIdAndIsMainTrue(image.getProduct().getProductId())
                .ifPresent(mainImage -> {
                    mainImage.setIsMain(false);
                    productImageRepository.save(mainImage);
                });

        // Set new main image
        image.setIsMain(true);
        productImageRepository.save(image);        return new ApiResponse(true, "Main product image set successfully");
    }

    @Override
    @Transactional
    public ApiResponse deleteProductImageByUrl(Long productId, String imageUrl) {
        // Get current authenticated user
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        User user = userRepository.findByEmail(authentication.getName())
                .orElseThrow(() -> new UnauthorizedException("User not found"));

        // Check if user is admin
        Admin admin = adminRepository.findByUserEmail(user.getEmail());
        if (admin == null) {
            throw new UnauthorizedException("Only admins can delete product images");
        }

        // Find product to verify ownership
        Product product = productRepository.findById(productId)
                .orElseThrow(() -> new ResourceNotFoundException("Product", "id", productId));

        // Check if admin is the owner of the product or is super admin with ROLE_ADMIN
        if (!product.getAdmin().getAdminId().equals(admin.getAdminId()) &&
                !authentication.getAuthorities().stream().anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN"))) {
            throw new UnauthorizedException("You can only delete images of your own products");
        }

        // Find product image by URL
        ProductImage image = productImageRepository.findByProductProductIdAndImageUrl(productId, imageUrl)
                .orElseThrow(() -> new ResourceNotFoundException("ProductImage", "imageUrl", imageUrl));

        // Delete image file (only if it's a file upload, not an external URL)
        if (!imageUrl.startsWith("http://") && !imageUrl.startsWith("https://")) {
            fileService.deleteFile(image.getImageUrl());
        }

        // Delete product image
        productImageRepository.delete(image);

        return new ApiResponse(true, "Product image deleted successfully");
    }

    // Helper method to calculate average rating
    private Double calculateAverageRating(Long productId) {
        return productReviewRepository.findAverageRatingByProductId(productId);
    }
}
