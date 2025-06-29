package com.example.ecodb.dto.response;

import com.example.ecodb.Model.Order;
import com.example.ecodb.Model.OrderItem;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class OrderResponse {
    private Long orderId;
    private Double totalPrice;
    private LocalDateTime creationDate;
    private String orderStatus;
    private String paymentStatus;
    private Long customerId;    private String customerName;
    private AddressResponse shippingAddress;
    private AddressResponse billingAddress;
    @Builder.Default
    private List<OrderItemResponse> orderItems = new ArrayList<>();
    private ShipmentResponse shipment;

    public static OrderResponse fromEntity(Order order) {
        return OrderResponse.builder()
                .orderId(order.getOrderId())
                .totalPrice(order.getTotalPrice())
                .creationDate(order.getCreationDate())
                .orderStatus(order.getOrderStatus().name())
                .paymentStatus(order.getPaymentStatus().name())
                .customerId(order.getCustomer().getCustomerId())
                .customerName(order.getCustomer().getUser().getFirstName() + " " + order.getCustomer().getUser().getLastName())
                .shippingAddress(order.getShippingAddress() != null ? AddressResponse.fromEntity(order.getShippingAddress()) : null)
                .billingAddress(order.getBillingAddress() != null ? AddressResponse.fromEntity(order.getBillingAddress()) : null)
                .orderItems(order.getOrderItems().stream()
                        .map(OrderItemResponse::fromEntity)
                        .collect(Collectors.toList()))
                .shipment(order.getShipment() != null ? ShipmentResponse.fromEntity(order.getShipment()) : null)
                .build();
    }

    @Data
    @Builder
    @AllArgsConstructor
    @NoArgsConstructor
    public static class OrderItemResponse {
        private Long productId;
        private String productName;
        private String imageUrl;
        private Double priceAtPurchase;
        private Integer quantity;
        private Double subtotal;

        public static OrderItemResponse fromEntity(OrderItem orderItem) {
            // Get main image URL or first available image
            String imageUrl = null;
            if (orderItem.getProduct().getImages() != null && !orderItem.getProduct().getImages().isEmpty()) {
                imageUrl = orderItem.getProduct().getImages().stream()
                        .filter(img -> img.getIsMain())
                        .findFirst()
                        .orElse(orderItem.getProduct().getImages().get(0))
                        .getImageUrl();
            }

            return OrderItemResponse.builder()
                    .productId(orderItem.getProduct().getProductId())
                    .productName(orderItem.getProduct().getProductName())
                    .imageUrl(imageUrl)
                    .priceAtPurchase(orderItem.getPriceAtPurchase())
                    .quantity(orderItem.getQuantity())
                    .subtotal(orderItem.getPriceAtPurchase() * orderItem.getQuantity())
                    .build();
        }
    }
}
