package com.example.ecodb.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class FeedbackRequest {
    
    @NotBlank(message = "Feedback text cannot be blank")
    @Size(max = 1000, message = "Feedback text cannot exceed 1000 characters")
    private String feedbackText;
    
    @NotNull(message = "Satisfaction status cannot be null")
    private Boolean isSatisfied;
}
