package com.nexchat.server.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.UUID;

@Service
public class MediaService {

    @Value("${media.upload-dir:uploads}")
    private String uploadDir;

    @Value("${media.base-url:http://localhost:8081/uploads}")
    private String baseUrl;

    public String uploadFile(MultipartFile file) throws IOException {

        if (file.isEmpty()) {
            throw new RuntimeException("File is empty");
        }

        String contentType = file.getContentType();
        if (contentType == null || !isAllowedType(contentType)) {
            throw new RuntimeException("File type not allowed");
        }

        Path uploadPath = Paths.get(uploadDir);
        if (!Files.exists(uploadPath)) {
            Files.createDirectories(uploadPath);
        }

        String originalFilename = file.getOriginalFilename();
        String extension = getExtension(originalFilename);
        String uniqueFilename = UUID.randomUUID() + extension;

        Path filePath = uploadPath.resolve(uniqueFilename);
        Files.copy(file.getInputStream(), filePath,
                StandardCopyOption.REPLACE_EXISTING);

        return baseUrl + "/" + uniqueFilename;
    }

    // Determines message type from file content type
    public String getMessageType(MultipartFile file) {
        String contentType = file.getContentType();
        if (contentType == null) return "TEXT";
        if (contentType.startsWith("image/")) return "IMAGE";
        if (contentType.startsWith("audio/")) return "AUDIO";
        if (contentType.startsWith("video/")) return "VIDEO";
        return "TEXT";
    }

    private boolean isAllowedType(String contentType) {
        return contentType.startsWith("image/") ||
               contentType.startsWith("audio/") ||
               contentType.startsWith("video/");
    }

    private String getExtension(String filename) {
        if (filename == null || !filename.contains(".")) return "";
        return filename.substring(filename.lastIndexOf("."));
    }
}