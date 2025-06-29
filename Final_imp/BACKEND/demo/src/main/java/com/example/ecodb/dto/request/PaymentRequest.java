package com.example.ecodb.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class PaymentRequest {
    
    private String paymentMethod;
    
    // For saved credit card payments
    private Long creditCardId;
    
    // If new card is used
    private String accountNumber;
    
    private String provider;
      private String expireDate; // Format MM/YYYY
    
    @Pattern(regexp = "\\d{3,4}", message = "Invalid CVV format")
    private String cvv;
    
    @Builder.Default
    private Boolean saveCard = false;
    
    // Validation method to check if credit card information is complete when required
    public boolean isValidForCreditCard() {
        if ("CREDIT_CARD".equals(paymentMethod)) {
            // Either creditCardId should be provided (for saved card) or all new card details
            return (creditCardId != null) || 
                   (accountNumber != null && provider != null && expireDate != null && cvv != null);
        }
        return true; // For other payment methods, credit card info is not required
    }
      // Check if this is a cash on delivery payment
    public boolean isCashOnDelivery() {
        try {
            return "CASH_ON_DELIVERY".equals(paymentMethod);
        } catch (Exception e) {
            return false;
        }
    }
}
