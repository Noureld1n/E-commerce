package com.example.ecodb.dto.response;

import com.example.ecodb.Model.Address;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class AddressResponse {
    private Long addressId;
    private String street;
    private String city;
    private String state;
    private String zipcode;
    private String addressType;
    private Boolean isDefault;
    private Long customerId;

    public static AddressResponse fromEntity(Address address) {
        return AddressResponse.builder()
                .addressId(address.getAddressId())
                .street(address.getStreet())
                .city(address.getCity())
                .state(address.getState())
                .zipcode(address.getZipcode())
                .addressType(address.getAddressType().name())
                .isDefault(address.getDefault())
                .customerId(address.getCustomer().getCustomerId())
                .build();
    }
}
