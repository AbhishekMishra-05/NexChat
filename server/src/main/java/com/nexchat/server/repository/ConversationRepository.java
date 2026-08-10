package com.nexchat.server.repository;

import com.nexchat.server.model.Conversation;
import com.nexchat.server.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ConversationRepository extends JpaRepository<Conversation, String> {

    // Find all conversations that a specific user is part of
    // Used to populate the sidebar with the user's chat list
    // Spring generates:
    // SELECT c FROM conversations c
    // JOIN conversation_participants cp ON c.id = cp.conversation_id
    // WHERE cp.user_id = ?
    List<Conversation> findByParticipantsContaining(User user);

    // Find an existing DIRECT conversation between exactly two users
    // Used when starting a new chat — if one already exists, reuse it
    @Query("""
        SELECT c FROM Conversation c
        WHERE c.type = 'DIRECT'
        AND :user1 MEMBER OF c.participants
        AND :user2 MEMBER OF c.participants
    """)
    Optional<Conversation> findDirectConversation(
        @Param("user1") User user1,
        @Param("user2") User user2
    );
}