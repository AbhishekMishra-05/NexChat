package com.nexchat.server.service;

import com.nexchat.server.dto.MessageDTO;
import com.nexchat.server.model.Conversation;
import com.nexchat.server.model.Message;
import com.nexchat.server.model.Message.MessageType;
import com.nexchat.server.model.User;
import com.nexchat.server.repository.ConversationRepository;
import com.nexchat.server.repository.MessageRepository;
import com.nexchat.server.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class MessageService {

    private final MessageRepository messageRepository;
    private final ConversationRepository conversationRepository;
    private final UserRepository userRepository;

    // Called by ChatEventHandler when a message arrives over WebSocket
    // Saves the message to PostgreSQL and returns it as a DTO
    public MessageDTO saveMessage(String conversationId,
                                   String senderId,
                                   String content,
                                   MessageType messageType) {

        // Step 1 — find the conversation
        Conversation conversation = conversationRepository
                .findById(conversationId)
                .orElseThrow(() ->
                    new RuntimeException("Conversation not found"));

        // Step 2 — find the sender
        User sender = userRepository
                .findById(senderId)
                .orElseThrow(() ->
                    new RuntimeException("User not found"));

        // Step 3 — build and save the message
        Message message = Message.builder()
                .conversation(conversation)
                .sender(sender)
                .content(content)
                .messageType(messageType)
                .build();

        Message saved = messageRepository.save(message);

        // Step 4 — update conversation's lastMessageAt
        // So the sidebar sorts chats by most recent
        conversation.setLastMessageAt(LocalDateTime.now());
        conversationRepository.save(conversation);

        // Step 5 — convert to DTO and return
        return toDTO(saved);
    }

    // Called by MessageController when React loads a chat
    // Returns the last 50 messages for a conversation
    public List<MessageDTO> getHistory(String conversationId) {

        Conversation conversation = conversationRepository
                .findById(conversationId)
                .orElseThrow(() ->
                    new RuntimeException("Conversation not found"));

        // Fetch last 50 messages (newest first) then reverse
        // so they display oldest → newest in the UI
        List<Message> messages = messageRepository
                .findTop50ByConversationOrderByTimestampDesc(conversation);

        return messages.stream()
                .map(this::toDTO)
                // reverse so oldest message is at the top
                .collect(Collectors.collectingAndThen(
                    Collectors.toList(),
                    list -> {
                        java.util.Collections.reverse(list);
                        return list;
                    }
                ));
    }

    // Converts a Message entity into a MessageDTO
    // DTOs are what get sent as JSON — entities stay internal
    public MessageDTO toDTO(Message message) {
        return MessageDTO.builder()
                .id(message.getId())
                .conversationId(message.getConversation().getId())
                .senderId(message.getSender().getId())
                .senderUsername(message.getSender().getUsername())
                .senderDisplayName(message.getSender().getDisplayName())
                .senderProfilePic(message.getSender().getProfilePicUrl())
                .content(message.getContent())
                .messageType(message.getMessageType())
                .timestamp(message.getTimestamp())
                .readBy(message.getReadBy())
                .build();
    }
}