import { create } from 'zustand';

const useAuthStore = create((set) => ({
  // The logged-in user object
  // { id, username, email, displayName, profilePicUrl }
  user: null,

  // The JWT token — sent with every API request
  token: localStorage.getItem('token') || null,
  // We read from localStorage on startup so the user
  // stays logged in even after refreshing the page

  // Called after successful login or register
  // Saves user and token to state and localStorage
  login: (user, token) => {
    localStorage.setItem('token', token);
    // Store token in localStorage so it persists across page refreshes
    set({ user, token });
  },

  // Called when user logs out
  // Clears everything from state and localStorage
  logout: () => {
    localStorage.removeItem('token');
    set({ user: null, token: null });
  },

  // Called to update user profile info
  // Used in Phase 3 when profile picture is uploaded
  setUser: (user) => set({ user }),
}));

export default useAuthStore;