package com.example.ecodb.dto.response;

import com.example.ecodb.Model.Shipment;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class ShipmentResponse {
    private Long shipmentId;
    private Long orderId;
    private Boolean isDelivered;
    private String trackingNumber;
    private String carrier;
    private LocalDateTime expectedTime;
    private LocalDateTime actualDeliveryTime;

    public static ShipmentResponse fromEntity(Shipment shipment) {
        return ShipmentResponse.builder()
                .shipmentId(shipment.getShipmentId())
                .orderId(shipment.getOrder().getOrderId())
                .isDelivered(shipment.getDelivered())
                .trackingNumber(shipment.getTrackingNumber())
                .carrier(shipment.getCarrier())
                .expectedTime(shipment.getExpectedTime())
                .actualDeliveryTime(shipment.getActualDeliveryTime())
                .build();
    }
}
