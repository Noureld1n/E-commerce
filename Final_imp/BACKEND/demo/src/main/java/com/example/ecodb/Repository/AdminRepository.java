package com.example.ecodb.Repository;

import com.example.ecodb.Model.Admin;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface AdminRepository extends JpaRepository<Admin, Long> {
    
    List<Admin> findByIsActiveTrue();
    
    Admin findByUserEmail(String email);
}
