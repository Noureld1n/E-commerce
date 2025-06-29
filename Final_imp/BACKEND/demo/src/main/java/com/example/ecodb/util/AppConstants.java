package com.example.ecodb.util;

import org.springframework.stereotype.Component;

@Component
public class AppConstants {
    public static final String DEFAULT_PAGE_NUMBER = "0";
    public static final String DEFAULT_PAGE_SIZE = "10";
    public static final String DEFAULT_SORT_BY = "creationDate";
    public static final String DEFAULT_SORT_DIRECTION = "desc";
    
    // File upload directories
    public static final String PRODUCT_IMAGES_DIR = "products";
}
