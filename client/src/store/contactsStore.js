import { create } from 'zustand';

// Contacts are stored in localStorage
// Each contact: { id, userId, savedName, phone, username, displayName }

const useContactsStore = create((set, get) => ({

  contacts: JSON.parse(localStorage.getItem('nexchat_contacts') || '[]'),

  // Save or update a contact
  saveContact: (contact) => {
    const current = get().contacts;
    const exists = current.findIndex(c => c.userId === contact.userId);
    let updated;
    if (exists >= 0) {
      updated = current.map((c, i) =>
        i === exists ? { ...c, ...contact } : c
      );
    } else {
      updated = [...current, {
        id: Date.now().toString(),
        ...contact
      }];
    }
    localStorage.setItem('nexchat_contacts', JSON.stringify(updated));
    set({ contacts: updated });
  },

  // Delete a contact
  deleteContact: (userId) => {
    const updated = get().contacts.filter(c => c.userId !== userId);
    localStorage.setItem('nexchat_contacts', JSON.stringify(updated));
    set({ contacts: updated });
  },

  // Get saved name for a user (returns savedName or null)
  getSavedName: (userId) => {
    const contact = get().contacts.find(c => c.userId === userId);
    return contact?.savedName || null;
  },

  // Search contacts by saved name or username
  searchContacts: (query) => {
    if (!query.trim()) return get().contacts;
    const q = query.toLowerCase();
    return get().contacts.filter(c =>
      c.savedName?.toLowerCase().includes(q) ||
      c.username?.toLowerCase().includes(q) ||
      c.displayName?.toLowerCase().includes(q)
    );
  },
}));

export default useContactsStore;