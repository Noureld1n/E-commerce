package com.example.ecodb.dto.request;

import jakarta.validation.constraints.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDateTime;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class CreditCardRequest {

    @NotBlank(message = "Account number is required")
    @Pattern(regexp = "^[0-9]{16}$", message = "Account number must be 16 digits")
    private String accountNumber;
    
    @NotBlank(message = "Card provider is required")
    @Size(min = 2, max = 50, message = "Provider name must be between 2 and 50 characters")
    private String provider;
    
    // MM/YYYY format
    @NotBlank(message = "Expire date is required")
    @Pattern(regexp = "^(0[1-9]|1[0-2])/20[2-9][0-9]$", message = "Expire date must be in MM/YYYY format")
    private String expireDate;
    
    @NotBlank(message = "CVV is required")
    @Pattern(regexp = "^[0-9]{3,4}$", message = "CVV must be 3 or 4 digits")
    private String cvv;
    
    private Boolean isDefault = false;
}
