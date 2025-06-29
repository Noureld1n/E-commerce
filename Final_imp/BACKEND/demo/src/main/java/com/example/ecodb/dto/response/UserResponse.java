package com.example.ecodb.dto.response;

import com.example.ecodb.Model.User;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class UserResponse {
    private Long id;
    private String firstName;
    private String lastName;    private String email;
    private String phone;
    private String image;
    private LocalDateTime registerDate;
    private String role;    public static UserResponse fromEntity(User user) {
        return UserResponse.builder()
                .id(user.getId())
                .firstName(user.getFirstName())
                .lastName(user.getLastName())
                .email(user.getEmail())
                .phone(user.getPhone())
                .image(user.getImage())
                .registerDate(user.getRegisterDate())
                .role(user.getRole().name())
                .build();
    }
}
