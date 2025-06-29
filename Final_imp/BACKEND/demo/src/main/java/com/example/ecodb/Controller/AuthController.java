package com.example.ecodb.Controller;

import com.example.ecodb.Service.AuthService;
import com.example.ecodb.dto.request.LoginRequest;
import com.example.ecodb.dto.request.RegisterRequest;
import com.example.ecodb.dto.response.ApiResponse;
import com.example.ecodb.dto.response.JwtResponse;
import com.example.ecodb.dto.response.UserResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;
    private final PasswordEncoder passwordEncoder;

    @PostMapping("/register")
    public ResponseEntity<UserResponse> registerUser(@Valid @RequestBody RegisterRequest registerRequest) {
        return new ResponseEntity<>(authService.registerUser(registerRequest), HttpStatus.CREATED);
    }

    @PostMapping("/login")
    public ResponseEntity<JwtResponse> loginUser(@Valid @RequestBody LoginRequest loginRequest) {
        return ResponseEntity.ok(authService.loginUser(loginRequest));
    }

    @GetMapping("/me")
    public ResponseEntity<UserResponse> getCurrentUser() {
        return ResponseEntity.ok(authService.getCurrentUser());
    }

    @GetMapping("/health")
    public ResponseEntity<ApiResponse> healthCheck() {
        return ResponseEntity.ok(new ApiResponse(true, "Authentication service is up and running"));
    }    @GetMapping("/fix-admin-password")
    public ResponseEntity<ApiResponse> fixAdminPassword() {
        try {
            // This will create a new hash for "admin123" 
            String newHash = passwordEncoder.encode("admin123");
            return ResponseEntity.ok(new ApiResponse(true, "New hash for admin123: " + newHash + " - Use this SQL: UPDATE sys_user SET password = '" + newHash + "' WHERE email = 'admin@ecodb.com';"));
        } catch (Exception e) {
            return ResponseEntity.ok(new ApiResponse(false, "Error: " + e.getMessage()));
        }
    }    @PostMapping("/register-admin")
    public ResponseEntity<UserResponse> registerAdmin(@Valid @RequestBody RegisterRequest registerRequest) {
        UserResponse adminResponse = authService.registerAdmin(registerRequest);
        return new ResponseEntity<>(adminResponse, HttpStatus.CREATED);
    }
}
