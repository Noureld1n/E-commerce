package com.example.ecodb.Repository;

import com.example.ecodb.Model.CreditCard;
import com.example.ecodb.Model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface CreditCardRepository extends JpaRepository<CreditCard, Long> {
    
    List<CreditCard> findByUser(User user);
    
    List<CreditCard> findByUserId(Long userId);
    
    Optional<CreditCard> findByUserAndIsDefaultTrue(User user);
}
