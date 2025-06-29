package com.example.ecodb.Service;

/**
 * Service interface for sending email notifications
 */
public interface EmailService {
    
    /**
     * Send a simple text email
     * 
     * @param to recipient email address
     * @param subject email subject
     * @param text email body
     */
    void sendSimpleMessage(String to, String subject, String text);
    
    /**
     * Send an email with HTML content
     * 
     * @param to recipient email address
     * @param subject email subject
     * @param htmlBody email body in HTML format
     */
    void sendHtmlMessage(String to, String subject, String htmlBody);
    
    /**
     * Send order confirmation email
     * 
     * @param to recipient email address
     * @param orderId order ID
     * @param customerName customer's name
     */
    void sendOrderConfirmationEmail(String to, Long orderId, String customerName);
    
    /**
     * Send order status update email
     * 
     * @param to recipient email address
     * @param orderId order ID
     * @param newStatus new order status
     * @param customerName customer's name
     */
    void sendOrderStatusUpdateEmail(String to, Long orderId, String newStatus, String customerName);
    
    /**
     * Send order cancellation email
     * 
     * @param to recipient email address
     * @param orderId order ID
     * @param customerName customer's name
     */
    void sendOrderCancellationEmail(String to, Long orderId, String customerName);
}
