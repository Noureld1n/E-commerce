package com.example.ecodb.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class FeedbackResponse {
    private Long feedbackId;
    private Long customerId;
    private String customerName;
    private String feedbackText;
    private LocalDateTime feedbackDate;
    private Boolean isSatisfied;
}
