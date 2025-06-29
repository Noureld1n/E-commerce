package com.example.ecodb.Controller;

import com.example.ecodb.Service.CreditCardService;
import com.example.ecodb.dto.request.CreditCardRequest;
import com.example.ecodb.dto.response.ApiResponse;
import com.example.ecodb.dto.response.CreditCardResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/credit-cards")
@RequiredArgsConstructor
public class CreditCardController {

    private final CreditCardService creditCardService;

    @GetMapping
    public ResponseEntity<List<CreditCardResponse>> getCurrentUserCreditCards() {
        return ResponseEntity.ok(creditCardService.getCurrentUserCreditCards());
    }

    @GetMapping("/{creditCardId}")
    public ResponseEntity<CreditCardResponse> getCreditCardById(@PathVariable Long creditCardId) {
        return ResponseEntity.ok(creditCardService.getCreditCardById(creditCardId));
    }

    @PostMapping
    public ResponseEntity<CreditCardResponse> createCreditCard(@Valid @RequestBody CreditCardRequest creditCardRequest) {
        return new ResponseEntity<>(creditCardService.createCreditCard(creditCardRequest), HttpStatus.CREATED);
    }

    @DeleteMapping("/{creditCardId}")
    public ResponseEntity<ApiResponse> deleteCreditCard(@PathVariable Long creditCardId) {
        return ResponseEntity.ok(creditCardService.deleteCreditCard(creditCardId));
    }

    @PutMapping("/{creditCardId}/default")
    public ResponseEntity<CreditCardResponse> setDefaultCreditCard(@PathVariable Long creditCardId) {
        return ResponseEntity.ok(creditCardService.setDefaultCreditCard(creditCardId));
    }
}
