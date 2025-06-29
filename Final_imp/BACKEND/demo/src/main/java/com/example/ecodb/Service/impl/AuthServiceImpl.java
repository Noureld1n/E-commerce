package com.example.ecodb.Service.impl;

import com.example.ecodb.Model.Admin;
import com.example.ecodb.Model.Customer;
import com.example.ecodb.Model.ShoppingCart;
import com.example.ecodb.Model.User;
import com.example.ecodb.Repository.AdminRepository;
import com.example.ecodb.Repository.CustomerRepository;
import com.example.ecodb.Repository.ShoppingCartRepository;
import com.example.ecodb.Repository.UserRepository;
import com.example.ecodb.Service.AuthService;
import com.example.ecodb.dto.request.LoginRequest;
import com.example.ecodb.dto.request.RegisterRequest;
import com.example.ecodb.dto.response.JwtResponse;
import com.example.ecodb.dto.response.UserResponse;
import com.example.ecodb.exception.BadRequestException;
import com.example.ecodb.exception.ResourceNotFoundException;
import com.example.ecodb.exception.UnauthorizedException;
import com.example.ecodb.security.JwtTokenProvider;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AuthServiceImpl implements AuthService {

    private final UserRepository userRepository;
    private final CustomerRepository customerRepository;
    private final ShoppingCartRepository shoppingCartRepository;
    private final AdminRepository adminRepository;
    private final PasswordEncoder passwordEncoder;
    private final AuthenticationManager authenticationManager;
    private final JwtTokenProvider jwtTokenProvider;
    
    public AuthServiceImpl(
            UserRepository userRepository,
            CustomerRepository customerRepository,
            ShoppingCartRepository shoppingCartRepository,
            AdminRepository adminRepository,
            PasswordEncoder passwordEncoder,
            AuthenticationManager authenticationManager,
            JwtTokenProvider jwtTokenProvider) {
        this.userRepository = userRepository;
        this.customerRepository = customerRepository;
        this.shoppingCartRepository = shoppingCartRepository;
        this.adminRepository = adminRepository;
        this.passwordEncoder = passwordEncoder;
        this.authenticationManager = authenticationManager;
        this.jwtTokenProvider = jwtTokenProvider;
    }    @Override
    @Transactional
    public UserResponse registerUser(RegisterRequest registerRequest) {
        // Check if email already exists
        if (userRepository.existsByEmail(registerRequest.getEmail())) {
            throw new BadRequestException("Email is already in use");
        }

        // Check if phone number already exists
        if (userRepository.existsByPhone(registerRequest.getPhone())) {
            throw new BadRequestException("Phone number is already in use");
        }

        // Create user entity
        User user = User.builder()
                .firstName(registerRequest.getFirstName())
                .lastName(registerRequest.getLastName())
                .email(registerRequest.getEmail())
                .password(passwordEncoder.encode(registerRequest.getPassword()))
                .phone(registerRequest.getPhone())
                .role(User.Role.ROLE_Customer)
                .build();

        // Save user first
        User savedUser = userRepository.save(user);        // Create customer entity - @MapsId will automatically set customerId from user.id
        Customer customer = new Customer();
        customer.setUser(savedUser);
        customer.setPoints(0.0);

        // Save customer
        Customer savedCustomer = customerRepository.save(customer);

        // Create shopping cart for the customer
        ShoppingCart shoppingCart = ShoppingCart.builder()
                .customer(savedCustomer)
                .cartStatus(ShoppingCart.CartStatus.Active)
                .build();

        // Save shopping cart
        shoppingCartRepository.save(shoppingCart);

        // Return user response
        return UserResponse.fromEntity(savedUser);
    }

    @Override
    public JwtResponse loginUser(LoginRequest loginRequest) {
        // Authenticate user
        Authentication authentication = authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(
                        loginRequest.getEmail(),
                        loginRequest.getPassword()
                )
        );

        // Set authentication in security context
        SecurityContextHolder.getContext().setAuthentication(authentication);

        // Generate JWT token
        String jwt = jwtTokenProvider.generateToken(authentication);

        // Get user details
        UserDetails userDetails = (UserDetails) authentication.getPrincipal();

        // Get user from database
        User user = userRepository.findByEmail(userDetails.getUsername())
                .orElseThrow(() -> new ResourceNotFoundException("User", "email", userDetails.getUsername()));

        // Return JWT response
        return JwtResponse.builder()
                .tokenType("Bearer")
                .accessToken(jwt)
                .id(user.getId())
                .firstName(user.getFirstName())
                .lastName(user.getLastName())
                .email(user.getEmail())
                .role(user.getRole().name())
                .build();
    }    @Override
    public UserResponse getCurrentUser() {
        // Get current authentication
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        
        if (authentication == null || !authentication.isAuthenticated()) {
            throw new UnauthorizedException("User not authenticated");
        }

        // Get user from database
        User user = userRepository.findByEmail(authentication.getName())
                .orElseThrow(() -> new ResourceNotFoundException("User", "email", authentication.getName()));

        // Return user response
        return UserResponse.fromEntity(user);
    }

    @Override
    @Transactional
    public UserResponse registerAdmin(RegisterRequest registerRequest) {
        // Check if email already exists
        if (userRepository.existsByEmail(registerRequest.getEmail())) {
            throw new BadRequestException("Email is already in use");
        }

        // Check if phone number already exists
        if (userRepository.existsByPhone(registerRequest.getPhone())) {
            throw new BadRequestException("Phone number is already in use");
        }

        // Create admin user entity
        User user = User.builder()
                .firstName(registerRequest.getFirstName())
                .lastName(registerRequest.getLastName())
                .email(registerRequest.getEmail())
                .password(passwordEncoder.encode(registerRequest.getPassword()))
                .phone(registerRequest.getPhone())
                .role(User.Role.ROLE_ADMIN)
                .build();

        // Save user first
        User savedUser = userRepository.save(user);

        // Create admin entity - @MapsId will automatically set adminId from user.id
        Admin admin = Admin.builder()
                .user(savedUser)
                .isActive(true)
                .build();

        // Save admin
        adminRepository.save(admin);

        // Return user response
        return UserResponse.fromEntity(savedUser);
    }
}
