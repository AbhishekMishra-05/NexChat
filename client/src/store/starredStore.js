import { create } from 'zustand';

const useStarredStore = create((set, get) => ({
  starred: JSON.parse(localStorage.getItem('nexchat_starred') || '[]'),

  starMessage: (message) => {
    const existing = get().starred.find(m => m.id === message.id);
    if (existing) return;
    const updated = [...get().starred, { ...message, starredAt: Date.now() }];
    localStorage.setItem('nexchat_starred', JSON.stringify(updated));
    set({ starred: updated });
  },

  unstarMessage: (messageId) => {
    const updated = get().starred.filter(m => m.id !== messageId);
    localStorage.setItem('nexchat_starred', JSON.stringify(updated));
    set({ starred: updated });
  },

  isStarred: (messageId) => {
    return get().starred.some(m => m.id === messageId);
  },
}));

export default useStarredStore;