package com.nexchat.server.socket;

import com.nexchat.server.dto.MessageDTO;
import com.nexchat.server.model.Message.MessageType;
import com.nexchat.server.service.MessageService;
import lombok.RequiredArgsConstructor;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Controller;

@Controller
@RequiredArgsConstructor
public class ChatEventHandler {

    private final MessageService messageService;
    private final SimpMessagingTemplate messagingTemplate;

    @MessageMapping("/chat.send")
    public void sendMessage(@Payload ChatMessage chatMessage) {
        MessageDTO saved = messageService.saveMessage(
            chatMessage.getConversationId(),
            chatMessage.getSenderId(),
            chatMessage.getContent(),
            chatMessage.getMessageType() != null
                ? chatMessage.getMessageType()
                : MessageType.TEXT
        );
        messagingTemplate.convertAndSend(
            "/topic/conversations/" + saved.getConversationId(),
            saved
        );
    }

    @MessageMapping("/chat.typing")
    public void typing(@Payload TypingEvent typingEvent) {
        messagingTemplate.convertAndSend(
            "/topic/conversations/"
            + typingEvent.getConversationId() + "/typing",
            typingEvent
        );
    }

    // Called when a user opens a conversation and reads messages
    @MessageMapping("/chat.read")
    public void markRead(@Payload ReadEvent readEvent) {
        // Broadcast read receipt to all participants
        messagingTemplate.convertAndSend(
            "/topic/conversations/"
            + readEvent.getConversationId() + "/read",
            readEvent
        );
    }

    @lombok.Data
    public static class ChatMessage {
        private String conversationId;
        private String senderId;
        private String content;
        private MessageType messageType;
    }

    @lombok.Data
    public static class TypingEvent {
        private String conversationId;
        private String userId;
        private String username;
        private boolean typing;
    }

    @lombok.Data
    public static class ReadEvent {
        private String conversationId;
        private String readerId;
        private String readerUsername;
    }
}