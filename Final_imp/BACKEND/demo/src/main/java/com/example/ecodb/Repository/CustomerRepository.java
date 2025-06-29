package com.example.ecodb.Repository;

import com.example.ecodb.Model.Customer;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface CustomerRepository extends JpaRepository<Customer, Long> {
    
    Customer findByUserEmail(String email);
}
