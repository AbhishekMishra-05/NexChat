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
@Table(name = "messages")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Message {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    @ManyToOne
    @JoinColumn(name = "conversation_id", nullable = false)
    // @ManyToOne — many messages belong to one conversation
    // @JoinColumn — creates a "conversation_id" foreign key column
    private Conversation conversation;

    @ManyToOne
    @JoinColumn(name = "sender_id", nullable = false)
    // many messages can be sent by one user
    private User sender;

    @Column(columnDefinition = "TEXT")
    // TEXT type allows long messages
    // For media messages this stores the URL instead of text
    private String content;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    // TEXT  — regular text message
    // IMAGE — content holds the image URL
    // AUDIO — content holds the audio file URL
    // VIDEO — content holds the video file URL
    // GIF   — content holds the GIF URL
    private MessageType messageType;

    @Builder.Default
    @Column(nullable = false)
    private LocalDateTime timestamp = LocalDateTime.now();

    @ElementCollection
    @CollectionTable(
        name = "message_read_by",
        joinColumns = @JoinColumn(name = "message_id")
    )
    @Column(name = "user_id")
    // Stores which users have read this message
    // Used for read receipts (single tick → double tick → blue tick)
    @Builder.Default
    private List<String> readBy = new ArrayList<>();

    public enum MessageType {
        TEXT,
        IMAGE,
        AUDIO,
        VIDEO,
        GIF
    }
}