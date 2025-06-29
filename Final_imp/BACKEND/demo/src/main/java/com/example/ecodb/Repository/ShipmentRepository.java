package com.example.ecodb.Repository;

import com.example.ecodb.Model.Shipment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ShipmentRepository extends JpaRepository<Shipment, Long> {
    
    Optional<Shipment> findByOrderOrderId(Long orderId);
    
    List<Shipment> findByIsDelivered(Boolean isDelivered);
    
    List<Shipment> findByTrackingNumber(String trackingNumber);
    
    List<Shipment> findByCarrier(String carrier);
}
