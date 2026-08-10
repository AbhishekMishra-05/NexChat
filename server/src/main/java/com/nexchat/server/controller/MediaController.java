package com.nexchat.server.controller;

import com.nexchat.server.service.MediaService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.Map;

@RestController
@RequestMapping("/api/media")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class MediaController {

    private final MediaService mediaService;

    // POST /api/media/upload
    // React sends a multipart file
    // Returns: { url, messageType }
    @PostMapping("/upload")
    public ResponseEntity<?> uploadFile(
            @RequestParam("file") MultipartFile file) {
        try {
            String url = mediaService.uploadFile(file);
            String messageType = mediaService.getMessageType(file);

            return ResponseEntity.ok(Map.of(
                "url", url,
                "messageType", messageType
            ));
        } catch (Exception e) {
            return ResponseEntity.badRequest()
                    .body(Map.of("error", e.getMessage()));
        }
    }
}