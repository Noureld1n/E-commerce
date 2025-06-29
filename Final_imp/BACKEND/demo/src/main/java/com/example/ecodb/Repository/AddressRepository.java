package com.example.ecodb.Repository;

import com.example.ecodb.Model.Address;
import com.example.ecodb.Model.Customer;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface AddressRepository extends JpaRepository<Address, Long> {
    
    List<Address> findByCustomer(Customer customer);
    
    List<Address> findByCustomerUserId(Long userId);
    
    Optional<Address> findByCustomerCustomerIdAndAddressId(Long customerId, Long addressId);
    
    Optional<Address> findByCustomerAndIsDefaultTrue(Customer customer);
}
