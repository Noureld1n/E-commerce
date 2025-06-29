package com.example.ecodb.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class JwtResponse {
    private String tokenType;
    private String accessToken;
    private Long id;
    private String firstName;
    private String lastName;
    private String email;
    private String role;
}
