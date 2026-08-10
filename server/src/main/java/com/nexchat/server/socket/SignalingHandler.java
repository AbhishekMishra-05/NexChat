package com.nexchat.server.socket;

import lombok.RequiredArgsConstructor;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Controller;

@Controller
@RequiredArgsConstructor
public class SignalingHandler {

    private final SimpMessagingTemplate messagingTemplate;

    @MessageMapping("/signal")
    public void handleSignal(@Payload SignalMessage signal) {
        // Send to a topic specific to the target user
        // Only that user is subscribed to /topic/signal/{userId}
        messagingTemplate.convertAndSend(
            "/topic/signal/" + signal.getTargetUserId(),
            signal
        );
    }

    @lombok.Data
    public static class SignalMessage {
        private String senderId;
        private String senderUsername;
        private String senderDisplayName;
        private String targetUserId;
        private String type;
        private String callType;
        private Object data;
    }
}