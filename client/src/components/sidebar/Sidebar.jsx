import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../api/axios";
import useAuthStore from "../../store/authStore";
import useChatStore from "../../store/chatStore";
import useCallStore from "../../store/callStore";
import CameraModal from "../camera/CameraModal";
import useContactsStore from "../../store/contactsStore";

const Sidebar = ({
  stompClient,
  onShowStatus,
  onShowGroup,
  onShowSettings,
  onProfileClick,
  onShowContacts,
}) => {
  const { contacts } = useContactsStore();
  const [searchResults, setSearchResults] = useState([]);
  const [showSidebarCamera, setShowSidebarCamera] = useState(false);
  const { user, logout } = useAuthStore();
  const {
    conversations,
    activeConversation,
    setConversations,
    setActiveConversation,
    setMessages,
    addConversation,
  } = useChatStore();
  const { startCall } = useCallStore();
  const navigate = useNavigate();

  const [tab, setTab] = useState("chats"); // chats | calls
  const [search, setSearch] = useState("");
  const [showNewChat, setShowNewChat] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [profileUser, setProfileUser] = useState(null);
  const [searchUsername, setSearchUsername] = useState("");
  const [searchResult, setSearchResult] = useState(null);
  const [searchError, setSearchError] = useState("");
  const [searching, setSearching] = useState(false);
  const [contextMenu, setContextMenu] = useState(null);
  // { x, y, conversation }
  const [callLogs, setCallLogs] = useState([]);
  const contextRef = useRef(null);
  const [showHomeMenu, setShowHomeMenu] = useState(false);

  // Load conversations
  useEffect(() => {
    const load = async () => {
      try {
        const res = await api.get("/api/conversations");
        // Sort by most recent
        const sorted = res.data.sort(
          (a, b) => new Date(b.lastMessageAt) - new Date(a.lastMessageAt),
        );
        setConversations(sorted);
      } catch (e) {
        console.error(e);
      }
    };
    load();
  }, []);

  // Close context menu on outside click
  useEffect(() => {
    const handler = (e) => {
      if (contextRef.current && !contextRef.current.contains(e.target)) {
        setContextMenu(null);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleSelectConversation = async (conv) => {
    setContextMenu(null);
    setActiveConversation(conv);
    try {
      const res = await api.get(`/api/conversations/${conv.id}/messages`);
      setMessages(res.data);
    } catch (e) {
      console.error(e);
    }
  };

  const handleSearch = async () => {
    if (!searchUsername.trim()) return;
    setSearching(true);
    setSearchError("");
    setSearchResult(null);

    const query = searchUsername.trim();

    // 1. Search saved contacts first
    const contactMatch = contacts.find(
      (c) =>
        c.savedName?.toLowerCase().includes(query.toLowerCase()) ||
        c.username?.toLowerCase().includes(query.toLowerCase()) ||
        c.phone?.includes(query),
    );

    if (contactMatch && contactMatch.userId) {
      setSearchResult({
        id: contactMatch.userId,
        username: contactMatch.username,
        displayName: contactMatch.savedName,
        online: contactMatch.online,
      });
      setSearching(false);
      return;
    }

    // 2. Search existing conversations
    const convMatch = conversations.find((c) => {
      const other = c.participants?.find((p) => p.id !== user.id);
      return (
        other?.username?.toLowerCase().includes(query.toLowerCase()) ||
        other?.displayName?.toLowerCase().includes(query.toLowerCase())
      );
    });

    if (convMatch) {
      const other = convMatch.participants?.find((p) => p.id !== user.id);
      setSearchResult({
        id: other.id,
        username: other.username,
        displayName: other.displayName,
        online: other.online,
      });
      setSearching(false);
      return;
    }

    // 3. Search backend by username or name
    try {
      const res = await api.get(
        `/api/users/search-by-name?name=${encodeURIComponent(query)}`,
      );
      if (res.data.length === 1) {
        setSearchResult(res.data[0]);
      } else if (res.data.length > 1) {
        setSearchResults(res.data);
      } else {
        // Try exact username
        const exact = await api.get(
          `/api/users/search?username=${encodeURIComponent(query)}`,
        );
        setSearchResult(exact.data);
      }
    } catch {
      setSearchError("No user found. Try a different name or username.");
    } finally {
      setSearching(false);
    }
  };

  const handleStartChat = async () => {
    if (!searchResult) return;

    try {
      // Check if conversation already exists
      const existing = conversations.find((c) => {
        if (c.type !== "DIRECT") return false;

        return c.participants?.some((p) => p.id === searchResult.id);
      });

      if (existing) {
        await handleSelectConversation(existing);
        setShowNewChat(false);
        setSearchResult(null);
        setSearchUsername("");
        setSearchResults([]);
        return;
      }

      // Create new conversation
      const res = await api.post("/api/conversations", {
        type: "DIRECT",
        targetUserId: searchResult.id,
      });

      const newConversation = res.data;

      addConversation(newConversation);
      await handleSelectConversation(newConversation);

      setShowNewChat(false);
      setSearchResult(null);
      setSearchUsername("");
      setSearchResults([]);
    } catch (err) {
      console.error("Failed to start chat:", err);
    }
  };

  const handleDeleteConversation = async (conv) => {
    setContextMenu(null);
    if (!window.confirm("Delete this conversation?")) return;
    try {
      await api.delete(`/api/conversations/${conv.id}`);
      setConversations(conversations.filter((c) => c.id !== conv.id));
      if (activeConversation?.id === conv.id) {
        setActiveConversation(null);
        setMessages([]);
      }
    } catch {
      // If endpoint doesn't exist yet, just remove from UI
      setConversations(conversations.filter((c) => c.id !== conv.id));
      if (activeConversation?.id === conv.id) {
        setActiveConversation(null);
        setMessages([]);
      }
    }
  };

  const handleViewProfile = (conv) => {
    setContextMenu(null);
    const other = conv.participants?.find((p) => p.id !== user?.id);
    if (other) {
      setProfileUser(other);
      setShowProfile(true);
    }
  };

  const handleCallFromProfile = (callType) => {
    if (!profileUser) return;
    setShowProfile(false);
    startCall(profileUser, callType);
  };

  const getConvName = (conv) => {
    if (conv.type === "GROUP") return conv.name || "Group Chat";
    const other = conv.participants?.find((p) => p.id !== user?.id);
    return other?.displayName || other?.username || "Unknown";
  };

  const getOtherUser = (conv) =>
    conv.participants?.find((p) => p.id !== user?.id);

  const getInitials = (name) =>
    (name || "U")
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);

  const fmtTime = (ts) => {
    if (!ts) return "";
    const d = new Date(ts);
    const now = new Date();
    const diff = now - d;
    if (diff < 86400000) {
      return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    }
    if (diff < 604800000) {
      return d.toLocaleDateString([], { weekday: "short" });
    }
    return d.toLocaleDateString([], { day: "2-digit", month: "short" });
  };

  const filteredConvs = conversations.filter((conv) => {
    const name = getConvName(conv).toLowerCase();
    return name.includes(search.toLowerCase());
  });

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  // Avatar colors
  const avatarColors = [
    "bg-emerald-600",
    "bg-blue-600",
    "bg-purple-600",
    "bg-orange-600",
    "bg-pink-600",
    "bg-teal-600",
  ];
  const getColor = (name) =>
    avatarColors[(name?.charCodeAt(0) || 0) % avatarColors.length];

  // Keep media URLs out of the conversation preview.
  // The backend currently exposes the latest message as `lastMessage`,
  // which may contain the actual GIF/image/audio/video URL.
  const getLastMessagePreview = (conv) => {
    const lastMessage = conv?.lastMessage;

    if (!lastMessage) return "No messages yet";

    // If the backend already sends messageType, prefer it.
    const messageType = String(
      conv?.lastMessageType || conv?.messageType || ""
    ).toUpperCase();

    if (messageType === "GIF") return "GIF";
    if (messageType === "IMAGE") return "📷 Image";
    if (messageType === "AUDIO") return "🎵 Audio";
    if (messageType === "VIDEO") return "🎥 Video";

    const value = String(lastMessage).trim();

    // GIF URLs from GIPHY should never be displayed as raw links.
    if (
      /(^|https?:\/\/)(media\d*\.giphy\.com|giphy\.com)/i.test(value) ||
      /\.gif(\?|$)/i.test(value)
    ) {
      return "GIF";
    }

    // Hide other direct media URLs from the sidebar preview as well.
    if (
      /^https?:\/\//i.test(value) &&
      /\.(jpg|jpeg|png|webp|gif|mp4|webm|mov|mp3|wav|ogg)(\?|$)/i.test(value)
    ) {
      if (/\.(mp4|webm|mov)(\?|$)/i.test(value)) return "🎥 Video";
      if (/\.(mp3|wav|ogg)(\?|$)/i.test(value)) return "🎵 Audio";
      return "📷 Image";
    }

    return value;
  };

  return (
    <div
      className="w-80 bg-gray-900 border-r border-gray-800
                    flex flex-col h-full relative"
    >
      {/* Header */}
      <div
        className="px-4 pt-4 pb-2 flex items-center
                justify-between border-b border-gray-800"
      >
        {/* Profile button */}
        <button
          onClick={() => {
            setProfileUser(user);
            setShowProfile(true);
          }}
          className="flex items-center gap-3 hover:bg-gray-800
               rounded-xl p-2 -ml-2 transition-colors flex-1 min-w-0"
        >
          <div
            className={`w-9 h-9 rounded-full ${getColor(user?.displayName)}
                     flex items-center justify-center
                     text-white text-sm font-semibold flex-shrink-0`}
          >
            {getInitials(user?.displayName || user?.username)}
          </div>
          <div className="text-left min-w-0">
            <div className="text-white text-sm font-medium leading-tight truncate">
              {user?.displayName}
            </div>
            <div className="text-gray-500 text-xs">@{user?.username}</div>
          </div>
        </button>

        <div className="flex items-center gap-1 flex-shrink-0">
          {/* Camera button */}
          <button
            onClick={() => setShowSidebarCamera(true)}
            className="w-9 h-9 rounded-full hover:bg-gray-800
                 flex items-center justify-center transition-colors
                 text-gray-400 hover:text-white"
            title="Camera"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              className="w-5 h-5"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0zM18.75 10.5h.008v.008h-.008V10.5z"
              />
            </svg>
          </button>

          {/* Status button */}
          <button
            onClick={() => onShowStatus?.()}
            className="w-9 h-9 rounded-full hover:bg-gray-800
                 flex items-center justify-center transition-colors
                 text-gray-400 hover:text-white"
            title="Status"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              className="w-5 h-5"
            >
              <circle cx="12" cy="12" r="10" />
              <circle cx="12" cy="12" r="3" />
            </svg>
          </button>

          {/* New Chat (+) button */}
          <button
            onClick={() => setShowNewChat(true)}
            className="w-9 h-9 rounded-full hover:bg-gray-800
                 flex items-center justify-center transition-colors
                 text-gray-400 hover:text-white"
            title="New chat"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              className="w-5 h-5"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 4.5v15m7.5-7.5h-15"
              />
            </svg>
          </button>

          {/* 3-bar menu */}
          <div className="relative">
            <button
              onClick={() => setShowHomeMenu(!showHomeMenu)}
              className="w-9 h-9 rounded-full hover:bg-gray-800
                   flex items-center justify-center transition-colors"
            >
              <svg
                viewBox="0 0 24 24"
                fill="currentColor"
                className="w-5 h-5 text-gray-400"
              >
                <path
                  fillRule="evenodd"
                  clipRule="evenodd"
                  d="M3 6.75A.75.75 0 013.75 6h16.5a.75.75 0 010 1.5H3.75A.75.75 0 013 6.75zM3 12a.75.75 0 01.75-.75h16.5a.75.75 0 010 1.5H3.75A.75.75 0 013 12zm0 5.25a.75.75 0 01.75-.75h16.5a.75.75 0 010 1.5H3.75a.75.75 0 01-.75-.75z"
                />
              </svg>
            </button>

            {showHomeMenu && (
              <div
                className="absolute right-0 top-11 z-30 bg-gray-800
                        border border-gray-700 rounded-2xl shadow-2xl
                        py-1.5 min-w-44"
              >
                <button
                  onClick={() => {
                    setShowHomeMenu(false);
                    onShowGroup?.();
                  }}
                  className="w-full px-4 py-2.5 text-left text-sm text-white
                       hover:bg-gray-700 flex items-center gap-3"
                >
                  <span>👥</span> New Group
                </button>
                <button
                  onClick={() => {
                    setShowHomeMenu(false);
                    onShowContacts?.();
                  }}
                  className="w-full px-4 py-2.5 text-left text-sm text-white
                       hover:bg-gray-700 flex items-center gap-3"
                >
                  <span>📱</span> Add Contact
                </button>
                <div className="h-px bg-gray-700 my-1" />
                <button
                  onClick={() => {
                    setShowHomeMenu(false);
                    onShowSettings?.();
                  }}
                  className="w-full px-4 py-2.5 text-left text-sm text-white
                       hover:bg-gray-700 flex items-center gap-3"
                >
                  <span>⚙️</span> Settings
                </button>
                <button
                  onClick={handleLogout}
                  className="w-full px-4 py-2.5 text-left text-sm text-red-400
                       hover:bg-gray-700 flex items-center gap-3"
                >
                  <span>🚪</span> Logout
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="px-4 py-3">
        <div
          className="flex items-center gap-2 bg-gray-800
                        rounded-xl px-3 py-2 border border-gray-700/50"
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            className="w-4 h-4 text-gray-500 flex-shrink-0"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
            />
          </svg>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search chats..."
            className="flex-1 bg-transparent text-sm text-white
                       placeholder-gray-500 focus:outline-none"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="text-gray-500 hover:text-white"
            >
              <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                <path
                  fillRule="evenodd"
                  clipRule="evenodd"
                  d="M5.47 5.47a.75.75 0 011.06 0L12 10.94l5.47-5.47a.75.75 0 111.06 1.06L13.06 12l5.47 5.47a.75.75 0 11-1.06 1.06L12 13.06l-5.47 5.47a.75.75 0 01-1.06-1.06L10.94 12 5.47 6.53a.75.75 0 010-1.06z"
                />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex px-4 gap-1 mb-1">
        {["chats", "calls"].map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 py-2 rounded-xl text-sm font-medium
                        transition-colors capitalize
                        ${
                          tab === t
                            ? "bg-emerald-500/20 text-emerald-400"
                            : "text-gray-500 hover:text-gray-300"
                        }`}
          >
            {t === "chats" ? "💬 Chats" : "📞 Calls"}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {/* ── CHATS TAB ─────────────────────────────────────── */}
        {tab === "chats" && (
          <>
            {filteredConvs.length === 0 ? (
              <div className="text-center py-12 px-4">
                <div className="text-4xl mb-3">💬</div>
                <p className="text-gray-500 text-sm">
                  {search ? "No chats found" : "No conversations yet"}
                </p>
                {!search && (
                  <button
                    onClick={() => setShowNewChat(true)}
                    className="mt-3 text-emerald-400 text-sm
                               hover:underline"
                  >
                    Start a new chat
                  </button>
                )}
              </div>
            ) : (
              filteredConvs.map((conv) => {
                const name = getConvName(conv);
                const isActive = activeConversation?.id === conv.id;
                const other = getOtherUser(conv);
                const isOnline = other?.online;

                return (
                  <div
                    key={conv.id}
                    onClick={() => handleSelectConversation(conv)}
                    onContextMenu={(e) => {
                      e.preventDefault();
                      setContextMenu({ x: e.clientX, y: e.clientY, conv });
                    }}
                    className={`flex items-center gap-3 px-4 py-3
                                cursor-pointer transition-colors
                                border-b border-gray-800/40 select-none
                                ${
                                  isActive
                                    ? "bg-emerald-500/10 border-l-2 border-l-emerald-500"
                                    : "hover:bg-gray-800/50"
                                }`}
                  >
                    {/* Avatar */}
                    <div className="relative flex-shrink-0">
                      <div
                        className={`w-11 h-11 rounded-full
                                       ${getColor(name)} flex items-center
                                       justify-center text-white text-sm
                                       font-semibold`}
                      >
                        {getInitials(name)}
                      </div>
                      {isOnline && (
                        <div
                          className="absolute bottom-0 right-0 w-3 h-3
                                        bg-emerald-400 rounded-full
                                        border-2 border-gray-900"
                        />
                      )}
                    </div>

                    {/* Text */}
                    <div className="flex-1 min-w-0">
                      <div
                        className="flex items-center
                                      justify-between mb-0.5"
                      >
                        <span
                          className="text-white text-sm
                                         font-medium truncate"
                        >
                          {name}
                        </span>
                        <span
                          className="text-gray-500 text-xs
                                         flex-shrink-0 ml-2"
                        >
                          {fmtTime(conv.lastMessageAt)}
                        </span>
                      </div>
                      <p className="text-gray-400 text-xs truncate">
                        {getLastMessagePreview(conv)}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
          </>
        )}

        {/* ── CALLS TAB ─────────────────────────────────────── */}
        {tab === "calls" && (
          <div>
            {conversations.length === 0 ? (
              <div className="text-center py-12 px-4">
                <div className="text-4xl mb-3">📞</div>
                <p className="text-gray-500 text-sm">No call history yet</p>
              </div>
            ) : (
              conversations.map((conv) => {
                const name = getConvName(conv);
                const other = getOtherUser(conv);
                return (
                  <div
                    key={conv.id}
                    className="flex items-center gap-3 px-4 py-3
                               border-b border-gray-800/40
                               hover:bg-gray-800/50 cursor-pointer"
                  >
                    <div
                      className={`w-11 h-11 rounded-full
                                     ${getColor(name)} flex items-center
                                     justify-center text-white text-sm
                                     font-semibold flex-shrink-0`}
                    >
                      {getInitials(name)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm font-medium">{name}</p>
                      <p className="text-gray-500 text-xs">
                        {fmtTime(conv.lastMessageAt)}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => other && startCall(other, "audio")}
                        className="w-8 h-8 rounded-full bg-emerald-500/20
                                   hover:bg-emerald-500/40 flex items-center
                                   justify-center transition-colors"
                      >
                        <svg
                          viewBox="0 0 24 24"
                          fill="currentColor"
                          className="w-4 h-4 text-emerald-400"
                        >
                          <path
                            fillRule="evenodd"
                            clipRule="evenodd"
                            d="M1.5 4.5a3 3 0 013-3h1.372c.86 0 1.61.586 1.819 1.42l1.105 4.423a1.875 1.875 0 01-.694 1.955l-1.293.97c-.135.101-.164.249-.126.352a11.285 11.285 0 006.697 6.697c.103.038.25.009.352-.126l.97-1.293a1.875 1.875 0 011.955-.694l4.423 1.105c.834.209 1.42.959 1.42 1.82V19.5a3 3 0 01-3 3h-2.25C8.552 22.5 1.5 15.448 1.5 6.75V4.5z"
                          />
                        </svg>
                      </button>
                      <button
                        onClick={() => other && startCall(other, "video")}
                        className="w-8 h-8 rounded-full bg-blue-500/20
                                   hover:bg-blue-500/40 flex items-center
                                   justify-center transition-colors"
                      >
                        <svg
                          viewBox="0 0 24 24"
                          fill="currentColor"
                          className="w-4 h-4 text-blue-400"
                        >
                          <path d="M4.5 4.5a3 3 0 00-3 3v9a3 3 0 003 3h8.25a3 3 0 003-3v-9a3 3 0 00-3-3H4.5zM19.94 18.75l-2.69-2.69V7.94l2.69-2.69c.944-.945 2.56-.276 2.56 1.06v11.38c0 1.336-1.616 2.005-2.56 1.06z" />
                        </svg>
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>

      {/* Context Menu */}
      {contextMenu && (
        <div
          ref={contextRef}
          className="fixed z-50 bg-gray-800 border border-gray-700
                     rounded-xl shadow-2xl py-1 min-w-44"
          style={{ top: contextMenu.y, left: contextMenu.x }}
        >
          <button
            onClick={() => handleSelectConversation(contextMenu.conv)}
            className="w-full px-4 py-2.5 text-left text-sm text-white
                       hover:bg-gray-700 flex items-center gap-3"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              className="w-4 h-4 text-gray-400"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z"
              />
            </svg>
            Open chat
          </button>
          <button
            onClick={() => handleViewProfile(contextMenu.conv)}
            className="w-full px-4 py-2.5 text-left text-sm text-white
                       hover:bg-gray-700 flex items-center gap-3"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              className="w-4 h-4 text-gray-400"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z"
              />
            </svg>
            View profile
          </button>
          {(() => {
            const other = getOtherUser(contextMenu.conv);
            return other ? (
              <>
                <button
                  onClick={() => {
                    setContextMenu(null);
                    startCall(other, "audio");
                  }}
                  className="w-full px-4 py-2.5 text-left text-sm text-white
                             hover:bg-gray-700 flex items-center gap-3"
                >
                  <svg
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    className="w-4 h-4 text-emerald-400"
                  >
                    <path
                      fillRule="evenodd"
                      clipRule="evenodd"
                      d="M1.5 4.5a3 3 0 013-3h1.372c.86 0 1.61.586 1.819 1.42l1.105 4.423a1.875 1.875 0 01-.694 1.955l-1.293.97c-.135.101-.164.249-.126.352a11.285 11.285 0 006.697 6.697c.103.038.25.009.352-.126l.97-1.293a1.875 1.875 0 011.955-.694l4.423 1.105c.834.209 1.42.959 1.42 1.82V19.5a3 3 0 01-3 3h-2.25C8.552 22.5 1.5 15.448 1.5 6.75V4.5z"
                    />
                  </svg>
                  Audio call
                </button>
                <button
                  onClick={() => {
                    setContextMenu(null);
                    startCall(other, "video");
                  }}
                  className="w-full px-4 py-2.5 text-left text-sm text-white
                             hover:bg-gray-700 flex items-center gap-3"
                >
                  <svg
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    className="w-4 h-4 text-blue-400"
                  >
                    <path d="M4.5 4.5a3 3 0 00-3 3v9a3 3 0 003 3h8.25a3 3 0 003-3v-9a3 3 0 00-3-3H4.5zM19.94 18.75l-2.69-2.69V7.94l2.69-2.69c.944-.945 2.56-.276 2.56 1.06v11.38c0 1.336-1.616 2.005-2.56 1.06z" />
                  </svg>
                  Video call
                </button>
              </>
            ) : null;
          })()}
          <div className="border-t border-gray-700 my-1" />
          <button
            onClick={() => handleDeleteConversation(contextMenu.conv)}
            className="w-full px-4 py-2.5 text-left text-sm text-red-400
                       hover:bg-gray-700 flex items-center gap-3"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              className="w-4 h-4"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0"
              />
            </svg>
            Delete chat
          </button>
        </div>
      )}

      {/* New Chat Modal */}
      {showNewChat && (
        <div
          className="fixed inset-0 bg-black/60 flex items-center
                  justify-center z-50 p-4"
        >
          <div
            className="bg-gray-900 border border-gray-700
                    rounded-2xl w-full max-w-sm shadow-2xl
                    overflow-hidden"
          >
            <div
              className="flex items-center justify-between px-5 py-4
                      border-b border-gray-800"
            >
              <h2 className="text-white font-semibold">New Chat</h2>
              <button
                onClick={() => {
                  setShowNewChat(false);
                  setSearchUsername("");
                  setSearchResult(null);
                  setSearchError("");
                  setSearchResults([]);
                }}
                className="text-gray-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="px-5 py-4 space-y-3">
              {/* Search input */}
              <div className="flex gap-2">
                <input
                  value={searchUsername}
                  onChange={(e) => {
                    setSearchUsername(e.target.value);
                    setSearchError("");
                    setSearchResult(null);
                  }}
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                  placeholder="Name, @username or phone..."
                  autoFocus
                  className="flex-1 bg-gray-800 border border-gray-700
                       rounded-xl px-4 py-2.5 text-white text-sm
                       placeholder-gray-500 focus:outline-none
                       focus:border-emerald-500"
                />
                <button
                  onClick={handleSearch}
                  disabled={searching}
                  className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600
                       text-white text-sm rounded-xl disabled:opacity-50
                       transition-colors font-medium"
                >
                  {searching ? "..." : "Find"}
                </button>
              </div>

              {searchError && (
                <p className="text-red-400 text-sm">{searchError}</p>
              )}

              {/* Saved contacts as quick picks */}
              {!searchUsername && contacts.length > 0 && (
                <div>
                  <p
                    className="text-xs text-gray-500 uppercase
                           tracking-wider mb-2"
                  >
                    Contacts
                  </p>
                  <div className="space-y-1 max-h-48 overflow-y-auto">
                    {contacts
                      .filter((c) => c.userId)
                      .map((contact) => (
                        <button
                          key={contact.id}
                          onClick={() => {
                            setSearchResult({
                              id: contact.userId,
                              username: contact.username,
                              displayName: contact.savedName,
                              online: contact.online,
                            });
                          }}
                          className="w-full flex items-center gap-3 p-2.5
                             hover:bg-gray-800 rounded-xl transition-colors
                             text-left"
                        >
                          <div
                            className={`w-9 h-9 rounded-full
                                   ${getColor(contact.savedName)}
                                   flex items-center justify-center
                                   text-white text-sm font-bold flex-shrink-0`}
                          >
                            {getInitials(contact.savedName)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-white text-sm font-medium truncate">
                              {contact.savedName}
                            </p>
                            <p className="text-gray-500 text-xs">
                              @{contact.username}
                              {contact.phone && ` · ${contact.phone}`}
                            </p>
                          </div>
                        </button>
                      ))}
                  </div>
                </div>
              )}

              {/* Search result */}
              {searchResult && (
                <div
                  className="flex items-center gap-3 p-3
                          bg-gray-800 rounded-xl border border-gray-700/50"
                >
                  <div
                    className={`w-10 h-10 rounded-full
                             ${getColor(searchResult.displayName)}
                             flex items-center justify-center
                             text-white text-sm font-bold flex-shrink-0`}
                  >
                    {getInitials(
                      searchResult.displayName || searchResult.username,
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm font-medium truncate">
                      {searchResult.displayName}
                    </p>
                    <p className="text-gray-400 text-xs">
                      @{searchResult.username}
                    </p>
                  </div>
                  <button
                    onClick={handleStartChat}
                    className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600
                         text-white text-xs rounded-lg transition-colors
                         font-medium"
                  >
                    Chat
                  </button>
                </div>
              )}

              {/* Search results list */}
              {searchResults && searchResults.length > 0 && !searchResult && (
                <div className="space-y-1 max-h-48 overflow-y-auto">
                  {searchResults.map((person) => (
                    <button
                      key={person.id}
                      onClick={() => setSearchResult(person)}
                      className="w-full flex items-center gap-3 p-2.5
                           hover:bg-gray-800 rounded-xl transition-colors
                           text-left"
                    >
                      <div
                        className={`w-9 h-9 rounded-full
                                 ${getColor(person.displayName)}
                                 flex items-center justify-center
                                 text-white text-sm font-bold flex-shrink-0`}
                      >
                        {getInitials(person.displayName || person.username)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-white text-sm font-medium truncate">
                          {person.displayName}
                        </p>
                        <p className="text-gray-500 text-xs">
                          @{person.username}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Profile Modal */}
      {showProfile && profileUser && (
        <div
          className="fixed inset-0 bg-black/60 flex items-end
                        justify-center z-50 p-4 sm:items-center"
        >
          <div
            className="bg-gray-900 border border-gray-700
                          rounded-2xl w-full max-w-sm overflow-hidden"
          >
            {/* Header */}
            <div
              className="relative bg-gradient-to-br from-emerald-600
                            to-emerald-800 h-28 flex items-end px-6 pb-0"
            >
              <button
                onClick={() => setShowProfile(false)}
                className="absolute top-4 right-4 w-8 h-8 rounded-full
                           bg-black/30 flex items-center justify-center
                           text-white text-sm hover:bg-black/50"
              >
                ✕
              </button>
              <div
                className="translate-y-8 w-16 h-16 rounded-full
                              bg-emerald-600 border-4 border-gray-900
                              flex items-center justify-center
                              text-white text-2xl font-bold shadow-lg"
              >
                {getInitials(profileUser.displayName || profileUser.username)}
              </div>
            </div>

            {/* Info */}
            <div className="px-6 pt-12 pb-6">
              <h3 className="text-white text-xl font-bold">
                {profileUser.displayName || profileUser.username}
              </h3>
              <p className="text-gray-400 text-sm">@{profileUser.username}</p>
              {profileUser.email && (
                <p className="text-gray-500 text-sm mt-1">
                  {profileUser.email}
                </p>
              )}

              {/* Online status */}
              <div className="flex items-center gap-2 mt-3">
                <div
                  className={`w-2 h-2 rounded-full ${
                    profileUser.online ? "bg-emerald-400" : "bg-gray-500"
                  }`}
                />
                <span className="text-sm text-gray-400">
                  {profileUser.online ? "Online" : "Offline"}
                </span>
              </div>

              {/* Actions — only show for other users */}
              {profileUser.id !== user?.id && (
                <div className="flex gap-3 mt-5">
                  <button
                    onClick={() => {
                      setShowProfile(false);
                      // Find or create conversation
                      const existing = conversations.find(
                        (c) =>
                          c.type === "DIRECT" &&
                          c.participants?.some((p) => p.id === profileUser.id),
                      );
                      if (existing) handleSelectConversation(existing);
                    }}
                    className="flex-1 py-2.5 bg-emerald-500 hover:bg-emerald-600
                               text-white text-sm rounded-xl transition-colors
                               font-medium"
                  >
                    Message
                  </button>
                  <button
                    onClick={() => handleCallFromProfile("audio")}
                    className="w-11 h-11 rounded-xl bg-gray-800
                               hover:bg-gray-700 flex items-center
                               justify-center transition-colors"
                  >
                    <svg
                      viewBox="0 0 24 24"
                      fill="currentColor"
                      className="w-5 h-5 text-emerald-400"
                    >
                      <path
                        fillRule="evenodd"
                        clipRule="evenodd"
                        d="M1.5 4.5a3 3 0 013-3h1.372c.86 0 1.61.586 1.819 1.42l1.105 4.423a1.875 1.875 0 01-.694 1.955l-1.293.97c-.135.101-.164.249-.126.352a11.285 11.285 0 006.697 6.697c.103.038.25.009.352-.126l.97-1.293a1.875 1.875 0 011.955-.694l4.423 1.105c.834.209 1.42.959 1.42 1.82V19.5a3 3 0 01-3 3h-2.25C8.552 22.5 1.5 15.448 1.5 6.75V4.5z"
                      />
                    </svg>
                  </button>
                  <button
                    onClick={() => handleCallFromProfile("video")}
                    className="w-11 h-11 rounded-xl bg-gray-800
                               hover:bg-gray-700 flex items-center
                               justify-center transition-colors"
                  >
                    <svg
                      viewBox="0 0 24 24"
                      fill="currentColor"
                      className="w-5 h-5 text-blue-400"
                    >
                      <path d="M4.5 4.5a3 3 0 00-3 3v9a3 3 0 003 3h8.25a3 3 0 003-3v-9a3 3 0 00-3-3H4.5zM19.94 18.75l-2.69-2.69V7.94l2.69-2.69c.944-.945 2.56-.276 2.56 1.06v11.38c0 1.336-1.616 2.005-2.56 1.06z" />
                    </svg>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      {showSidebarCamera && (
        <CameraModal
          onCapture={(file) => {
            setShowSidebarCamera(false);
            // Could post to status or save to gallery
            alert("Photo captured! You can share it in a chat.");
          }}
          onClose={() => setShowSidebarCamera(false)}
        />
      )}
    </div>
  );
};
export default Sidebar;