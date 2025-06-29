package com.example.ecodb.Service;

import com.example.ecodb.dto.request.CreditCardRequest;
import com.example.ecodb.dto.response.ApiResponse;
import com.example.ecodb.dto.response.CreditCardResponse;

import java.util.List;

public interface CreditCardService {
    
    List<CreditCardResponse> getCurrentUserCreditCards();
    
    CreditCardResponse getCreditCardById(Long creditCardId);
    
    CreditCardResponse createCreditCard(CreditCardRequest creditCardRequest);
    
    ApiResponse deleteCreditCard(Long creditCardId);
    
    CreditCardResponse setDefaultCreditCard(Long creditCardId);
}
