package com.example.ecodb.Controller;

import com.example.ecodb.Service.ShipmentService;
import com.example.ecodb.dto.request.ShipmentCreateRequest;
import com.example.ecodb.dto.request.ShipmentUpdateRequest;
import com.example.ecodb.dto.response.ApiResponse;
import com.example.ecodb.dto.response.ShipmentResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/shipments")
@RequiredArgsConstructor
public class ShipmentController {

    private final ShipmentService shipmentService;

    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ShipmentResponse> createShipment(
            @Valid @RequestBody ShipmentCreateRequest shipmentCreateRequest) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(shipmentService.createShipment(shipmentCreateRequest));
    }

    @GetMapping("/order/{orderId}")
    public ResponseEntity<ShipmentResponse> getShipmentByOrderId(@PathVariable Long orderId) {
        return ResponseEntity.ok(shipmentService.getShipmentByOrderId(orderId));
    }

    @GetMapping("/{shipmentId}")
    public ResponseEntity<ShipmentResponse> getShipmentById(@PathVariable Long shipmentId) {
        return ResponseEntity.ok(shipmentService.getShipmentById(shipmentId));
    }

    @GetMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<List<ShipmentResponse>> getAllShipments() {
        return ResponseEntity.ok(shipmentService.getAllShipments());
    }

    @GetMapping("/by-delivery-status")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<List<ShipmentResponse>> getDeliveredShipments(
            @RequestParam Boolean isDelivered) {
        return ResponseEntity.ok(shipmentService.getDeliveredShipments(isDelivered));
    }

    @GetMapping("/track")
    public ResponseEntity<List<ShipmentResponse>> getShipmentsByTrackingNumber(
            @RequestParam String trackingNumber) {
        return ResponseEntity.ok(shipmentService.getShipmentsByTrackingNumber(trackingNumber));
    }

    @PutMapping("/{shipmentId}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ShipmentResponse> updateShipment(
            @PathVariable Long shipmentId,
            @Valid @RequestBody ShipmentUpdateRequest shipmentUpdateRequest) {
        return ResponseEntity.ok(shipmentService.updateShipment(shipmentId, shipmentUpdateRequest));
    }

    @PutMapping("/{shipmentId}/deliver")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse> markShipmentAsDelivered(@PathVariable Long shipmentId) {
        return ResponseEntity.ok(shipmentService.markShipmentAsDelivered(shipmentId));
    }
}
