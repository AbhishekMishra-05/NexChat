import { create } from 'zustand';

const useCallStore = create((set) => ({

  // Is a call currently active
  inCall: false,

  // "audio" or "video"
  callType: null,

  // The user object of the person you are calling
  // or who is calling you
  remoteUser: null,

  // Whether this user initiated the call or received it
  isIncoming: false,

  // WebRTC signaling data (used in Phase 4)
  incomingOffer: null,

  // Called when user taps the call button
  // Opens the CallOverlay
  startCall: (remoteUser, callType) => set({
    inCall: true,
    callType,
    remoteUser,
    isIncoming: false,
  }),

  // Called when an incoming call arrives over WebSocket
  // Shows the incoming call UI
  receiveCall: (remoteUser, callType, offer) => set({
    inCall: true,
    callType,
    remoteUser,
    isIncoming: true,
    incomingOffer: offer,
  }),

  // Called when call ends — either side hangs up
  // Clears everything and hides the overlay
  endCall: () => set({
    inCall: false,
    callType: null,
    remoteUser: null,
    isIncoming: false,
    incomingOffer: null,
  }),
}));

export default useCallStore;