package com.example.ecodb.security;

import com.example.ecodb.Model.Customer;
import com.example.ecodb.Model.User;
import com.example.ecodb.Repository.CustomerRepository;
import com.example.ecodb.Repository.FeedbackRepository;
import com.example.ecodb.Repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;

@Component("feedbackSecurity")
public class FeedbackSecurity {

    private final FeedbackRepository feedbackRepository;
    private final UserRepository userRepository;
    private final CustomerRepository customerRepository;

    @Autowired
    public FeedbackSecurity(FeedbackRepository feedbackRepository, 
                           UserRepository userRepository,
                           CustomerRepository customerRepository) {
        this.feedbackRepository = feedbackRepository;
        this.userRepository = userRepository;
        this.customerRepository = customerRepository;
    }

    public boolean canAccessFeedback(Long feedbackId) {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        
        // Admin can access all feedbacks
        if (authentication.getAuthorities().stream()
                .anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN"))) {
            return true;
        }
        
        // Customer can only access their own feedback
        return feedbackRepository.findById(feedbackId)
                .map(feedback -> hasCustomerId(feedback.getCustomer().getCustomerId()))
                .orElse(false);
    }
      // Check if the current user has the specified customer ID
    public boolean hasCustomerId(Long customerId) {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        
        // Admin can access any customer data
        if (authentication.getAuthorities().stream()
                .anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN"))) {
            return true;
        }
        
        // Get the user by email from the authentication
        User user = userRepository.findByEmail(authentication.getName())
                .orElse(null);
        
        if (user == null) {
            return false;
        }
        
        // Check if the user is associated with the given customer ID
        Customer customer = customerRepository.findById(customerId).orElse(null);
        
        if (customer == null) {
            return false;
        }
        
        return customer.getUser().getId().equals(user.getId());
    }
}
