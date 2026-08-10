import { create } from 'zustand';

const useBlockStore = create((set, get) => ({
  blocked: JSON.parse(
    localStorage.getItem('nexchat_blocked') || '{}'
  ),

  blockUser: (userId, username) => {
    const updated = { ...get().blocked, [userId]: { username, blockedAt: Date.now() } };
    localStorage.setItem('nexchat_blocked', JSON.stringify(updated));
    set({ blocked: updated });
  },

  unblockUser: (userId) => {
    const updated = { ...get().blocked };
    delete updated[userId];
    localStorage.setItem('nexchat_blocked', JSON.stringify(updated));
    set({ blocked: updated });
  },

  isBlocked: (userId) => !!get().blocked[userId],

  getBlockedList: () => Object.entries(get().blocked).map(
    ([id, data]) => ({ id, ...data })
  ),
}));

export default useBlockStore;