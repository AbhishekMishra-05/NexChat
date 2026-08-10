package com.nexchat.server.dto;

import com.nexchat.server.model.Message.MessageType;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import lombok.Builder;
import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class MessageDTO {

    private String id;

    // Which conversation this message belongs to
    private String conversationId;

    // Who sent it
    private String senderId;
    private String senderUsername;
    private String senderDisplayName;
    private String senderProfilePic;

    // The actual content — text or media URL
    private String content;

    // TEXT, IMAGE, AUDIO, VIDEO
    private MessageType messageType;

    private LocalDateTime timestamp;

    // List of userIds who have read this message
    // Used for read receipts
    private java.util.List<String> readBy;
}