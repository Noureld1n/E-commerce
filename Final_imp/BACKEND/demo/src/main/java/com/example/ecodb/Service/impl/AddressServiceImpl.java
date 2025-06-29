package com.example.ecodb.Service.impl;

import com.example.ecodb.Model.Address;
import com.example.ecodb.Model.Customer;
import com.example.ecodb.Model.User;
import com.example.ecodb.Repository.AddressRepository;
import com.example.ecodb.Repository.CustomerRepository;
import com.example.ecodb.Repository.UserRepository;
import com.example.ecodb.Service.AddressService;
import com.example.ecodb.dto.request.AddressRequest;
import com.example.ecodb.dto.response.AddressResponse;
import com.example.ecodb.dto.response.ApiResponse;
import com.example.ecodb.exception.ResourceNotFoundException;
import com.example.ecodb.exception.UnauthorizedException;
import lombok.Builder;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class AddressServiceImpl implements AddressService {

    private final AddressRepository addressRepository;
    private final UserRepository userRepository;
    private final CustomerRepository customerRepository;

    @Override
    public List<AddressResponse> getCurrentUserAddresses() {
        Customer customer = getCurrentCustomer();
        List<Address> addresses = addressRepository.findByCustomer(customer);
        return addresses.stream()
                .map(AddressResponse::fromEntity)
                .collect(Collectors.toList());
    }

    @Override
    public AddressResponse getAddressById(Long addressId) {
        Customer customer = getCurrentCustomer();
        Address address = addressRepository.findByCustomerCustomerIdAndAddressId(customer.getCustomerId(), addressId)
                .orElseThrow(() -> new ResourceNotFoundException("Address", "id", addressId));
        return AddressResponse.fromEntity(address);
    }

    @Override
    @Transactional
    public AddressResponse createAddress(AddressRequest addressRequest) {
        Customer customer = getCurrentCustomer();
        
        // If this address is set as default, unset any existing default
        if (Boolean.TRUE.equals(addressRequest.getIsDefault())) {
            addressRepository.findByCustomerAndIsDefaultTrue(customer)
                    .ifPresent(existingDefault -> {
                        existingDefault.setIsDefault(false);
                        addressRepository.save(existingDefault);
                    });
        }
        
        // Create new address
        Address address = Address.builder()
                .street(addressRequest.getStreet())
                .city(addressRequest.getCity())
                .state(addressRequest.getState())
                .zipcode(addressRequest.getZipcode())
                .addressType(addressRequest.getAddressType())
                .isDefault(addressRequest.getIsDefault())
                .customer(customer)
                .build();
        
        // Save address
        Address savedAddress = addressRepository.save(address);
        
        return AddressResponse.fromEntity(savedAddress);
    }

    @Override
    @Transactional
    public AddressResponse updateAddress(Long addressId, AddressRequest addressRequest) {
        Customer customer = getCurrentCustomer();
        
        // Find address
        Address address = addressRepository.findByCustomerCustomerIdAndAddressId(customer.getCustomerId(), addressId)
                .orElseThrow(() -> new ResourceNotFoundException("Address", "id", addressId));
        
        // If this address is being set as default, unset any existing default
        if (Boolean.TRUE.equals(addressRequest.getIsDefault()) && !Boolean.TRUE.equals(address.getIsDefault())) {
            addressRepository.findByCustomerAndIsDefaultTrue(customer)
                    .ifPresent(existingDefault -> {
                        existingDefault.setIsDefault(false);
                        addressRepository.save(existingDefault);
                    });
        }
        
        // Update address
        address.setStreet(addressRequest.getStreet());
        address.setCity(addressRequest.getCity());
        address.setState(addressRequest.getState());
        address.setZipcode(addressRequest.getZipcode());
        address.setAddressType(addressRequest.getAddressType());
        address.setIsDefault(addressRequest.getIsDefault());
        
        // Save updated address
        Address updatedAddress = addressRepository.save(address);
        
        return AddressResponse.fromEntity(updatedAddress);
    }

    @Override
    @Transactional
    public ApiResponse deleteAddress(Long addressId) {
        Customer customer = getCurrentCustomer();
        
        // Find address
        Address address = addressRepository.findByCustomerCustomerIdAndAddressId(customer.getCustomerId(), addressId)
                .orElseThrow(() -> new ResourceNotFoundException("Address", "id", addressId));
        
        // Delete address
        addressRepository.delete(address);
        
        return new ApiResponse(true, "Address deleted successfully");
    }

    @Override
    @Transactional
    public AddressResponse setDefaultAddress(Long addressId) {
        Customer customer = getCurrentCustomer();
        
        // Find address
        Address address = addressRepository.findByCustomerCustomerIdAndAddressId(customer.getCustomerId(), addressId)
                .orElseThrow(() -> new ResourceNotFoundException("Address", "id", addressId));
        
        // Unset any existing default
        addressRepository.findByCustomerAndIsDefaultTrue(customer)
                .ifPresent(existingDefault -> {
                    existingDefault.setIsDefault(false);
                    addressRepository.save(existingDefault);
                });
        
        // Set as default
        address.setIsDefault(true);
        Address updatedAddress = addressRepository.save(address);
        
        return AddressResponse.fromEntity(updatedAddress);
    }
    
    // Helper method to get current customer
    private Customer getCurrentCustomer() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        User user = userRepository.findByEmail(authentication.getName())
                .orElseThrow(() -> new UnauthorizedException("User not found"));
        
        Customer customer = customerRepository.findByUserEmail(user.getEmail());
        if (customer == null) {
            throw new UnauthorizedException("Only customers can manage addresses");
        }
        
        return customer;
    }
}
