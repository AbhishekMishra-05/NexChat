import { create } from 'zustand';

const useChatStore = create((set, get) => ({

  conversations: [],
  activeConversation: null,
  messages: [],

  setConversations: (conversations) => set({ conversations }),

  setActiveConversation: (conversation) => set({
    activeConversation: conversation,
    messages: []
  }),

  setMessages: (messages) => set({ messages }),

  // Deduplication fix — checks if message already exists by ID
  // before adding. Prevents double messages from WebSocket
  addMessage: (message) => set((state) => {
    const exists = state.messages.some((m) => m.id === message.id);
    if (exists) return state;
    return { messages: [...state.messages, message] };
  }),

  addConversation: (conversation) => set((state) => ({
    conversations: [conversation, ...state.conversations]
  })),

  updateConversationLastMessage: (conversationId, message) =>
    set((state) => ({
      conversations: state.conversations.map((conv) =>
        conv.id === conversationId
          ? {
              ...conv,
              lastMessage: message.content,
              lastMessageAt: message.timestamp
            }
          : conv
      )
    })),
}));

export default useChatStore;