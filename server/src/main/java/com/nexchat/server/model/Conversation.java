package com.nexchat.server.model;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import lombok.Builder;
import java.time.LocalDateTime;
import java.util.List;
import java.util.ArrayList;

@Entity
@Table(name = "conversations")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Conversation {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    // DIRECT = 1-on-1 chat between two people
    // GROUP  = group chat with multiple people
    private ConversationType type;

    // Only used for group chats — e.g. "Dev Team", "Family"
    // null for direct conversations
    private String name;

    // Group profile picture URL (Phase 3)
    private String groupPicUrl;

    @ManyToMany
    @JoinTable(
        name = "conversation_participants",
        joinColumns = @JoinColumn(name = "conversation_id"),
        inverseJoinColumns = @JoinColumn(name = "user_id")
    )
    // @ManyToMany — a conversation has many users
    // and a user can be in many conversations
    // Spring creates a join table "conversation_participants" automatically
    @Builder.Default
    private List<User> participants = new ArrayList<>();

    @Builder.Default
    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt = LocalDateTime.now();

    @Builder.Default
    // Updated every time a new message is sent
    // Used to sort conversations by most recent in the sidebar
    private LocalDateTime lastMessageAt = LocalDateTime.now();

    // Enum defined inside the same file for simplicity
    public enum ConversationType {
        DIRECT, GROUP
    }
}