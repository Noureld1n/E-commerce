package com.example.ecodb.Service;

import com.example.ecodb.dto.request.AddressRequest;
import com.example.ecodb.dto.response.AddressResponse;
import com.example.ecodb.dto.response.ApiResponse;

import java.util.List;

public interface AddressService {
    
    List<AddressResponse> getCurrentUserAddresses();
    
    AddressResponse getAddressById(Long addressId);
    
    AddressResponse createAddress(AddressRequest addressRequest);
    
    AddressResponse updateAddress(Long addressId, AddressRequest addressRequest);
    
    ApiResponse deleteAddress(Long addressId);
    
    AddressResponse setDefaultAddress(Long addressId);
}
