package com.example.ecodb.Service;

import com.example.ecodb.dto.request.RegisterRequest;
import com.example.ecodb.dto.request.ProfileUpdateRequest;
import com.example.ecodb.dto.response.ApiResponse;
import com.example.ecodb.dto.response.UserResponse;

import java.util.List;

public interface UserService {
    
    UserResponse getUserById(Long id);
    
    List<UserResponse> getAllUsers();
    
    UserResponse updateUser(Long id, RegisterRequest registerRequest);
    
    ApiResponse deleteUser(Long id);
    
    UserResponse getCurrentUserProfile();
    
    UserResponse updateCurrentUserProfile(ProfileUpdateRequest profileUpdateRequest);
}
