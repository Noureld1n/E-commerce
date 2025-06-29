package com.example.ecodb.Service.impl;

import com.example.ecodb.Model.Customer;
import com.example.ecodb.Model.Order;
import com.example.ecodb.Model.Shipment;
import com.example.ecodb.Model.User;
import com.example.ecodb.Repository.CustomerRepository;
import com.example.ecodb.Repository.OrderRepository;
import com.example.ecodb.Repository.ShipmentRepository;
import com.example.ecodb.Repository.UserRepository;
import com.example.ecodb.Service.ShipmentService;
import com.example.ecodb.dto.request.ShipmentCreateRequest;
import com.example.ecodb.dto.request.ShipmentUpdateRequest;
import com.example.ecodb.dto.response.ApiResponse;
import com.example.ecodb.dto.response.ShipmentResponse;
import com.example.ecodb.exception.BadRequestException;
import com.example.ecodb.exception.ResourceNotFoundException;
import com.example.ecodb.exception.UnauthorizedException;
import lombok.RequiredArgsConstructor;
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
public class ShipmentServiceImpl implements ShipmentService {

    private final ShipmentRepository shipmentRepository;
    private final OrderRepository orderRepository;
    private final UserRepository userRepository;
    private final CustomerRepository customerRepository;

    @Override
    @Transactional
    public ShipmentResponse createShipment(ShipmentCreateRequest shipmentCreateRequest) {
        // Only admins can manually create shipments
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        boolean isAdmin = authentication.getAuthorities().contains(new SimpleGrantedAuthority("ROLE_ADMIN"));
        
        if (!isAdmin) {
            throw new UnauthorizedException("Only admins can manually create shipments");
        }
        
        // Check if order exists
        Order order = orderRepository.findById(shipmentCreateRequest.getOrderId())
                .orElseThrow(() -> new ResourceNotFoundException("Order", "id", shipmentCreateRequest.getOrderId()));
        
        // Check if shipment already exists for this order
        if (shipmentRepository.findByOrderOrderId(shipmentCreateRequest.getOrderId()).isPresent()) {
            throw new BadRequestException("Shipment already exists for order ID: " + shipmentCreateRequest.getOrderId());
        }
        
        // Generate tracking number if not provided
        String trackingNumber = shipmentCreateRequest.getTrackingNumber();
        if (trackingNumber == null || trackingNumber.trim().isEmpty()) {
            trackingNumber = "TRK" + UUID.randomUUID().toString().substring(0, 8).toUpperCase();
        }
        
        // Set default carrier if not provided
        String carrier = shipmentCreateRequest.getCarrier();
        if (carrier == null || carrier.trim().isEmpty()) {
            carrier = "Standard Delivery";
        }
        
        // Set default expected time if not provided (5 days from now)
        LocalDateTime expectedTime = shipmentCreateRequest.getExpectedTime();
        if (expectedTime == null) {
            expectedTime = LocalDateTime.now().plusDays(5);
        }
        
        // Create shipment
        Shipment shipment = Shipment.builder()
                .order(order)
                .isDelivered(false)
                .trackingNumber(trackingNumber)
                .carrier(carrier)
                .expectedTime(expectedTime)
                .build();
        
        Shipment savedShipment = shipmentRepository.save(shipment);
        return ShipmentResponse.fromEntity(savedShipment);
    }

    @Override
    public ShipmentResponse getShipmentByOrderId(Long orderId) {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        User user = userRepository.findByEmail(authentication.getName())
                .orElseThrow(() -> new UnauthorizedException("User not found"));
        
        // Check if order exists
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new ResourceNotFoundException("Order", "id", orderId));
        
        // Check if user is admin or the order belongs to the authenticated customer
        boolean isAdmin = authentication.getAuthorities().contains(new SimpleGrantedAuthority("ROLE_ADMIN"));
        Customer customer = customerRepository.findByUserEmail(user.getEmail());
        
        if (!isAdmin && (customer == null || !order.getCustomer().getCustomerId().equals(customer.getCustomerId()))) {
            throw new UnauthorizedException("You do not have permission to view this shipment");
        }
        
        Shipment shipment = shipmentRepository.findByOrderOrderId(orderId)
                .orElseThrow(() -> new ResourceNotFoundException("Shipment", "order id", orderId));
        
        return ShipmentResponse.fromEntity(shipment);
    }

    @Override
    public ShipmentResponse getShipmentById(Long shipmentId) {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        User user = userRepository.findByEmail(authentication.getName())
                .orElseThrow(() -> new UnauthorizedException("User not found"));
        
        Shipment shipment = shipmentRepository.findById(shipmentId)
                .orElseThrow(() -> new ResourceNotFoundException("Shipment", "id", shipmentId));
        
        // Check if user is admin or the shipment belongs to the authenticated customer
        boolean isAdmin = authentication.getAuthorities().contains(new SimpleGrantedAuthority("ROLE_ADMIN"));
        Customer customer = customerRepository.findByUserEmail(user.getEmail());
        
        if (!isAdmin && (customer == null || !shipment.getOrder().getCustomer().getCustomerId().equals(customer.getCustomerId()))) {
            throw new UnauthorizedException("You do not have permission to view this shipment");
        }
        
        return ShipmentResponse.fromEntity(shipment);
    }

    @Override
    public List<ShipmentResponse> getAllShipments() {
        // Only admins can view all shipments
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        boolean isAdmin = authentication.getAuthorities().contains(new SimpleGrantedAuthority("ROLE_ADMIN"));
        
        if (!isAdmin) {
            throw new UnauthorizedException("Only admins can view all shipments");
        }
        
        List<Shipment> shipments = shipmentRepository.findAll();
        return shipments.stream()
                .map(ShipmentResponse::fromEntity)
                .collect(Collectors.toList());
    }

    @Override
    public List<ShipmentResponse> getDeliveredShipments(Boolean isDelivered) {
        // Only admins can filter shipments
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        boolean isAdmin = authentication.getAuthorities().contains(new SimpleGrantedAuthority("ROLE_ADMIN"));
        
        if (!isAdmin) {
            throw new UnauthorizedException("Only admins can filter shipments");
        }
        
        List<Shipment> shipments = shipmentRepository.findByIsDelivered(isDelivered);
        return shipments.stream()
                .map(ShipmentResponse::fromEntity)
                .collect(Collectors.toList());
    }

    @Override
    public List<ShipmentResponse> getShipmentsByTrackingNumber(String trackingNumber) {
        // Allow customers to search by tracking number
        List<Shipment> shipments = shipmentRepository.findByTrackingNumber(trackingNumber);
        
        // If not found, return empty list
        if (shipments.isEmpty()) {
            return List.of();
        }
        
        // Check permissions
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        User user = userRepository.findByEmail(authentication.getName())
                .orElseThrow(() -> new UnauthorizedException("User not found"));
        
        boolean isAdmin = authentication.getAuthorities().contains(new SimpleGrantedAuthority("ROLE_ADMIN"));
        
        if (!isAdmin) {
            // Filter out shipments that don't belong to the customer
            Customer customer = customerRepository.findByUserEmail(user.getEmail());
            if (customer != null) {
                shipments = shipments.stream()
                        .filter(shipment -> shipment.getOrder().getCustomer().getCustomerId().equals(customer.getCustomerId()))
                        .collect(Collectors.toList());
            } else {
                return List.of(); // Not a customer, return empty list
            }
        }
        
        return shipments.stream()
                .map(ShipmentResponse::fromEntity)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional
    public ShipmentResponse updateShipment(Long shipmentId, ShipmentUpdateRequest shipmentUpdateRequest) {
        // Only admins can update shipments
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        boolean isAdmin = authentication.getAuthorities().contains(new SimpleGrantedAuthority("ROLE_ADMIN"));
        
        if (!isAdmin) {
            throw new UnauthorizedException("Only admins can update shipments");
        }
        
        Shipment shipment = shipmentRepository.findById(shipmentId)
                .orElseThrow(() -> new ResourceNotFoundException("Shipment", "id", shipmentId));
        
        // Update fields if provided
        if (shipmentUpdateRequest.getCarrier() != null) {
            shipment.setCarrier(shipmentUpdateRequest.getCarrier());
        }
        
        if (shipmentUpdateRequest.getTrackingNumber() != null) {
            shipment.setTrackingNumber(shipmentUpdateRequest.getTrackingNumber());
        }
        
        if (shipmentUpdateRequest.getExpectedTime() != null) {
            shipment.setExpectedTime(shipmentUpdateRequest.getExpectedTime());
        }
        
        shipment.setIsDelivered(shipmentUpdateRequest.getIsDelivered());
        
        if (Boolean.TRUE.equals(shipmentUpdateRequest.getIsDelivered())) {
            // If marking as delivered, set actual delivery time if not provided
            if (shipmentUpdateRequest.getActualDeliveryTime() != null) {
                shipment.setActualDeliveryTime(shipmentUpdateRequest.getActualDeliveryTime());
            } else {
                shipment.setActualDeliveryTime(LocalDateTime.now());
            }
            
            // Update order status to delivered
            Order order = shipment.getOrder();
            order.setOrderStatus(Order.OrderStatus.Delivered);
            orderRepository.save(order);
        } else {
            shipment.setActualDeliveryTime(null);
        }
        
        Shipment updatedShipment = shipmentRepository.save(shipment);
        return ShipmentResponse.fromEntity(updatedShipment);
    }

    @Override
    @Transactional
    public ApiResponse markShipmentAsDelivered(Long shipmentId) {
        // Only admins can mark shipments as delivered
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        boolean isAdmin = authentication.getAuthorities().contains(new SimpleGrantedAuthority("ROLE_ADMIN"));
        
        if (!isAdmin) {
            throw new UnauthorizedException("Only admins can mark shipments as delivered");
        }
        
        Shipment shipment = shipmentRepository.findById(shipmentId)
                .orElseThrow(() -> new ResourceNotFoundException("Shipment", "id", shipmentId));
        
        shipment.setIsDelivered(true);
        shipment.setActualDeliveryTime(LocalDateTime.now());
        shipmentRepository.save(shipment);
        
        // Update order status
        Order order = shipment.getOrder();
        order.setOrderStatus(Order.OrderStatus.Delivered);
        orderRepository.save(order);
        
        return new ApiResponse(true, "Shipment marked as delivered successfully");
    }
}
