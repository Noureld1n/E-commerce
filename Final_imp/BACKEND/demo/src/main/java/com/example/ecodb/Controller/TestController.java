package com.example.ecodb.Controller;

import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;

@RestController
@RequestMapping("/test")
public class TestController {
    
    @GetMapping
    public String test() {
        return "Test controller working!";
    }
}
