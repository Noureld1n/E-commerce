package com.example.ecodb.Controller;

import com.example.ecodb.Service.FeedbackService;
import com.example.ecodb.dto.request.FeedbackRequest;
import com.example.ecodb.dto.response.FeedbackResponse;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/feedback")
public class FeedbackController {

    private final FeedbackService feedbackService;

    @Autowired
    public FeedbackController(FeedbackService feedbackService) {
        this.feedbackService = feedbackService;
    }    @PostMapping("/customer/{customerId}")
    @PreAuthorize("hasRole('Customer') and @feedbackSecurity.hasCustomerId(#customerId)")
    public ResponseEntity<FeedbackResponse> createFeedback(
            @PathVariable Long customerId,
            @Valid @RequestBody FeedbackRequest request) {
        FeedbackResponse response = feedbackService.createFeedback(customerId, request);
        return new ResponseEntity<>(response, HttpStatus.CREATED);
    }

    @GetMapping("/customer/{customerId}")
    @PreAuthorize("hasRole('Customer') and @feedbackSecurity.hasCustomerId(#customerId) or hasRole('ADMIN')")
    public ResponseEntity<List<FeedbackResponse>> getFeedbacksByCustomerId(@PathVariable Long customerId) {
        List<FeedbackResponse> feedbacks = feedbackService.getFeedbacksByCustomerId(customerId);
        return ResponseEntity.ok(feedbacks);
    }

    @GetMapping("/{feedbackId}")
    @PreAuthorize("hasRole('ADMIN') or @feedbackSecurity.canAccessFeedback(#feedbackId)")
    public ResponseEntity<FeedbackResponse> getFeedbackById(@PathVariable Long feedbackId) {
        FeedbackResponse feedback = feedbackService.getFeedbackById(feedbackId);
        return ResponseEntity.ok(feedback);
    }

    @DeleteMapping("/{feedbackId}")
    @PreAuthorize("hasRole('ADMIN') or @feedbackSecurity.canAccessFeedback(#feedbackId)")
    public ResponseEntity<Void> deleteFeedback(@PathVariable Long feedbackId) {
        feedbackService.deleteFeedback(feedbackId);
        return ResponseEntity.noContent().build();
    }
}
