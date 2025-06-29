package com.example.ecodb.Service;

import com.example.ecodb.dto.request.FeedbackRequest;
import com.example.ecodb.dto.response.FeedbackResponse;

import java.util.List;

public interface FeedbackService {
    FeedbackResponse createFeedback(Long customerId, FeedbackRequest request);
    List<FeedbackResponse> getFeedbacksByCustomerId(Long customerId);
    FeedbackResponse getFeedbackById(Long feedbackId);
    void deleteFeedback(Long feedbackId);
}
