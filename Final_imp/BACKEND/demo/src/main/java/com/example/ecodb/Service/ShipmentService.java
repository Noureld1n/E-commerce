package com.example.ecodb.Service;

import com.example.ecodb.dto.request.ShipmentCreateRequest;
import com.example.ecodb.dto.request.ShipmentUpdateRequest;
import com.example.ecodb.dto.response.ApiResponse;
import com.example.ecodb.dto.response.ShipmentResponse;

import java.util.List;

public interface ShipmentService {
    
    ShipmentResponse createShipment(ShipmentCreateRequest shipmentCreateRequest);
    
    ShipmentResponse getShipmentByOrderId(Long orderId);
    
    ShipmentResponse getShipmentById(Long shipmentId);
    
    List<ShipmentResponse> getAllShipments();
    
    List<ShipmentResponse> getDeliveredShipments(Boolean isDelivered);
    
    List<ShipmentResponse> getShipmentsByTrackingNumber(String trackingNumber);
    
    ShipmentResponse updateShipment(Long shipmentId, ShipmentUpdateRequest shipmentUpdateRequest);
    
    ApiResponse markShipmentAsDelivered(Long shipmentId);
}
