package com.nexchat.server.repository;

import com.nexchat.server.model.Conversation;
import com.nexchat.server.model.Message;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface MessageRepository extends JpaRepository<Message, String> {

    // Load all messages for a conversation ordered oldest → newest
    // Used when a user opens a chat to load the full history
    // Spring generates:
    // SELECT * FROM messages
    // WHERE conversation_id = ?
    // ORDER BY timestamp ASC
    List<Message> findByConversationOrderByTimestampAsc(
        Conversation conversation
    );

    // Load only the last 50 messages for a conversation
    // Used for initial load — avoids loading thousands of messages at once
    // Spring generates:
    // SELECT * FROM messages
    // WHERE conversation_id = ?
    // ORDER BY timestamp DESC
    // LIMIT 50
    List<Message> findTop50ByConversationOrderByTimestampDesc(
        Conversation conversation
    );
}