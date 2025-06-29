package com.example.ecodb.dto.response;

import com.example.ecodb.Model.CreditCard;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.format.DateTimeFormatter;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class CreditCardResponse {
    private Long cardId;
    private String accountNumber; // Last 4 digits only
    private String provider;
    private String expireDate;
    private Boolean isDefault;
    private Long userId;

    public static CreditCardResponse fromEntity(CreditCard creditCard) {
        // Only show last 4 digits of account number for security
        String maskedAccountNumber = "xxxx-xxxx-xxxx-" +
            creditCard.getAccountNumber().substring(creditCard.getAccountNumber().length() - 4);
            
        // Format expiry date
        String formattedExpireDate = creditCard.getExpireDate().format(DateTimeFormatter.ofPattern("MM/yyyy"));

        return CreditCardResponse.builder()
                .cardId(creditCard.getCardId())                .accountNumber(maskedAccountNumber)
                .provider(creditCard.getProvider())
                .expireDate(formattedExpireDate)
                .isDefault(creditCard.getIsDefault())
                .userId(creditCard.getUser().getId())
                .build();
    }
}
