package com.example.ecodb.Service.impl;

import com.example.ecodb.Service.EmailService;
import jakarta.mail.internet.MimeMessage;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import jakarta.mail.MessagingException;

@Service
public class EmailServiceImpl implements EmailService {

    private final JavaMailSender emailSender;
    private final String fromEmail;
    
    public EmailServiceImpl(
            JavaMailSender emailSender,
            @Value("${spring.mail.username}") String fromEmail) {
        this.emailSender = emailSender;
        this.fromEmail = fromEmail;
    }

    @Async
    @Override
    public void sendSimpleMessage(String to, String subject, String text) {
        SimpleMailMessage message = new SimpleMailMessage();
        message.setFrom(fromEmail);
        message.setTo(to);
        message.setSubject(subject);
        message.setText(text);
        emailSender.send(message);
    }

    @Async
    @Override
    public void sendHtmlMessage(String to, String subject, String htmlBody) {
        try {
            MimeMessage message = emailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");
            helper.setFrom(fromEmail);
            helper.setTo(to);
            helper.setSubject(subject);
            helper.setText(htmlBody, true);
            emailSender.send(message);
        } catch (MessagingException e) {
            throw new RuntimeException("Failed to send HTML email", e);
        }
    }

    @Override
    public void sendOrderConfirmationEmail(String to, Long orderId, String customerName) {
        String subject = "Order Confirmation - #" + orderId;
        String htmlBody = """
            <!DOCTYPE html>
            <html>
            <head>
                <style>
                    body { font-family: Arial, sans-serif; line-height: 1.6; }
                    .container { width: 100%; max-width: 600px; margin: 0 auto; }
                    .header { background-color: #4CAF50; color: white; padding: 20px; text-align: center; }
                    .content { padding: 20px; }
                    .footer { background-color: #f1f1f1; padding: 10px; text-align: center; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>Order Confirmation</h1>
                    </div>
                    <div class="content">
                        <p>Dear %s,</p>
                        <p>Thank you for your order! We're pleased to confirm that we have received your order #%d.</p>
                        <p>Your order is now being processed and will be shipped soon. You will receive another email with tracking information once your order ships.</p>
                        <p>You can view your order status and details by logging into your account.</p>
                        <p>If you have any questions about your order, please don't hesitate to contact our customer service team.</p>
                        <p>Best regards,<br>The E-Commerce Team</p>
                    </div>
                    <div class="footer">
                        <p>&copy; 2023 E-Commerce Store. All rights reserved.</p>
                    </div>
                </div>
            </body>
            </html>
            """.formatted(customerName, orderId);
        
        sendHtmlMessage(to, subject, htmlBody);
    }

    @Override
    public void sendOrderStatusUpdateEmail(String to, Long orderId, String newStatus, String customerName) {
        String subject = "Order Status Update - #" + orderId;
        
        // Customize message based on status
        String statusSpecificMessage;
        switch (newStatus) {
            case "Processing":
                statusSpecificMessage = "We are currently processing your order and preparing it for shipment.";
                break;
            case "Shipped":
                statusSpecificMessage = "Your order has been shipped! You can track your package using the tracking information in your account.";
                break;
            case "Delivered":
                statusSpecificMessage = "Your order has been delivered. We hope you enjoy your purchase!";
                break;
            default:
                statusSpecificMessage = "Your order status has been updated.";
                break;
        }
        
        String htmlBody = """
            <!DOCTYPE html>
            <html>
            <head>
                <style>
                    body { font-family: Arial, sans-serif; line-height: 1.6; }
                    .container { width: 100%; max-width: 600px; margin: 0 auto; }
                    .header { background-color: #2196F3; color: white; padding: 20px; text-align: center; }
                    .content { padding: 20px; }
                    .status { font-weight: bold; color: #2196F3; }
                    .footer { background-color: #f1f1f1; padding: 10px; text-align: center; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>Order Status Update</h1>
                    </div>
                    <div class="content">
                        <p>Dear %s,</p>
                        <p>The status of your order #%d has been updated to <span class="status">%s</span>.</p>
                        <p>%s</p>
                        <p>You can view your order details and tracking information by logging into your account.</p>
                        <p>If you have any questions about your order, please contact our customer service team.</p>
                        <p>Thank you for shopping with us!</p>
                        <p>Best regards,<br>The E-Commerce Team</p>
                    </div>
                    <div class="footer">
                        <p>&copy; 2023 E-Commerce Store. All rights reserved.</p>
                    </div>
                </div>
            </body>
            </html>
            """.formatted(customerName, orderId, newStatus, statusSpecificMessage);
        
        sendHtmlMessage(to, subject, htmlBody);
    }

    @Override
    public void sendOrderCancellationEmail(String to, Long orderId, String customerName) {
        String subject = "Order Cancellation - #" + orderId;
        String htmlBody = """
            <!DOCTYPE html>
            <html>
            <head>
                <style>
                    body { font-family: Arial, sans-serif; line-height: 1.6; }
                    .container { width: 100%; max-width: 600px; margin: 0 auto; }
                    .header { background-color: #F44336; color: white; padding: 20px; text-align: center; }
                    .content { padding: 20px; }
                    .footer { background-color: #f1f1f1; padding: 10px; text-align: center; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>Order Cancellation</h1>
                    </div>
                    <div class="content">
                        <p>Dear %s,</p>
                        <p>Your order #%d has been cancelled as requested.</p>
                        <p>If you paid for this order, a refund will be processed according to our refund policy.</p>
                        <p>If you have any questions or would like to place a new order, please don't hesitate to contact our customer service team.</p>
                        <p>We hope to serve you again soon!</p>
                        <p>Best regards,<br>The E-Commerce Team</p>
                    </div>
                    <div class="footer">
                        <p>&copy; 2023 E-Commerce Store. All rights reserved.</p>
                    </div>
                </div>
            </body>
            </html>
            """.formatted(customerName, orderId);
        
        sendHtmlMessage(to, subject, htmlBody);
    }
}
