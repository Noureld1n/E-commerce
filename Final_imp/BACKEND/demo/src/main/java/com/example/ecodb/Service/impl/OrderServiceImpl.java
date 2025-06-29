package com.example.ecodb.Service.impl;

import com.example.ecodb.Model.*;
import com.example.ecodb.Repository.*;
import com.example.ecodb.Service.EmailService;
import com.example.ecodb.Service.OrderService;
import com.example.ecodb.dto.request.FrontendOrderRequest;
import com.example.ecodb.dto.request.OrderRequest;
import com.example.ecodb.dto.request.OrderStatusUpdateRequest;
import com.example.ecodb.dto.request.PaymentRequest;
import com.example.ecodb.dto.response.ApiResponse;
import com.example.ecodb.dto.response.OrderResponse;
import com.example.ecodb.exception.BadRequestException;
import com.example.ecodb.exception.ResourceNotFoundException;
import com.example.ecodb.exception.UnauthorizedException;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class OrderServiceImpl implements OrderService {    private final OrderRepository orderRepository;
    private final OrderItemRepository orderItemRepository;
    private final UserRepository userRepository;
    private final CustomerRepository customerRepository;
    private final AddressRepository addressRepository;
    private final ShoppingCartRepository shoppingCartRepository;
    @SuppressWarnings("unused") // May be used in future implementations
    private final CartItemRepository cartItemRepository;
    private final ProductRepository productRepository;
    private final ShipmentRepository shipmentRepository;    
    private final CreditCardRepository creditCardRepository;
    private final EmailService emailService;

    @Override
    @Transactional
    public OrderResponse createOrder(OrderRequest orderRequest) {
        // Get current authenticated user
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        User user = userRepository.findByEmail(authentication.getName())
                .orElseThrow(() -> new UnauthorizedException("User not found"));

        // Check if user is a customer
        Customer customer = customerRepository.findByUserEmail(user.getEmail());
        if (customer == null) {
            throw new UnauthorizedException("Only customers can place orders");
        }

        // Get shopping cart
        ShoppingCart cart = shoppingCartRepository.findByCustomerCustomerId(customer.getCustomerId())
                .orElseThrow(() -> new ResourceNotFoundException("Shopping cart", "customer id", customer.getCustomerId()));

        // Check if cart has items
        if (cart.getCartItems().isEmpty()) {
            throw new BadRequestException("Cannot create order with an empty cart");
        }

        // Get shipping and billing addresses
        Address shippingAddress = addressRepository.findById(orderRequest.getShippingAddressId())
                .orElseThrow(() -> new ResourceNotFoundException("Shipping address", "id", orderRequest.getShippingAddressId()));
        
        Address billingAddress = addressRepository.findById(orderRequest.getBillingAddressId())
                .orElseThrow(() -> new ResourceNotFoundException("Billing address", "id", orderRequest.getBillingAddressId()));

        // Verify that addresses belong to the customer
        if (!shippingAddress.getCustomer().getCustomerId().equals(customer.getCustomerId())) {
            throw new UnauthorizedException("Shipping address does not belong to the current customer");
        }
        if (!billingAddress.getCustomer().getCustomerId().equals(customer.getCustomerId())) {
            throw new UnauthorizedException("Billing address does not belong to the current customer");
        }

        // Calculate total price
        double totalPrice = cart.getCartItems().stream()
                .mapToDouble(item -> item.getProduct().getPrice() * item.getQuantity())
                .sum();

        // Create order
        Order order = Order.builder()
                .totalPrice(totalPrice)
                .orderStatus(Order.OrderStatus.Pending)
                .paymentStatus(Order.PaymentStatus.Pending)
                .customer(customer)
                .shippingAddress(shippingAddress)
                .billingAddress(billingAddress)
                .build();
        
        Order savedOrder = orderRepository.save(order);

        // Create order items from cart items
        for (CartItem cartItem : cart.getCartItems()) {
            OrderItem orderItem = OrderItem.builder()
                    .id(new OrderItemId(savedOrder.getOrderId(), cartItem.getProduct().getProductId()))
                    .order(savedOrder)
                    .product(cartItem.getProduct())
                    .quantity(cartItem.getQuantity())
                    .priceAtPurchase(cartItem.getProduct().getPrice())
                    .build();
            
            orderItemRepository.save(orderItem);
              // Update product stock
            Product product = cartItem.getProduct();
            product.setQuantityInStock(product.getQuantityInStock() - cartItem.getQuantity());
            productRepository.save(product);
        }
        
        // Process payment
        processPayment(savedOrder, orderRequest.getPayment());
        
        // Create shipment
        createShipment(savedOrder);
        
        // Clear cart and reset it for future use
        cart.getCartItems().clear();
        cart.setCartStatus(ShoppingCart.CartStatus.Active);
        shoppingCartRepository.save(cart);
        
        // Send order confirmation email
        String customerEmail = user.getEmail();
        String customerName = user.getFirstName() + " " + user.getLastName();
        emailService.sendOrderConfirmationEmail(customerEmail, savedOrder.getOrderId(), customerName);

        return OrderResponse.fromEntity(savedOrder);
    }

    @Override
    public OrderResponse getOrderById(Long orderId) {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        User user = userRepository.findByEmail(authentication.getName())
                .orElseThrow(() -> new UnauthorizedException("User not found"));
        
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new ResourceNotFoundException("Order", "id", orderId));
        
        // Check if user is admin or the order belongs to the authenticated customer
        boolean isAdmin = authentication.getAuthorities().contains(new SimpleGrantedAuthority("ROLE_ADMIN"));
        Customer customer = customerRepository.findByUserEmail(user.getEmail());
        
        if (!isAdmin && (customer == null || !order.getCustomer().getCustomerId().equals(customer.getCustomerId()))) {
            throw new UnauthorizedException("You do not have permission to view this order");
        }
        
        return OrderResponse.fromEntity(order);
    }

    @Override
    public Page<OrderResponse> getCurrentUserOrders(Pageable pageable) {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        User user = userRepository.findByEmail(authentication.getName())
                .orElseThrow(() -> new UnauthorizedException("User not found"));

        Customer customer = customerRepository.findByUserEmail(user.getEmail());
        if (customer == null) {
            throw new UnauthorizedException("Only customers can view their orders");
        }
        
        Page<Order> orders = orderRepository.findByCustomerCustomerId(customer.getCustomerId(), pageable);
        
        List<OrderResponse> orderResponses = orders.getContent().stream()
                .map(OrderResponse::fromEntity)
                .collect(Collectors.toList());
        
        return new PageImpl<>(orderResponses, pageable, orders.getTotalElements());
    }

    @Override
    public Page<OrderResponse> getAllOrders(Pageable pageable) {
        // Only admins can view all orders
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        boolean isAdmin = authentication.getAuthorities().contains(new SimpleGrantedAuthority("ROLE_ADMIN"));
        
        if (!isAdmin) {
            throw new UnauthorizedException("Only admins can view all orders");
        }
        
        Page<Order> orders = orderRepository.findAll(pageable);
        
        List<OrderResponse> orderResponses = orders.getContent().stream()
                .map(OrderResponse::fromEntity)
                .collect(Collectors.toList());
        
        return new PageImpl<>(orderResponses, pageable, orders.getTotalElements());
    }

    @Override
    public List<OrderResponse> getOrdersByStatus(Order.OrderStatus status) {
        // Only admins can filter orders by status
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        boolean isAdmin = authentication.getAuthorities().contains(new SimpleGrantedAuthority("ROLE_ADMIN"));
        
        if (!isAdmin) {
            throw new UnauthorizedException("Only admins can filter orders by status");
        }
        
        List<Order> orders = orderRepository.findByOrderStatus(status);
        
        return orders.stream()
                .map(OrderResponse::fromEntity)
                .collect(Collectors.toList());
    }

    @Override
    public List<OrderResponse> getOrdersByDateRange(LocalDateTime startDate, LocalDateTime endDate) {
        // Only admins can filter orders by date range
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        boolean isAdmin = authentication.getAuthorities().contains(new SimpleGrantedAuthority("ROLE_ADMIN"));
        
        if (!isAdmin) {
            throw new UnauthorizedException("Only admins can filter orders by date range");
        }
        
        List<Order> orders = orderRepository.findOrdersByDateRange(startDate, endDate);
        
        return orders.stream()
                .map(OrderResponse::fromEntity)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional
    public OrderResponse updateOrderStatus(Long orderId, OrderStatusUpdateRequest statusUpdateRequest) {
        // Only admins can update order status
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        boolean isAdmin = authentication.getAuthorities().contains(new SimpleGrantedAuthority("ROLE_ADMIN"));
        
        if (!isAdmin) {
            throw new UnauthorizedException("Only admins can update order status");
        }
        
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new ResourceNotFoundException("Order", "id", orderId));
        
        order.setOrderStatus(statusUpdateRequest.getOrderStatus());
        
        // Update shipment status if needed
        if (statusUpdateRequest.getOrderStatus() == Order.OrderStatus.Shipped) {
            Shipment shipment = shipmentRepository.findByOrderOrderId(orderId)
                    .orElseThrow(() -> new ResourceNotFoundException("Shipment", "order id", orderId));
            shipment.setIsDelivered(false); // Just changed from pending to shipped
            shipmentRepository.save(shipment);
        } else if (statusUpdateRequest.getOrderStatus() == Order.OrderStatus.Delivered) {
            Shipment shipment = shipmentRepository.findByOrderOrderId(orderId)
                    .orElseThrow(() -> new ResourceNotFoundException("Shipment", "order id", orderId));
            shipment.setIsDelivered(true);
            shipment.setActualDeliveryTime(LocalDateTime.now());
            shipmentRepository.save(shipment);
        }
        
        Order updatedOrder = orderRepository.save(order);
        return OrderResponse.fromEntity(updatedOrder);
    }

    @Override
    @Transactional
    public ApiResponse cancelOrder(Long orderId) {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        User user = userRepository.findByEmail(authentication.getName())
                .orElseThrow(() -> new UnauthorizedException("User not found"));
        
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new ResourceNotFoundException("Order", "id", orderId));
        
        // Check if user is admin or the order belongs to the authenticated customer
        boolean isAdmin = authentication.getAuthorities().contains(new SimpleGrantedAuthority("ROLE_ADMIN"));
        Customer customer = customerRepository.findByUserEmail(user.getEmail());
        
        if (!isAdmin && (customer == null || !order.getCustomer().getCustomerId().equals(customer.getCustomerId()))) {
            throw new UnauthorizedException("You do not have permission to cancel this order");
        }
        
        // Can only cancel if order is Pending or Processing
        if (order.getOrderStatus() != Order.OrderStatus.Pending && order.getOrderStatus() != Order.OrderStatus.Processing) {
            throw new BadRequestException("Cannot cancel an order that has been shipped or delivered");
        }
        
        // Update order status
        order.setOrderStatus(Order.OrderStatus.Cancelled);
        
        // If payment was completed, update payment status to refunded
        if (order.getPaymentStatus() == Order.PaymentStatus.Completed) {
            order.setPaymentStatus(Order.PaymentStatus.Refunded);
        }
        
        // Return items to inventory
        List<OrderItem> orderItems = orderItemRepository.findByOrderOrderId(orderId);
        for (OrderItem orderItem : orderItems) {
            Product product = orderItem.getProduct();
            product.setQuantityInStock(product.getQuantityInStock() + orderItem.getQuantity());
            productRepository.save(product);
        }
        
        orderRepository.save(order);
        
        return new ApiResponse(true, "Order cancelled successfully");
    }

    @Override
    public Double calculateRevenueByDateRange(LocalDateTime startDate, LocalDateTime endDate) {
        // Only admins can calculate revenue
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        boolean isAdmin = authentication.getAuthorities().contains(new SimpleGrantedAuthority("ROLE_ADMIN"));
        
        if (!isAdmin) {
            throw new UnauthorizedException("Only admins can calculate revenue");
        }
        
        Double revenue = orderRepository.calculateRevenueByDateRange(startDate, endDate);
        return revenue != null ? revenue : 0.0;
    }

    @Override
    public Long countOrdersByDateRange(LocalDateTime startDate, LocalDateTime endDate) {
        // Only admins can count orders
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        boolean isAdmin = authentication.getAuthorities().contains(new SimpleGrantedAuthority("ROLE_ADMIN"));
        
        if (!isAdmin) {
            throw new UnauthorizedException("Only admins can count orders");
        }
        
        Long count = orderRepository.countOrdersByDateRange(startDate, endDate);
        return count != null ? count : 0L;
    }    // Helper method to process payment
    private void processPayment(Order order, PaymentRequest paymentRequest) {
        try {
            // Check if payment request is null, default to COD
            if (paymentRequest == null) {
                order.setPaymentStatus(Order.PaymentStatus.Pending);
                orderRepository.save(order);
                return;
            }

            // In a real application, this would integrate with a payment gateway
            // For now, we'll simulate payment processing
            
            // Handle Cash on Delivery payment method
            if (PaymentMethod.CASH_ON_DELIVERY.name().equals(paymentRequest.getPaymentMethod()) || paymentRequest.isCashOnDelivery()) {
                // For COD, payment is pending until delivery
                order.setPaymentStatus(Order.PaymentStatus.Pending);
                orderRepository.save(order);
                return; // Early return after setting payment status
            }
        // Handle Credit Card payments - using saved credit card
        else if (paymentRequest.getCreditCardId() != null) {
            CreditCard creditCard = creditCardRepository.findById(paymentRequest.getCreditCardId())
                    .orElseThrow(() -> new ResourceNotFoundException("Credit card", "id", paymentRequest.getCreditCardId()));
            
            // Verify card belongs to customer
            if (!creditCard.getUser().getId().equals(order.getCustomer().getUser().getId())) {
                throw new UnauthorizedException("Credit card does not belong to the current customer");
            }
            
            // Process payment (simulate)
            boolean paymentSuccessful = true; // In a real app, this would be the result from payment gateway
            
            if (paymentSuccessful) {
                order.setPaymentStatus(Order.PaymentStatus.Completed);
            } else {
                order.setPaymentStatus(Order.PaymentStatus.Failed);
                throw new BadRequestException("Payment processing failed");
            }
        }        // Handle Credit Card payments - using new credit card
        else if (PaymentMethod.CREDIT_CARD.name().equals(paymentRequest.getPaymentMethod()) && paymentRequest.getAccountNumber() != null) {
            // Validate card details
            if (paymentRequest.getAccountNumber() == null || paymentRequest.getProvider() == null || 
                paymentRequest.getExpireDate() == null || paymentRequest.getCvv() == null) {
                throw new BadRequestException("Incomplete credit card information");
            }
            
            // Process payment (simulate)
            boolean paymentSuccessful = true; // In a real app, this would be the result from payment gateway
            
            if (paymentSuccessful) {
                order.setPaymentStatus(Order.PaymentStatus.Completed);
                
                // Save card if requested
                if (Boolean.TRUE.equals(paymentRequest.getSaveCard())) {
                    // Parse expire date to LocalDateTime
                    String[] parts = paymentRequest.getExpireDate().split("/");
                    int month = Integer.parseInt(parts[0]);
                    int year = Integer.parseInt(parts[1]);
                    LocalDateTime expireDate = LocalDateTime.of(year, month, 1, 0, 0).plusMonths(1).minusDays(1);
                    
                    CreditCard creditCard = CreditCard.builder()
                            .accountNumber(paymentRequest.getAccountNumber())
                            .provider(paymentRequest.getProvider())
                            .expireDate(expireDate)
                            .isDefault(false)
                            .user(order.getCustomer().getUser())
                            .build();
                    
                    creditCardRepository.save(creditCard);
                }
            } else {
                order.setPaymentStatus(Order.PaymentStatus.Failed);
                throw new BadRequestException("Payment processing failed");
            }
        }        // Handle unsupported payment methods or incomplete requests
        else {
            // Default to pending instead of throwing an error
            order.setPaymentStatus(Order.PaymentStatus.Pending);
        }
        
        orderRepository.save(order);
        } catch (Exception e) {
            // Log the exception 
            System.err.println("Error processing payment: " + e.getMessage());
            // Default to pending if there's any error
            order.setPaymentStatus(Order.PaymentStatus.Pending);
            orderRepository.save(order);
        }
    }
    
    // Helper method to create shipment
    private void createShipment(Order order) {
        // Generate a random tracking number
        String trackingNumber = "TRK" + UUID.randomUUID().toString().substring(0, 8).toUpperCase();
        
        // Create shipment
        Shipment shipment = Shipment.builder()
                .order(order)
                .isDelivered(false)
                .trackingNumber(trackingNumber)
                .carrier("Standard Delivery")
                .expectedTime(LocalDateTime.now().plusDays(5))
                .build();
        
        shipmentRepository.save(shipment);
    }    // Helper method to determine card type (unused for now but kept for future implementations)
    @SuppressWarnings("unused")
    private String determineCardType(String cardNumber) {
        // Simplified version, in a real app this would be more robust
        if (cardNumber.startsWith("4")) {
            return "Visa";
        } else if (cardNumber.startsWith("5")) {
            return "Mastercard";
        } else if (cardNumber.startsWith("34") || cardNumber.startsWith("37")) {
            return "American Express";
        } else if (cardNumber.startsWith("6")) {
            return "Discover";
        } else {
            return "Unknown";
        }
    }    @Override
    @Transactional
    public OrderResponse createOrderFromFrontend(FrontendOrderRequest frontendOrderRequest) {
        try {
            System.out.println("Processing order request: " + frontendOrderRequest);
            
            // Get current authenticated user
            Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
            User user = userRepository.findByEmail(authentication.getName())
                    .orElseThrow(() -> new UnauthorizedException("User not found"));

            // Check if user is a customer
            Customer customer = customerRepository.findByUserEmail(user.getEmail());
            if (customer == null) {
                throw new UnauthorizedException("Only customers can place orders");
            }

            // Get the address for both shipping and billing (same address in frontend implementation)
            Long addressId = frontendOrderRequest.getAddressId();
            if (addressId == null) {
                throw new BadRequestException("Address ID cannot be null");
            }

            Address address = addressRepository.findById(addressId)
                    .orElseThrow(() -> new ResourceNotFoundException("Address", "id", addressId));

            // Verify that address belongs to the customer
            if (!address.getCustomer().getCustomerId().equals(customer.getCustomerId())) {
                throw new UnauthorizedException("Address does not belong to the current customer");
            }

            // Validate order items
            if (frontendOrderRequest.getItems() == null || frontendOrderRequest.getItems().isEmpty()) {
                throw new BadRequestException("Order must contain at least one item");
            }

            // Calculate total price from items in the request
            double totalPrice = 0.0;
            for (FrontendOrderRequest.OrderItemRequest itemRequest : frontendOrderRequest.getItems()) {
                if (itemRequest.getProductId() == null) {
                    throw new BadRequestException("Product ID cannot be null");
                }
                
                Product product = productRepository.findById(itemRequest.getProductId())
                        .orElseThrow(() -> new ResourceNotFoundException("Product", "id", itemRequest.getProductId()));
                
                if (itemRequest.getQuantity() == null || itemRequest.getQuantity() <= 0) {
                    throw new BadRequestException("Quantity must be greater than zero");
                }
                
                totalPrice += product.getPrice() * itemRequest.getQuantity();
            }

            // Create order
            Order order = Order.builder()
                    .totalPrice(totalPrice)
                    .orderStatus(Order.OrderStatus.Pending)
                    .paymentStatus(Order.PaymentStatus.Pending)
                    .customer(customer)
                    .shippingAddress(address)
                    .billingAddress(address) // Same address for both
                    .build();
            
            Order savedOrder = orderRepository.save(order);

            // Create order items from request items
            for (FrontendOrderRequest.OrderItemRequest itemRequest : frontendOrderRequest.getItems()) {
                Product product = productRepository.findById(itemRequest.getProductId())
                        .orElseThrow(() -> new ResourceNotFoundException("Product", "id", itemRequest.getProductId()));
                
                OrderItem orderItem = OrderItem.builder()
                        .id(new OrderItemId(savedOrder.getOrderId(), product.getProductId()))
                        .order(savedOrder)
                        .product(product)
                        .quantity(itemRequest.getQuantity())
                        .priceAtPurchase(product.getPrice())
                        .build();
                
                orderItemRepository.save(orderItem);
                
                // Update product stock
                product.setQuantityInStock(product.getQuantityInStock() - itemRequest.getQuantity());
                productRepository.save(product);
            }
              // Process payment - default to Cash on Delivery
            PaymentRequest defaultPayment = new PaymentRequest();
            defaultPayment.setPaymentMethod(PaymentMethod.CASH_ON_DELIVERY.name());
            processPayment(savedOrder, defaultPayment);
            
            // Create shipment
            createShipment(savedOrder);
            
            // Clear cart after order is placed
            ShoppingCart cart = shoppingCartRepository.findByCustomerCustomerId(customer.getCustomerId())
                    .orElse(null);
            if (cart != null) {
                cart.getCartItems().clear();
                cart.setCartStatus(ShoppingCart.CartStatus.Active);
                shoppingCartRepository.save(cart);
            }
            
            // Send order confirmation email
            String customerEmail = user.getEmail();
            String customerName = user.getFirstName() + " " + user.getLastName();
            try {
                emailService.sendOrderConfirmationEmail(customerEmail, savedOrder.getOrderId(), customerName);
            } catch (Exception e) {
                // Log email sending error but don't fail the order
                System.err.println("Error sending order confirmation email: " + e.getMessage());
            }
            
            // Return the created order response
            OrderResponse response = OrderResponse.fromEntity(savedOrder);
            System.out.println("Order created successfully with ID: " + response.getOrderId());
            return response;
        } catch (Exception e) {
            System.err.println("Error creating order from frontend: " + e.getMessage());
            e.printStackTrace();
            throw e;
        }
    }
}
