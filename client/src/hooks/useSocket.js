import { useEffect, useRef } from 'react';
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import useAuthStore from '../store/authStore';
import useChatStore from '../store/chatStore';

const useSocket = () => {
  const clientRef = useRef(null);
  const subscriptionRef = useRef(null);
  const { token } = useAuthStore();
  const { activeConversation, addMessage, updateConversationLastMessage }
    = useChatStore();

  // Connect to WebSocket when user is logged in
  useEffect(() => {
    if (!token) return;

    const client = new Client({
      webSocketFactory: () =>
        new SockJS('http://localhost:8081/ws'),
      connectHeaders: {
        Authorization: `Bearer ${token}`,
      },
      reconnectDelay: 5000,
      onConnect: () => {
        console.log('WebSocket connected');
      },
      onDisconnect: () => {
        console.log('WebSocket disconnected');
      },
      onStompError: (frame) => {
        console.error('STOMP error:', frame);
      },
    });

    client.activate();
    clientRef.current = client;

    return () => {
      client.deactivate();
    };
  }, [token]);

  // Subscribe to active conversation
  useEffect(() => {
    if (!activeConversation) return;

    const subscribeToConversation = () => {
      // Unsubscribe from previous conversation first
      if (subscriptionRef.current) {
        subscriptionRef.current.unsubscribe();
        subscriptionRef.current = null;
      }

      const client = clientRef.current;
      if (!client || !client.connected) return;

      subscriptionRef.current = client.subscribe(
        `/topic/conversations/${activeConversation.id}`,
        (message) => {
          const receivedMessage = JSON.parse(message.body);
          addMessage(receivedMessage);
          updateConversationLastMessage(
            activeConversation.id,
            receivedMessage
          );
        }
      );
    };

    const client = clientRef.current;

    if (client && client.connected) {
      // Already connected — subscribe immediately
      subscribeToConversation();
    } else if (client) {
      // Not connected yet — subscribe when connected
      const originalOnConnect = client.onConnect;
      client.onConnect = (frame) => {
        if (originalOnConnect) originalOnConnect(frame);
        subscribeToConversation();
      };
    }

    return () => {
      if (subscriptionRef.current) {
        subscriptionRef.current.unsubscribe();
        subscriptionRef.current = null;
      }
    };
  }, [activeConversation?.id]);

  const sendMessage = (conversationId, senderId, content, messageType = 'TEXT') => {
    const client = clientRef.current;
    if (!client || !client.connected) return;

    client.publish({
      destination: '/app/chat.send',
      body: JSON.stringify({
        conversationId,
        senderId,
        content,
        messageType,
      }),
    });
  };

  const sendTyping = (conversationId, userId, username, typing) => {
    const client = clientRef.current;
    if (!client || !client.connected) return;

    client.publish({
      destination: '/app/chat.typing',
      body: JSON.stringify({
        conversationId,
        userId,
        username,
        typing,
      }),
    });
  };

  return { sendMessage, sendTyping, client: clientRef.current };
};

export default useSocket;