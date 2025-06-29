package com.example.ecodb.Service.impl;

import com.example.ecodb.Model.User;
import com.example.ecodb.Repository.UserRepository;
import com.example.ecodb.Service.UserService;
import com.example.ecodb.dto.request.RegisterRequest;
import com.example.ecodb.dto.request.ProfileUpdateRequest;
import com.example.ecodb.dto.response.ApiResponse;
import com.example.ecodb.dto.response.UserResponse;
import com.example.ecodb.exception.BadRequestException;
import com.example.ecodb.exception.ResourceNotFoundException;
import com.example.ecodb.exception.UnauthorizedException;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class UserServiceImpl implements UserService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    @Override
    public UserResponse getUserById(Long id) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("User", "id", id));
        
        // Check if current user has permission to access this user's data
        checkPermission(user);
        
        return UserResponse.fromEntity(user);
    }

    @Override
    public List<UserResponse> getAllUsers() {
        // Only admin can get all users
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (!authentication.getAuthorities().stream()
                .anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN"))) {
            throw new UnauthorizedException("Only admin can access all users");
        }
        
        return userRepository.findAll().stream()
                .map(UserResponse::fromEntity)
                .collect(Collectors.toList());
    }

    @Override
    public UserResponse updateUser(Long id, RegisterRequest registerRequest) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("User", "id", id));
        
        // Check if current user has permission to update this user
        checkPermission(user);

        // Check if email is already in use by another user
        if (!user.getEmail().equals(registerRequest.getEmail()) &&
                userRepository.existsByEmail(registerRequest.getEmail())) {
            throw new BadRequestException("Email is already in use");
        }

        // Check if phone is already in use by another user
        if (!user.getPhone().equals(registerRequest.getPhone()) &&
                userRepository.existsByPhone(registerRequest.getPhone())) {
            throw new BadRequestException("Phone number is already in use");
        }

        // Update user fields
        user.setFirstName(registerRequest.getFirstName());
        user.setLastName(registerRequest.getLastName());
        user.setEmail(registerRequest.getEmail());
        user.setPhone(registerRequest.getPhone());
        
        // Update password if provided
        if (registerRequest.getPassword() != null && !registerRequest.getPassword().isEmpty()) {
            user.setPassword(passwordEncoder.encode(registerRequest.getPassword()));
        }

        // Save updated user
        User updatedUser = userRepository.save(user);
        
        return UserResponse.fromEntity(updatedUser);
    }

    @Override
    public ApiResponse deleteUser(Long id) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("User", "id", id));
        
        // Check if current user has permission to delete this user
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (!authentication.getAuthorities().stream()
                .anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN")) && 
                !authentication.getName().equals(user.getEmail())) {
            throw new UnauthorizedException("You don't have permission to delete this user");
        }
        
        // Delete user
        userRepository.delete(user);
        
        return new ApiResponse(true, "User deleted successfully");    }
    
    @Override
    public UserResponse getCurrentUserProfile() {
        // Get current authentication
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        
        if (authentication == null || !authentication.isAuthenticated()) {
            throw new UnauthorizedException("User not authenticated");
        }

        // Get user from database
        User user = userRepository.findByEmail(authentication.getName())
                .orElseThrow(() -> new ResourceNotFoundException("User", "email", authentication.getName()));

        return UserResponse.fromEntity(user);
    }    @Override
    public UserResponse updateCurrentUserProfile(ProfileUpdateRequest profileUpdateRequest) {
        // Get current authentication
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        
        if (authentication == null || !authentication.isAuthenticated()) {
            throw new UnauthorizedException("User not authenticated");
        }

        // Get current user from database
        User user = userRepository.findByEmail(authentication.getName())
                .orElseThrow(() -> new ResourceNotFoundException("User", "email", authentication.getName()));

        // Check if email is already in use by another user
        if (!user.getEmail().equals(profileUpdateRequest.getEmail()) &&
                userRepository.existsByEmail(profileUpdateRequest.getEmail())) {
            throw new BadRequestException("Email is already in use");
        }

        // Check if phone is already in use by another user
        if (!user.getPhone().equals(profileUpdateRequest.getPhone()) &&
                userRepository.existsByPhone(profileUpdateRequest.getPhone())) {
            throw new BadRequestException("Phone number is already in use");
        }        // Update user fields
        user.setFirstName(profileUpdateRequest.getFirstName());
        user.setLastName(profileUpdateRequest.getLastName());
        user.setEmail(profileUpdateRequest.getEmail());
        user.setPhone(profileUpdateRequest.getPhone());
        user.setImage(profileUpdateRequest.getImage());
        
        // Update password if provided
        if (profileUpdateRequest.getPassword() != null && !profileUpdateRequest.getPassword().isEmpty()) {
            // Validate current password if provided
            if (profileUpdateRequest.getCurrentPassword() != null && !profileUpdateRequest.getCurrentPassword().isEmpty()) {
                if (!passwordEncoder.matches(profileUpdateRequest.getCurrentPassword(), user.getPassword())) {
                    throw new BadRequestException("Current password is incorrect");
                }
            }
            user.setPassword(passwordEncoder.encode(profileUpdateRequest.getPassword()));
        }

        // Save updated user
        User updatedUser = userRepository.save(user);
        
        return UserResponse.fromEntity(updatedUser);
    }
    
    // Helper method to check if current user has permission to access/modify user data
    private void checkPermission(User user) {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        boolean isAdmin = authentication.getAuthorities().stream()
                .anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN"));
        boolean isSameUser = authentication.getName().equals(user.getEmail());
        
        if (!isAdmin && !isSameUser) {
            throw new UnauthorizedException("You don't have permission to access this user's data");
        }
    }
}
