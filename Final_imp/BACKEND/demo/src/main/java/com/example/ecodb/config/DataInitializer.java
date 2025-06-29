package com.example.ecodb.config;

import com.example.ecodb.Model.*;
import com.example.ecodb.Repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;

@Component
@RequiredArgsConstructor
@org.springframework.boot.autoconfigure.condition.ConditionalOnProperty(
    name = "app.db.initialize", 
    havingValue = "true", 
    matchIfMissing = true)
public class DataInitializer implements CommandLineRunner {

    private final UserRepository userRepository;
    private final CustomerRepository customerRepository;
    private final AdminRepository adminRepository;
    private final CategoryRepository categoryRepository;
    private final ProductRepository productRepository;
    private final PasswordEncoder passwordEncoder;    @Override
    @Transactional
    public void run(String... args) throws Exception {
        // Check if data already exists or skip-init argument is provided
        if (userRepository.count() > 0 || args.length > 0 && "skip-init".equals(args[0])) {
            System.out.println("Skipping database initialization");
            return; // Database has already been initialized or skipping initialization
        }

        try {
            System.out.println("Starting database initialization...");
            initializeUsers();
            List<Category> categories = initializeCategories();
            initializeProducts(categories);
            System.out.println("Database initialization completed successfully");
        } catch (Exception e) {
            System.err.println("Error during database initialization: " + e.getMessage());
            e.printStackTrace();
        }
    }

    private void initializeUsers() {
        // Create admin user
        User adminUser = User.builder()                .firstName("Admin")
                .lastName("User")
                .email("admin@example.com")
                .password(passwordEncoder.encode("admin123"))
                .phone("1234567890")
                .registerDate(LocalDateTime.now())
                .role(User.Role.ROLE_ADMIN)
                .build();
          User savedAdminUser = userRepository.save(adminUser);
        
        Admin admin = new Admin();
        admin.setAdminId(savedAdminUser.getId());
        admin.setUser(savedAdminUser);
        admin.setActive(true);
        
        adminRepository.save(admin);
        
        // Create customer user
        User customerUser = User.builder()
                .firstName("Customer")
                .lastName("User")
                .email("customer@example.com")
                .password(passwordEncoder.encode("customer123"))
                .phone("0987654321")
                .registerDate(LocalDateTime.now())
                .role(User.Role.ROLE_Customer)
                .build();
          User savedCustomerUser = userRepository.save(customerUser);
          Customer customer = new Customer();
        customer.setUser(savedCustomerUser);
        customer.setPoints(0.0);
        
        customerRepository.save(customer);
        
        System.out.println("Users initialized successfully");
    }

    private List<Category> initializeCategories() {
        // Create categories
        List<String> categoryNames = Arrays.asList(
                "Electronics", "Clothing", "Home & Kitchen", "Books", "Sports & Outdoors"
        );
        
        List<Category> categories = new ArrayList<>();
        
        for (String name : categoryNames) {
            Category category = Category.builder()
                    .categoryName(name)
                    .build();
            
            categories.add(categoryRepository.save(category));
        }
        
        System.out.println("Categories initialized successfully");
        return categories;
    }

    private void initializeProducts(List<Category> categories) {
        // Find the admin
        Admin admin = adminRepository.findAll().get(0);
        
        // Sample products for Electronics
        createProduct("Smartphone", 799.99, "High-end smartphone with 5G capabilities",
                "6.5-inch display, 256GB storage, 12MP camera", 100, categories.get(0), admin);
        
        createProduct("Laptop", 1299.99, "Powerful laptop for work and gaming",
                "15.6-inch display, 16GB RAM, 512GB SSD, NVIDIA graphics", 50, categories.get(0), admin);
        
        createProduct("Wireless Earbuds", 129.99, "True wireless earbuds with noise cancellation",
                "Bluetooth 5.0, 8 hour battery life, water resistant", 200, categories.get(0), admin);
        
        // Sample products for Clothing
        createProduct("T-Shirt", 24.99, "Comfortable cotton t-shirt",
                "100% cotton, machine washable, multiple colors available", 300, categories.get(1), admin);
        
        createProduct("Jeans", 59.99, "Classic fit denim jeans",
                "Durable denim material, straight leg, five pockets", 150, categories.get(1), admin);
        
        // Sample products for Home & Kitchen
        createProduct("Coffee Maker", 89.99, "Programmable coffee maker",
                "12-cup capacity, auto shut-off, brew strength control", 75, categories.get(2), admin);
        
        createProduct("Cookware Set", 199.99, "Non-stick cookware set",
                "10-piece set, dishwasher safe, suitable for all stovetops", 40, categories.get(2), admin);
        
        // Sample products for Books
        createProduct("Bestselling Novel", 14.99, "Award-winning fiction novel",
                "Hardcover, 400 pages, New York Times Bestseller", 200, categories.get(3), admin);
        
        createProduct("Cookbook", 29.99, "International recipes cookbook",
                "Hardcover, 250 recipes, full-color illustrations", 100, categories.get(3), admin);
        
        // Sample products for Sports & Outdoors
        createProduct("Yoga Mat", 39.99, "Extra thick yoga mat",
                "72 x 24 inches, 1/2 inch thick, non-slip surface", 150, categories.get(4), admin);
        
        createProduct("Tennis Racket", 129.99, "Professional tennis racket",
                "Carbon fiber frame, mid-plus head size, includes cover", 50, categories.get(4), admin);
        
        System.out.println("Products initialized successfully");
    }
    
    private void createProduct(String name, double price, String description, String details,
                               int stock, Category category, Admin admin) {
        Product product = Product.builder()
                .productName(name)
                .price(price)
                .description(description)
                .details(details)
                .quantityInStock(stock)
                .isAvailable(true)
                .creationDate(LocalDateTime.now())
                .category(category)
                .admin(admin)
                .build();
        
        productRepository.save(product);
    }
}
