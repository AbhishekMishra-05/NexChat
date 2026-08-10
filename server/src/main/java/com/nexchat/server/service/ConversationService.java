package com.nexchat.server.service;

import com.nexchat.server.dto.ConversationDTO;
import com.nexchat.server.dto.ConversationDTO.ParticipantDTO;
import com.nexchat.server.dto.CreateConversationRequest;
import com.nexchat.server.model.Conversation;
import com.nexchat.server.model.Conversation.ConversationType;
import com.nexchat.server.model.User;
import com.nexchat.server.repository.ConversationRepository;
import com.nexchat.server.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ConversationService {

    private final ConversationRepository conversationRepository;
    private final UserRepository userRepository;

    // Create or get existing direct conversation
    public ConversationDTO createOrGetDirect(String currentUserId,
                                              String targetUserId) {
        User currentUser = userRepository.findById(currentUserId)
                .orElseThrow(() -> new RuntimeException("User not found"));
        User targetUser = userRepository.findById(targetUserId)
                .orElseThrow(() -> new RuntimeException("Target user not found"));

        return conversationRepository
                .findDirectConversation(currentUser, targetUser)
                .map(this::toDTO)
                .orElseGet(() -> {
                    List<User> participants = new ArrayList<>();
                    participants.add(currentUser);
                    participants.add(targetUser);
                    Conversation conversation = Conversation.builder()
                            .type(ConversationType.DIRECT)
                            .participants(participants)
                            .build();
                    return toDTO(conversationRepository.save(conversation));
                });
    }

    // Create a new group conversation
    public ConversationDTO createGroup(String currentUserId,
                                       CreateConversationRequest request) {
        User creator = userRepository.findById(currentUserId)
                .orElseThrow(() -> new RuntimeException("User not found"));

        List<User> participants = new ArrayList<>();
        participants.add(creator);

        if (request.getParticipantIds() != null) {
            for (String id : request.getParticipantIds()) {
                userRepository.findById(id)
                        .ifPresent(participants::add);
            }
        }

        Conversation conversation = Conversation.builder()
                .type(ConversationType.GROUP)
                .name(request.getGroupName())
                .participants(participants)
                .build();

        return toDTO(conversationRepository.save(conversation));
    }

    // Get all conversations for a user
    public List<ConversationDTO> getUserConversations(String userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));
        return conversationRepository
                .findByParticipantsContaining(user)
                .stream()
                .map(this::toDTO)
                .sorted((a, b) -> {
                    if (a.getLastMessageAt() == null) return 1;
                    if (b.getLastMessageAt() == null) return -1;
                    return b.getLastMessageAt().compareTo(a.getLastMessageAt());
                })
                .collect(Collectors.toList());
    }

    // Add a member to a group
    public ConversationDTO addMember(String conversationId,
                                      String userId) {
        Conversation conv = conversationRepository.findById(conversationId)
                .orElseThrow(() -> new RuntimeException("Conversation not found"));
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));

        boolean alreadyMember = conv.getParticipants().stream()
                .anyMatch(p -> p.getId().equals(userId));
        if (!alreadyMember) {
            conv.getParticipants().add(user);
            conversationRepository.save(conv);
        }
        return toDTO(conv);
    }

    // Remove a member from a group
    public ConversationDTO removeMember(String conversationId,
                                         String userId) {
        Conversation conv = conversationRepository.findById(conversationId)
                .orElseThrow(() -> new RuntimeException("Conversation not found"));
        conv.getParticipants().removeIf(p -> p.getId().equals(userId));
        conversationRepository.save(conv);
        return toDTO(conv);
    }

    // Update group name
    public ConversationDTO updateGroupName(String conversationId,
                                            String newName) {
        Conversation conv = conversationRepository.findById(conversationId)
                .orElseThrow(() -> new RuntimeException("Conversation not found"));
        conv.setName(newName);
        conversationRepository.save(conv);
        return toDTO(conv);
    }

    // Convert entity to DTO
    public ConversationDTO toDTO(Conversation conversation) {
        List<ParticipantDTO> participants = conversation.getParticipants()
                .stream()
                .map(u -> ParticipantDTO.builder()
                        .id(u.getId())
                        .username(u.getUsername())
                        .displayName(u.getDisplayName())
                        .profilePicUrl(u.getProfilePicUrl())
                        .online(u.isOnline())
                        .build())
                .collect(Collectors.toList());

        return ConversationDTO.builder()
                .id(conversation.getId())
                .type(conversation.getType())
                .name(conversation.getName())
                .groupPicUrl(conversation.getGroupPicUrl())
                .participants(participants)
                .lastMessageAt(conversation.getLastMessageAt())
                .build();
    }
}