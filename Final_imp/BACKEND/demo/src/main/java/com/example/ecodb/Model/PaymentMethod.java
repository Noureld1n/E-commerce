package com.example.ecodb.Model;

public enum PaymentMethod {
    CREDIT_CARD("Credit Card"),
    CASH_ON_DELIVERY("Cash on Delivery");
    
    private final String displayName;
    
    PaymentMethod(String displayName) {
        this.displayName = displayName;
    }
    
    public String getDisplayName() {
        return displayName;
    }
}
