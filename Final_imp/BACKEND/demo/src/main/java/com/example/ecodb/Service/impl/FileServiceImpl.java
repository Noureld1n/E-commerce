package com.example.ecodb.Service.impl;

import com.example.ecodb.Service.FileService;
import com.example.ecodb.exception.BadRequestException;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;

import java.io.File;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.UUID;

@Service
@Slf4j
public class FileServiceImpl implements FileService {

    private final String uploadDir;
    
    public FileServiceImpl(@Value("${file.upload-dir:uploads}") String uploadDir) {
        this.uploadDir = uploadDir;
    }

    @Override
    public String uploadFile(MultipartFile file, String directory) {
        try {
            // Create upload directory if it doesn't exist
            File uploadPath = new File(uploadDir + File.separator + directory);
            if (!uploadPath.exists()) {
                uploadPath.mkdirs();
            }

            // Generate unique filename
            String originalFilename = StringUtils.cleanPath(file.getOriginalFilename());
            String fileExtension = getFileExtension(originalFilename);
            String uniqueFilename = generateUniqueFilename(fileExtension);
            
            // Copy file to upload directory
            Path targetLocation = Paths.get(uploadPath.getAbsolutePath(), uniqueFilename);
            Files.copy(file.getInputStream(), targetLocation, StandardCopyOption.REPLACE_EXISTING);

            return directory + "/" + uniqueFilename;
        } catch (IOException ex) {
            log.error("Failed to upload file", ex);
            throw new BadRequestException("Could not upload file: " + ex.getMessage());
        }
    }

    @Override
    public void deleteFile(String fileUrl) {
        try {
            if (fileUrl != null && !fileUrl.isEmpty()) {
                Path filePath = Paths.get(uploadDir, fileUrl);
                Files.deleteIfExists(filePath);
            }
        } catch (IOException ex) {
            log.error("Failed to delete file", ex);
        }
    }
    
    private String getFileExtension(String filename) {
        if (filename.lastIndexOf(".") > 0) {
            return filename.substring(filename.lastIndexOf("."));
        }
        return "";
    }
    
    private String generateUniqueFilename(String fileExtension) {
        String timestamp = LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyyMMddHHmmss"));
        String uuid = UUID.randomUUID().toString().replace("-", "").substring(0, 8);
        return timestamp + "-" + uuid + fileExtension;
    }
}
