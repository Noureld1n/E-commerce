package com.example.ecodb.Service;

import org.springframework.web.multipart.MultipartFile;

public interface FileService {
    
    String uploadFile(MultipartFile file, String directory);
    
    void deleteFile(String fileUrl);
}
