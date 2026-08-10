import { create } from 'zustand';

// Stores locked chats with their PINs (hashed)
// { conversationId: { pin: "1234", locked: true } }

const hashPin = (pin) => {
  // Simple hash for PIN storage
  let hash = 0;
  for (let i = 0; i < pin.length; i++) {
    hash = ((hash << 5) - hash) + pin.charCodeAt(i);
    hash |= 0;
  }
  return hash.toString();
};

const useChatLockStore = create((set, get) => ({
  locks: JSON.parse(localStorage.getItem('nexchat_locks') || '{}'),

  // Lock a conversation with a PIN
  lockChat: (conversationId, pin) => {
    const locks = {
      ...get().locks,
      [conversationId]: {
        pinHash: hashPin(pin),
        locked: true,
      }
    };
    localStorage.setItem('nexchat_locks', JSON.stringify(locks));
    set({ locks });
  },

  // Unlock a conversation
  unlockChat: (conversationId) => {
    const locks = { ...get().locks };
    if (locks[conversationId]) {
      locks[conversationId] = {
        ...locks[conversationId],
        locked: false,
      };
      localStorage.setItem('nexchat_locks', JSON.stringify(locks));
      set({ locks });
    }
  },

  // Remove lock entirely
  removeLock: (conversationId) => {
    const locks = { ...get().locks };
    delete locks[conversationId];
    localStorage.setItem('nexchat_locks', JSON.stringify(locks));
    set({ locks });
  },

  // Verify PIN
  verifyPin: (conversationId, pin) => {
    const lock = get().locks[conversationId];
    if (!lock) return true;
    return lock.pinHash === hashPin(pin);
  },

  // Check if chat is locked
  isLocked: (conversationId) => {
    const lock = get().locks[conversationId];
    return lock?.locked === true;
  },

  // Check if chat has a lock set
  hasLock: (conversationId) => {
    return !!get().locks[conversationId];
  },
}));

export default useChatLockStore;