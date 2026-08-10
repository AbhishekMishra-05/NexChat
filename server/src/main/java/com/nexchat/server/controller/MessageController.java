package com.nexchat.server.controller;

import com.nexchat.server.dto.ConversationDTO;
import com.nexchat.server.dto.CreateConversationRequest;
import com.nexchat.server.dto.MessageDTO;
import com.nexchat.server.model.Conversation;
import com.nexchat.server.model.Message;
import com.nexchat.server.model.User;
import com.nexchat.server.repository.ConversationRepository;
import com.nexchat.server.repository.MessageRepository;
import com.nexchat.server.service.ConversationService;
import com.nexchat.server.service.MessageService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class MessageController {

    private final ConversationService conversationService;
    private final MessageService messageService;
    private final MessageRepository messageRepository;
    private final ConversationRepository conversationRepository;

    // GET /api/conversations
    @GetMapping("/conversations")
    public ResponseEntity<List<ConversationDTO>> getConversations(
            @AuthenticationPrincipal User currentUser) {
        return ResponseEntity.ok(
            conversationService.getUserConversations(currentUser.getId())
        );
    }

    // POST /api/conversations
    @PostMapping("/conversations")
    public ResponseEntity<ConversationDTO> createConversation(
            @AuthenticationPrincipal User currentUser,
            @RequestBody CreateConversationRequest request) {
        ConversationDTO conversation;
        if ("GROUP".equals(request.getType())) {
            conversation = conversationService.createGroup(
                currentUser.getId(), request);
        } else {
            conversation = conversationService.createOrGetDirect(
                currentUser.getId(), request.getTargetUserId());
        }
        return ResponseEntity.ok(conversation);
    }

    // GET /api/conversations/{id}/messages
    @GetMapping("/conversations/{id}/messages")
    public ResponseEntity<List<MessageDTO>> getMessages(
            @PathVariable String id) {
        return ResponseEntity.ok(messageService.getHistory(id));
    }

    // POST /api/conversations/{id}/members
    // Add a member to a group
    @PostMapping("/conversations/{id}/members")
    public ResponseEntity<ConversationDTO> addMember(
            @PathVariable String id,
            @RequestBody Map<String, String> body) {
        return ResponseEntity.ok(
            conversationService.addMember(id, body.get("userId"))
        );
    }

    // DELETE /api/conversations/{id}/members/{userId}
    // Remove a member from a group
    @DeleteMapping("/conversations/{id}/members/{userId}")
    public ResponseEntity<ConversationDTO> removeMember(
            @PathVariable String id,
            @PathVariable String userId) {
        return ResponseEntity.ok(
            conversationService.removeMember(id, userId)
        );
    }

    // PUT /api/conversations/{id}/name
    // Update group name
    @PutMapping("/conversations/{id}/name")
    public ResponseEntity<ConversationDTO> updateGroupName(
            @PathVariable String id,
            @RequestBody Map<String, String> body) {
        return ResponseEntity.ok(
            conversationService.updateGroupName(id, body.get("name"))
        );
    }

    // DELETE /api/messages/{id}
    @DeleteMapping("/messages/{id}")
    public ResponseEntity<?> deleteMessage(
            @PathVariable String id,
            @AuthenticationPrincipal User currentUser) {
        Optional<Message> msgOpt = messageRepository.findById(id);
        if (msgOpt.isEmpty()) return ResponseEntity.notFound().build();
        Message msg = msgOpt.get();
        if (!msg.getSender().getId().equals(currentUser.getId())) {
            return ResponseEntity.status(403).build();
        }
        messageRepository.delete(msg);
        return ResponseEntity.ok(Map.of("deleted", true, "id", id));
    }

    // DELETE /api/conversations/{id}
    @DeleteMapping("/conversations/{id}")
    public ResponseEntity<?> deleteConversation(
            @PathVariable String id,
            @AuthenticationPrincipal User currentUser) {
        Optional<Conversation> convOpt = conversationRepository.findById(id);
        if (convOpt.isEmpty()) return ResponseEntity.notFound().build();
        Conversation conv = convOpt.get();
        boolean isParticipant = conv.getParticipants().stream()
            .anyMatch(p -> p.getId().equals(currentUser.getId()));
        if (!isParticipant) return ResponseEntity.status(403).build();
        List<Message> msgs = messageRepository
            .findByConversationOrderByTimestampAsc(conv);
        messageRepository.deleteAll(msgs);
        conversationRepository.delete(conv);
        return ResponseEntity.ok(Map.of("deleted", true));
    }

    // PUT /api/messages/{id}
    @PutMapping("/messages/{id}")
    public ResponseEntity<?> editMessage(
            @PathVariable String id,
            @AuthenticationPrincipal User currentUser,
            @RequestBody Map<String, String> body) {
        Optional<Message> msgOpt = messageRepository.findById(id);
        if (msgOpt.isEmpty()) return ResponseEntity.notFound().build();
        Message msg = msgOpt.get();
        if (!msg.getSender().getId().equals(currentUser.getId())) {
            return ResponseEntity.status(403).build();
        }
        msg.setContent(body.get("content"));
        messageRepository.save(msg);
        return ResponseEntity.ok(Map.of("id", msg.getId(),
            "content", msg.getContent()));
    }
}