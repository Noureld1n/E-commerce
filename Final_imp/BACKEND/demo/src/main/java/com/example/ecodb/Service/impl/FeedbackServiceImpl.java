package com.example.ecodb.Service.impl;

import com.example.ecodb.Model.Customer;
import com.example.ecodb.Model.Feedback;
import com.example.ecodb.Repository.CustomerRepository;
import com.example.ecodb.Repository.FeedbackRepository;
import com.example.ecodb.Service.FeedbackService;
import com.example.ecodb.dto.request.FeedbackRequest;
import com.example.ecodb.dto.response.FeedbackResponse;
import com.example.ecodb.exception.ResourceNotFoundException;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
public class FeedbackServiceImpl implements FeedbackService {

    private final FeedbackRepository feedbackRepository;
    private final CustomerRepository customerRepository;

    @Autowired
    public FeedbackServiceImpl(FeedbackRepository feedbackRepository, CustomerRepository customerRepository) {
        this.feedbackRepository = feedbackRepository;
        this.customerRepository = customerRepository;
    }    @Override
    @Transactional
    public FeedbackResponse createFeedback(Long customerId, FeedbackRequest request) {
        Customer customer = customerRepository.findById(customerId)
                .orElseThrow(() -> new ResourceNotFoundException("Customer", "id", customerId));

        Feedback feedback = Feedback.builder()
                .customer(customer)
                .feedbackText(request.getFeedbackText())
                .isSatisfied(request.getIsSatisfied())
                .build();

        Feedback savedFeedback = feedbackRepository.save(feedback);
        return mapToFeedbackResponse(savedFeedback);
    }    @Override
    public List<FeedbackResponse> getFeedbacksByCustomerId(Long customerId) {
        // Verify customer exists
        if (!customerRepository.existsById(customerId)) {
            throw new ResourceNotFoundException("Customer", "id", customerId);
        }

        return feedbackRepository.findByCustomer_CustomerId(customerId)
                .stream()
                .map(this::mapToFeedbackResponse)
                .collect(Collectors.toList());
    }    @Override
    public FeedbackResponse getFeedbackById(Long feedbackId) {
        Feedback feedback = feedbackRepository.findById(feedbackId)
                .orElseThrow(() -> new ResourceNotFoundException("Feedback", "id", feedbackId));

        return mapToFeedbackResponse(feedback);
    }

    @Override
    @Transactional
    public void deleteFeedback(Long feedbackId) {
        if (!feedbackRepository.existsById(feedbackId)) {
            throw new ResourceNotFoundException("Feedback", "id", feedbackId);
        }
        feedbackRepository.deleteById(feedbackId);
    }

    private FeedbackResponse mapToFeedbackResponse(Feedback feedback) {
        String customerName = feedback.getCustomer().getUser().getFirstName() + " " + 
                             feedback.getCustomer().getUser().getLastName();
        
        return FeedbackResponse.builder()
                .feedbackId(feedback.getFeedbackId())
                .customerId(feedback.getCustomer().getCustomerId())
                .customerName(customerName)
                .feedbackText(feedback.getFeedbackText())
                .feedbackDate(feedback.getFeedbackDate())
                .isSatisfied(feedback.getSatisfied())
                .build();
    }
}
