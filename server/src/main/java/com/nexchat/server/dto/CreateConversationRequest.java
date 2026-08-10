package com.nexchat.server.dto;

import lombok.Data;

@Data
public class CreateConversationRequest {

    // The userId of the person you want to chat with
    // For direct conversations
    private String targetUserId;

    // For group conversations
    private String groupName;
    private java.util.List<String> participantIds;

    // "DIRECT" or "GROUP"
    private String type;
}