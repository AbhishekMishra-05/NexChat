import { useRef, useEffect, useState } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Client } from "@stomp/stompjs";
import SockJS from "sockjs-client";
import Login from "./components/auth/Login";
import Register from "./components/auth/Register";
import useAuthStore from "./store/authStore";
import useCallStore from "./store/callStore";
import Sidebar from "./components/sidebar/Sidebar";
import ChatWindow from "./components/chat/ChatWindow";
import CallOverlay from "./components/call/CallOverlay";
import SettingsPanel from "./components/settings/SettingsPanel";
import StatusPage from "./components/status/StatusPage";
import CreateGroupModal from "./components/groups/CreateGroupModal";
import useChatStore from "./store/chatStore";
import ContactsModal from "./components/contacts/ContactsModal";

const ProtectedRoute = ({ children }) => {
  const { token } = useAuthStore();
  if (!token) return <Navigate to="/login" replace />;
  return children;
};

const ChatLayout = () => {
  const { token, user } = useAuthStore();
  const { receiveCall } = useCallStore();
  const {
    addMessage,
    updateConversationLastMessage,
    activeConversation,
    setConversations,
    conversations,
  } = useChatStore();
  const clientRef = useRef(null);
  const subscriptionRef = useRef(null);

  const [showSettings, setShowSettings] = useState(false);
  const [showStatus, setShowStatus] = useState(false);
  const [showGroup, setShowGroup] = useState(false);
  const [showHomeMenu, setShowHomeMenu] = useState(false);
  const [profileModal, setProfileModal] = useState(null);
  const [showContacts, setShowContacts] = useState(false);
  // Sort conversations by most recent on update
  useEffect(() => {
    if (conversations.length > 0) {
      const sorted = [...conversations].sort(
        (a, b) => new Date(b.lastMessageAt) - new Date(a.lastMessageAt),
      );
      // Only update if order changed
      const sameOrder = sorted.every((c, i) => c.id === conversations[i]?.id);
      if (!sameOrder) setConversations(sorted);
    }
    
    // Subscribe to read receipts
    if (!clientRef.current || !activeConversation) return;

const readSub = clientRef.current.subscribe(
  `/topic/conversations/${activeConversation.id}/read`,
  (msg) => {
    const event = JSON.parse(msg.body);

    const { messages, setMessages } = useChatStore.getState();

    setMessages(
      messages.map((m) => ({
        ...m,
        readBy: m.readBy?.includes(event.readerId)
          ? m.readBy
          : [...(m.readBy || []), event.readerId],
      }))
    );
  }
);

return () => {
  readSub.unsubscribe();
}; },[conversations, activeConversation]);

  // WebSocket setup
  useEffect(() => {
    if (!token || !user) return;
    const client = new Client({
      webSocketFactory: () => new SockJS("http://localhost:8081/ws"),
      connectHeaders: { Authorization: `Bearer ${token}` },
      reconnectDelay: 5000,
      onConnect: () => {
        console.log("WebSocket connected");
        client.subscribe(`/topic/signal/${user.id}`, (msg) => {
          const signal = JSON.parse(msg.body);
          handleSignal(signal);
        });
        // Subscribe to read receipts for all conversations
        client.subscribe(
          `/topic/conversations/+/read`,
          () => {}, // handled per conversation below
        );
      },
    });
    client.activate();
    clientRef.current = client;
    return () => client.deactivate();
  }, [token, user]);

  // Subscribe to active conversation
  useEffect(() => {
    const client = clientRef.current;
    if (!client || !activeConversation) return;
    if (subscriptionRef.current) {
      subscriptionRef.current.unsubscribe();
      subscriptionRef.current = null;
    }
    const subscribe = () => {
      subscriptionRef.current = client.subscribe(
        `/topic/conversations/${activeConversation.id}`,
        (msg) => {
          const received = JSON.parse(msg.body);
          addMessage(received);
          updateConversationLastMessage(activeConversation.id, received);
        },
      );
    };
    if (client.connected) subscribe();
    else {
      const prev = client.onConnect;
      client.onConnect = (f) => {
        if (prev) prev(f);
        subscribe();
      };
    }
    return () => {
      if (subscriptionRef.current) {
        subscriptionRef.current.unsubscribe();
        subscriptionRef.current = null;
      }
    };
  }, [activeConversation?.id]);

  const handleSignal = (signal) => {
    if (signal.type === "offer") {
      receiveCall(
        {
          id: signal.senderId,
          username: signal.senderUsername,
          displayName: signal.senderDisplayName,
        },
        signal.callType,
        signal.data,
      );
    } else {
      window.dispatchEvent(
        new CustomEvent("webrtc-signal", { detail: signal }),
      );
    }
  };

  const initials = (name) =>
    (name || "U")
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);

  return (
    <div className="flex h-screen bg-gray-950 overflow-hidden">
      <Sidebar
        stompClient={clientRef.current}
        onShowStatus={() => setShowStatus(true)}
        onShowGroup={() => setShowGroup(true)}
        onShowSettings={() => setShowSettings(true)}
        onShowContacts={() => setShowContacts(true)}
        onProfileClick={setProfileModal}
      />

      <ChatWindow
        stompClient={clientRef.current}
        onProfileClick={setProfileModal}
      />

      <CallOverlay stompClient={clientRef.current} />

      {/* Settings */}
      {showSettings && <SettingsPanel onClose={() => setShowSettings(false)} />}

      {/* Status */}
      {showStatus && <StatusPage onClose={() => setShowStatus(false)} />}

      {/* Create Group */}
      {showGroup && <CreateGroupModal onClose={() => setShowGroup(false)} />}
      {/* Contacts */}
      {showContacts && (
        <ContactsModal
          onClose={() => setShowContacts(false)}
          onStartChat={async (contact) => {
            try {
              const res = await api.post("/api/conversations", {
                targetUserId: contact.userId,
                type: "DIRECT",
              });
              const {
                addConversation,
                setActiveConversation,
                setMessages,
                conversations,
              } = useChatStore.getState();
              const exists = conversations.find((c) => c.id === res.data.id);
              if (!exists) addConversation(res.data);
              setActiveConversation(res.data);
              setMessages([]);
            } catch {}
          }}
        />
      )}
      {/* Profile Modal */}
      {profileModal && (
        <div
          className="fixed inset-0 z-40 bg-black/60 flex
                        items-end sm:items-center justify-center p-4"
        >
          <div
            className="bg-gray-900 border border-gray-700
                          rounded-2xl w-full max-w-sm overflow-hidden"
          >
            {/* Banner */}
            <div
              className="h-24 bg-gradient-to-br from-emerald-600
                            to-emerald-800 relative"
            >
              <button
                onClick={() => setProfileModal(null)}
                className="absolute top-3 right-3 w-7 h-7 rounded-full
                           bg-black/30 flex items-center justify-center
                           text-white text-sm hover:bg-black/50"
              >
                ✕
              </button>
              <div
                className="absolute -bottom-8 left-6
                              w-16 h-16 rounded-full bg-emerald-600
                              border-4 border-gray-900 flex items-center
                              justify-center text-white text-2xl font-bold"
              >
                {initials(profileModal.displayName || profileModal.username)}
              </div>
            </div>

            {/* Info */}
            <div className="px-6 pt-12 pb-6">
              <h3 className="text-white text-xl font-bold">
                {profileModal.displayName || profileModal.username}
              </h3>
              <p className="text-gray-400 text-sm">@{profileModal.username}</p>
              <div className="flex items-center gap-2 mt-2">
                <div
                  className={`w-2 h-2 rounded-full ${
                    profileModal.online ? "bg-emerald-400" : "bg-gray-500"
                  }`}
                />
                <span className="text-sm text-gray-400">
                  {profileModal.online ? "Online" : "Offline"}
                </span>
              </div>

              {profileModal.id !== user?.id && (
                <div className="flex gap-3 mt-5">
                  <button
                    onClick={() => setProfileModal(null)}
                    className="flex-1 py-2.5 bg-emerald-500
                               hover:bg-emerald-600 text-white text-sm
                               rounded-xl font-medium transition-colors"
                  >
                    Message
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const App = () => (
  <BrowserRouter>
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route
        path="/chat"
        element={
          <ProtectedRoute>
            <ChatLayout />
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  </BrowserRouter>
);

export default App;
