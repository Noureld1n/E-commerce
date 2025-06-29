package com.example.ecodb.Service;

import com.example.ecodb.dto.request.LoginRequest;
import com.example.ecodb.dto.request.RegisterRequest;
import com.example.ecodb.dto.response.JwtResponse;
import com.example.ecodb.dto.response.UserResponse;

public interface AuthService {
    
    UserResponse registerUser(RegisterRequest registerRequest);
    
    JwtResponse loginUser(LoginRequest loginRequest);
    
    UserResponse getCurrentUser();

    UserResponse registerAdmin(RegisterRequest registerRequest);
}
