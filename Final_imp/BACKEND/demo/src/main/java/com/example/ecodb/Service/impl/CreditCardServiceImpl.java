package com.example.ecodb.Service.impl;

import com.example.ecodb.Model.CreditCard;
import com.example.ecodb.Model.User;
import com.example.ecodb.Repository.CreditCardRepository;
import com.example.ecodb.Repository.UserRepository;
import com.example.ecodb.Service.CreditCardService;
import com.example.ecodb.dto.request.CreditCardRequest;
import com.example.ecodb.dto.response.ApiResponse;
import com.example.ecodb.dto.response.CreditCardResponse;
import com.example.ecodb.exception.ResourceNotFoundException;
import com.example.ecodb.exception.UnauthorizedException;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class CreditCardServiceImpl implements CreditCardService {

    private final CreditCardRepository creditCardRepository;
    private final UserRepository userRepository;

    @Override
    public List<CreditCardResponse> getCurrentUserCreditCards() {
        User user = getCurrentUser();
        List<CreditCard> creditCards = creditCardRepository.findByUser(user);
        
        return creditCards.stream()
                .map(CreditCardResponse::fromEntity)
                .collect(Collectors.toList());
    }

    @Override
    public CreditCardResponse getCreditCardById(Long creditCardId) {
        User user = getCurrentUser();
        CreditCard creditCard = creditCardRepository.findById(creditCardId)
                .orElseThrow(() -> new ResourceNotFoundException("Credit card", "id", creditCardId));
        
        // Verify that the credit card belongs to the authenticated user
        if (!creditCard.getUser().getId().equals(user.getId())) {
            throw new UnauthorizedException("You do not have permission to access this credit card");
        }
        
        return CreditCardResponse.fromEntity(creditCard);
    }

    @Override
    @Transactional
    public CreditCardResponse createCreditCard(CreditCardRequest creditCardRequest) {
        User user = getCurrentUser();
        
        // If this card is set as default, unset any existing default
        if (Boolean.TRUE.equals(creditCardRequest.getIsDefault())) {
            creditCardRepository.findByUserAndIsDefaultTrue(user)
                    .ifPresent(existingDefault -> {
                        existingDefault.setIsDefault(false);
                        creditCardRepository.save(existingDefault);
                    });
        }
          // Parse expire date to LocalDateTime
        String[] parts = creditCardRequest.getExpireDate().split("/");
        int month = Integer.parseInt(parts[0]);
        int year = Integer.parseInt(parts[1]);
        LocalDateTime expireDate = LocalDateTime.of(year, month, 1, 0, 0).plusMonths(1).minusDays(1);
        
        // Create new credit card
        CreditCard creditCard = CreditCard.builder()
                .accountNumber(creditCardRequest.getAccountNumber()) // In a real app, this would be encrypted
                .provider(creditCardRequest.getProvider())
                .expireDate(expireDate)
                .isDefault(creditCardRequest.getIsDefault())
                .user(user)
                .build();
        
        // Save credit card
        CreditCard savedCreditCard = creditCardRepository.save(creditCard);
        
        return CreditCardResponse.fromEntity(savedCreditCard);
    }

    @Override
    @Transactional
    public ApiResponse deleteCreditCard(Long creditCardId) {
        User user = getCurrentUser();
        CreditCard creditCard = creditCardRepository.findById(creditCardId)
                .orElseThrow(() -> new ResourceNotFoundException("Credit card", "id", creditCardId));
        
        // Verify that the credit card belongs to the authenticated user
        if (!creditCard.getUser().getId().equals(user.getId())) {
            throw new UnauthorizedException("You do not have permission to delete this credit card");
        }
        
        // Delete credit card
        creditCardRepository.delete(creditCard);
        
        return new ApiResponse(true, "Credit card deleted successfully");
    }

    @Override
    @Transactional
    public CreditCardResponse setDefaultCreditCard(Long creditCardId) {
        User user = getCurrentUser();
        CreditCard creditCard = creditCardRepository.findById(creditCardId)
                .orElseThrow(() -> new ResourceNotFoundException("Credit card", "id", creditCardId));
        
        // Verify that the credit card belongs to the authenticated user
        if (!creditCard.getUser().getId().equals(user.getId())) {
            throw new UnauthorizedException("You do not have permission to update this credit card");
        }
        
        // Unset any existing default
        creditCardRepository.findByUserAndIsDefaultTrue(user)
                .ifPresent(existingDefault -> {
                    existingDefault.setIsDefault(false);
                    creditCardRepository.save(existingDefault);
                });
        
        // Set as default
        creditCard.setIsDefault(true);
        CreditCard updatedCreditCard = creditCardRepository.save(creditCard);
        
        return CreditCardResponse.fromEntity(updatedCreditCard);
    }
    
    // Helper method to get current user
    private User getCurrentUser() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        return userRepository.findByEmail(authentication.getName())
                .orElseThrow(() -> new UnauthorizedException("User not found"));
    }
    
    // Helper method to determine card type
    private String determineCardType(String cardNumber) {
        // Simplified version, in a real app this would be more robust
        if (cardNumber.startsWith("4")) {
            return "Visa";
        } else if (cardNumber.startsWith("5")) {
            return "Mastercard";
        } else if (cardNumber.startsWith("34") || cardNumber.startsWith("37")) {
            return "American Express";
        } else if (cardNumber.startsWith("6")) {
            return "Discover";
        } else {
            return "Unknown";
        }
    }
}
