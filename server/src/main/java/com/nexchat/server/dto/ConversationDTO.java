package com.nexchat.server.dto;

import com.nexchat.server.model.Conversation.ConversationType;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import lombok.Builder;
import java.time.LocalDateTime;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ConversationDTO {

    private String id;

    // DIRECT or GROUP
    private ConversationType type;

    // Group name — null for direct chats
    private String name;

    private String groupPicUrl;

    // List of participants in this conversation
    private List<ParticipantDTO> participants;

    // Last message preview — shown in sidebar
    private String lastMessage;
    private LocalDateTime lastMessageAt;

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class ParticipantDTO {
        private String id;
        private String username;
        private String displayName;
        private String profilePicUrl;
        private boolean online;
    }
}