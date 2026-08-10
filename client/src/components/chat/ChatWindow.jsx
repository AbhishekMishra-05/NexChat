import { useEffect, useRef, useState } from "react";
import useAuthStore from "../../store/authStore";
import useChatStore from "../../store/chatStore";
import useCallStore from "../../store/callStore";
import useChatLockStore from "../../store/chatLockStore";
import useContactsStore from "../../store/contactsStore";
import MessageBubble from "./MessageBubble";
import MessageInput from "./MessageInput";
import GroupInfoPanel from "../groups/GroupInfoPanel";
import StarredMessages from "./StarredMessages";
import api from "../../api/axios";
import useBlockStore from "../../store/blockStore";

const ChatWindow = ({ stompClient, onProfileClick }) => {
  const { user } = useAuthStore();
  const {
    activeConversation,
    messages,
    setMessages,
    setActiveConversation,
    conversations,
    setConversations,
  } = useChatStore();
  const { startCall } = useCallStore();
  const { isLocked, lockChat, unlockChat, hasLock, verifyPin } =
    useChatLockStore();
  const { saveContact } = useContactsStore();

  const bottomRef = useRef(null);
  const messagesContentRef = useRef(null);
  const menuRef = useRef(null);

  // True when the user is currently near the bottom of the chat.
  // This lets new messages auto-scroll without forcing the user
  // back to the bottom when they are reading older messages.
  const isNearBottomRef = useRef(true);

  const [showGroupInfo, setShowGroupInfo] = useState(false);
  const [showChatMenu, setShowChatMenu] = useState(false);
  const [showStarred, setShowStarred] = useState(false);

  // Lock/unlock states
  const [showLockSetup, setShowLockSetup] = useState(false);
  const [showUnlock, setShowUnlock] = useState(false);
  const [pinInput, setPinInput] = useState("");
  const [pinError, setPinError] = useState("");
  const [isUnlocked, setIsUnlocked] = useState(false);
  const { isBlocked, blockUser, unblockUser } = useBlockStore();
  // Scroll to the bottom when switching conversations.
  useEffect(() => {
    isNearBottomRef.current = true;

    requestAnimationFrame(() => {
      bottomRef.current?.scrollIntoView({ behavior: "auto" });
    });
  }, [activeConversation?.id]);

  // Follow new messages only when the user was already at/near the bottom.
  // Use the last message id instead of only messages.length so this also
  // works when the store replaces/mutates the messages array.
  useEffect(() => {
    if (!activeConversation?.id || messages.length === 0) return;
    if (!isNearBottomRef.current) return;

    requestAnimationFrame(() => {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    });
  }, [
    activeConversation?.id,
    messages.length,
    messages[messages.length - 1]?.id,
  ]);

  // Media such as GIFs/images can increase the message area's height AFTER
  // the message has been rendered. Keep the view at the bottom in that case
  // when the user was already at the bottom.
  useEffect(() => {
    const content = messagesContentRef.current;
    if (!content || typeof ResizeObserver === "undefined") return;

    const observer = new ResizeObserver(() => {
      if (!isNearBottomRef.current) return;

      requestAnimationFrame(() => {
        bottomRef.current?.scrollIntoView({ behavior: "auto" });
      });
    });

    observer.observe(content);

    return () => observer.disconnect();
  }, [activeConversation?.id]);

  useEffect(() => {
    setShowGroupInfo(false);
    setShowChatMenu(false);
    setIsUnlocked(false);
    setPinInput("");
    setPinError("");
  }, [activeConversation?.id]);

  // Close chat menu on outside click
  useEffect(() => {
    const handler = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setShowChatMenu(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Send read receipt when messages load
  useEffect(() => {
    if (!activeConversation || !stompClient?.connected || !messages.length)
      return;
    stompClient.publish({
      destination: "/app/chat.read",
      body: JSON.stringify({
        conversationId: activeConversation.id,
        readerId: user.id,
        readerUsername: user.username,
      }),
    });
  }, [messages, activeConversation?.id]);

  const getConvName = () => {
    if (!activeConversation) return "";
    if (activeConversation.type === "GROUP") {
      return activeConversation.name || "Group Chat";
    }
    const other = activeConversation.participants?.find(
      (p) => p.id !== user?.id,
    );
    return other?.displayName || other?.username || "Unknown";
  };

  const getOtherUser = () =>
    activeConversation?.participants?.find((p) => p.id !== user?.id);

  const isOtherOnline = () => {
    if (activeConversation?.type === "GROUP") return false;
    return getOtherUser()?.online || false;
  };

  const isDifferentDay = (m1, m2) => {
    if (!m1 || !m2) return false;
    return (
      new Date(m1.timestamp).toDateString() !==
      new Date(m2.timestamp).toDateString()
    );
  };

  const handleClearChat = async () => {
    setShowChatMenu(false);
    if (!window.confirm("Clear all messages in this chat?")) return;
    try {
      // Delete all messages one by one (or add a bulk endpoint)
      for (const msg of messages) {
        try {
          await api.delete(`/api/messages/${msg.id}`);
        } catch {}
      }
      setMessages([]);
    } catch {}
  };

  const handleAddToContacts = () => {
    setShowChatMenu(false);
    const other = getOtherUser();
    if (!other) return;
    const name = window.prompt(
      `Save "${other.displayName || other.username}" as:`,
      other.displayName || other.username,
    );
    if (!name) return;
    saveContact({
      userId: other.id,
      savedName: name.trim(),
      username: other.username,
      displayName: other.displayName,
    });
    alert(`${name} added to contacts!`);
  };

  const handleLockSetup = () => {
    setShowChatMenu(false);
    if (hasLock(activeConversation?.id)) {
      // Already has a lock — offer to remove
      if (window.confirm("Remove chat lock?")) {
        const pin = window.prompt("Enter your PIN to confirm:");
        if (verifyPin(activeConversation.id, pin)) {
          // Use removeLock from store
          const store = useChatLockStore.getState();
          store.removeLock(activeConversation.id);
          setIsUnlocked(true);
          alert("Chat lock removed");
        } else {
          alert("Wrong PIN");
        }
      }
    } else {
      setShowLockSetup(true);
    }
  };

  const handleSetPin = () => {
    if (pinInput.length < 4) {
      setPinError("PIN must be at least 4 digits");
      return;
    }
    lockChat(activeConversation.id, pinInput);
    setShowLockSetup(false);
    setPinInput("");
    setPinError("");
    setIsUnlocked(false);
    alert("Chat locked! 🔒");
  };

  const handleUnlock = () => {
    if (verifyPin(activeConversation.id, pinInput)) {
      setIsUnlocked(true);
      setShowUnlock(false);
      setPinInput("");
      setPinError("");
      unlockChat(activeConversation.id);
    } else {
      setPinError("Wrong PIN. Try again.");
    }
  };

  if (!activeConversation) {
    return (
      <div
        className="flex-1 bg-gray-950 flex items-center
                      justify-center"
      >
        <div className="text-center">
          <div className="text-7xl mb-4">💬</div>
          <h2 className="text-white text-xl font-semibold mb-2">
            Welcome to Nexchat
          </h2>
          <p className="text-gray-500 text-sm">
            Select a conversation to start messaging
          </p>
        </div>
      </div>
    );
  }

  const convId = activeConversation.id;
  const locked = isLocked(convId) && !isUnlocked;
  const name = getConvName();

  // ── LOCKED SCREEN ──────────────────────────────────────────
  if (locked) {
    return (
      <div
        className="flex-1 bg-gray-950 flex items-center
                      justify-center"
      >
        <div className="text-center px-8">
          <div className="text-6xl mb-4">🔒</div>
          <h3 className="text-white text-lg font-semibold mb-1">Chat Locked</h3>
          <p className="text-gray-400 text-sm mb-6">
            Enter your PIN to unlock {name}
          </p>
          <input
            type="password"
            value={pinInput}
            onChange={(e) => {
              setPinInput(e.target.value);
              setPinError("");
            }}
            onKeyDown={(e) => e.key === "Enter" && handleUnlock()}
            placeholder="Enter PIN"
            maxLength={8}
            className="w-48 bg-gray-800 border border-gray-700
                       rounded-xl px-4 py-3 text-white text-center
                       text-lg tracking-widest focus:outline-none
                       focus:border-emerald-500 mb-2 mx-auto block"
          />
          {pinError && <p className="text-red-400 text-sm mb-3">{pinError}</p>}
          <button
            onClick={handleUnlock}
            className="w-48 py-3 bg-emerald-500 hover:bg-emerald-600
                       text-white font-semibold rounded-xl
                       transition-colors"
          >
            Unlock
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      {showStarred && <StarredMessages onClose={() => setShowStarred(false)} />}

      {/* PIN setup modal */}
      {showLockSetup && (
        <div
          className="fixed inset-0 z-50 bg-black/60 flex items-center
                        justify-center p-4"
        >
          <div
            className="bg-gray-900 border border-gray-700
                          rounded-2xl p-6 w-full max-w-sm"
          >
            <h3 className="text-white font-semibold text-lg mb-2">
              🔒 Lock Chat
            </h3>
            <p className="text-gray-400 text-sm mb-4">
              Set a PIN to lock this chat. You'll need it to unlock.
            </p>
            <input
              type="password"
              value={pinInput}
              onChange={(e) => {
                setPinInput(e.target.value);
                setPinError("");
              }}
              placeholder="Enter 4+ digit PIN"
              maxLength={8}
              className="w-full bg-gray-800 border border-gray-700
                         rounded-xl px-4 py-3 text-white text-center
                         text-lg tracking-widest focus:outline-none
                         focus:border-emerald-500 mb-2"
            />
            {pinError && (
              <p className="text-red-400 text-sm mb-3">{pinError}</p>
            )}
            <div className="flex gap-3 mt-2">
              <button
                onClick={() => {
                  setShowLockSetup(false);
                  setPinInput("");
                }}
                className="flex-1 py-2.5 bg-gray-700 text-white
                           rounded-xl hover:bg-gray-600 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSetPin}
                className="flex-1 py-2.5 bg-emerald-500 text-white
                           font-semibold rounded-xl hover:bg-emerald-600
                           transition-colors"
              >
                Lock
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex-1 flex min-w-0 h-full">
        <div className="flex-1 flex flex-col bg-gray-950 h-full min-w-0 min-h-0">
          {/* Chat header */}
          <div
            className="px-4 py-3 border-b border-gray-800
                          bg-gray-900 flex items-center gap-3
                          flex-shrink-0"
          >
            <button
              onClick={() => {
                if (activeConversation.type === "GROUP") {
                  setShowGroupInfo(!showGroupInfo);
                } else {
                  onProfileClick?.(getOtherUser());
                }
              }}
              className="flex items-center gap-3 flex-1 min-w-0
                         hover:bg-gray-800/50 rounded-xl p-1 -ml-1
                         transition-colors text-left"
            >
              <div className="relative flex-shrink-0">
                <div
                  className="w-9 h-9 rounded-full bg-emerald-600
                                flex items-center justify-center
                                text-white text-sm font-semibold"
                >
                  {name.charAt(0).toUpperCase()}
                </div>
                {isOtherOnline() && (
                  <div
                    className="absolute bottom-0 right-0 w-2.5 h-2.5
                                  bg-emerald-400 rounded-full
                                  border-2 border-gray-900"
                  />
                )}
              </div>
              <div className="min-w-0">
                <p className="text-white font-medium text-sm truncate">
                  {name}
                  {hasLock(convId) && <span className="ml-1 text-xs">🔒</span>}
                </p>
                <p
                  className={`text-xs ${
                    isOtherOnline() ? "text-emerald-400" : "text-gray-500"
                  }`}
                >
                  {activeConversation.type === "GROUP"
                    ? `${activeConversation.participants?.length} members`
                    : isOtherOnline()
                      ? "Online"
                      : "Offline"}
                </p>
              </div>
            </button>

            {/* Call buttons */}
            {activeConversation.type !== "GROUP" && (
              <div className="flex items-center gap-1 flex-shrink-0">
                <button
                  onClick={() => startCall(getOtherUser(), "audio")}
                  className="w-9 h-9 rounded-full bg-gray-800
                             hover:bg-emerald-600/20 flex items-center
                             justify-center transition-colors text-gray-400
                             hover:text-emerald-400"
                >
                  <svg
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    className="w-4 h-4"
                  >
                    <path
                      fillRule="evenodd"
                      clipRule="evenodd"
                      d="M1.5 4.5a3 3 0 013-3h1.372c.86 0 1.61.586 1.819 1.42l1.105 4.423a1.875 1.875 0 01-.694 1.955l-1.293.97c-.135.101-.164.249-.126.352a11.285 11.285 0 006.697 6.697c.103.038.25.009.352-.126l.97-1.293a1.875 1.875 0 011.955-.694l4.423 1.105c.834.209 1.42.959 1.42 1.82V19.5a3 3 0 01-3 3h-2.25C8.552 22.5 1.5 15.448 1.5 6.75V4.5z"
                    />
                  </svg>
                </button>
                <button
                  onClick={() => startCall(getOtherUser(), "video")}
                  className="w-9 h-9 rounded-full bg-gray-800
                             hover:bg-blue-600/20 flex items-center
                             justify-center transition-colors text-gray-400
                             hover:text-blue-400"
                >
                  <svg
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    className="w-4 h-4"
                  >
                    <path d="M4.5 4.5a3 3 0 00-3 3v9a3 3 0 003 3h8.25a3 3 0 003-3v-9a3 3 0 00-3-3H4.5zM19.94 18.75l-2.69-2.69V7.94l2.69-2.69c.944-.945 2.56-.276 2.56 1.06v11.38c0 1.336-1.616 2.005-2.56 1.06z" />
                  </svg>
                </button>
              </div>
            )}

            {/* 3-bar chat menu */}
            <div className="relative flex-shrink-0" ref={menuRef}>
              <button
                onClick={() => setShowChatMenu(!showChatMenu)}
                className="w-9 h-9 rounded-full bg-gray-800
                           hover:bg-gray-700 flex items-center
                           justify-center transition-colors text-gray-400"
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  className="w-5 h-5"
                >
                  <path
                    fillRule="evenodd"
                    clipRule="evenodd"
                    d="M3 6.75A.75.75 0 013.75 6h16.5a.75.75 0 010 1.5H3.75A.75.75 0 013 6.75zM3 12a.75.75 0 01.75-.75h16.5a.75.75 0 010 1.5H3.75A.75.75 0 013 12zm0 5.25a.75.75 0 01.75-.75h16.5a.75.75 0 010 1.5H3.75a.75.75 0 01-.75-.75z"
                  />
                </svg>
              </button>

              {showChatMenu && (
                <div
                  className="absolute right-0 top-11 z-30 bg-gray-800
                                border border-gray-700 rounded-2xl
                                shadow-2xl py-1.5 min-w-48"
                >
                  <button
                    onClick={() => {
                      setShowChatMenu(false);
                      setShowStarred(true);
                    }}
                    className="w-full px-4 py-2.5 text-left text-sm
                               text-white hover:bg-gray-700 flex
                               items-center gap-3 transition-colors"
                  >
                    <span>⭐</span> Starred messages
                  </button>
                  {/* Block/Unblock */}
                  {activeConversation.type !== "GROUP" && (
                    <>
                      <div className="h-px bg-gray-700 my-1" />
                      <button
                        onClick={() => {
                          setShowChatMenu(false);
                          const other = getOtherUser();
                          if (!other) return;
                          if (isBlocked(other.id)) {
                            unblockUser(other.id);
                            alert(
                              `${other.displayName || other.username} unblocked`,
                            );
                          } else {
                            if (
                              window.confirm(
                                `Block ${other.displayName || other.username}? They won't be able to message you.`,
                              )
                            ) {
                              blockUser(other.id, other.username);
                            }
                          }
                        }}
                        className="w-full px-4 py-2.5 text-left text-sm
                 text-red-400 hover:bg-gray-700 flex
                 items-center gap-3 transition-colors"
                      >
                        <span>
                          {getOtherUser() && isBlocked(getOtherUser()?.id)
                            ? "✅"
                            : "🚫"}
                        </span>
                        {getOtherUser() && isBlocked(getOtherUser()?.id)
                          ? "Unblock"
                          : "Block"}
                      </button>
                    </>
                  )}

                  {activeConversation.type !== "GROUP" && (
                    <button
                      onClick={handleAddToContacts}
                      className="w-full px-4 py-2.5 text-left text-sm
                                 text-white hover:bg-gray-700 flex
                                 items-center gap-3 transition-colors"
                    >
                      <span>📱</span> Add to contacts
                    </button>
                  )}

                  <button
                    onClick={handleLockSetup}
                    className="w-full px-4 py-2.5 text-left text-sm
                               text-white hover:bg-gray-700 flex
                               items-center gap-3 transition-colors"
                  >
                    <span>{hasLock(convId) ? "🔓" : "🔒"}</span>
                    {hasLock(convId) ? "Remove lock" : "Lock chat"}
                  </button>

                  <div className="h-px bg-gray-700 my-1" />

                  <button
                    onClick={handleClearChat}
                    className="w-full px-4 py-2.5 text-left text-sm
                               text-red-400 hover:bg-gray-700 flex
                               items-center gap-3 transition-colors"
                  >
                    <span>🗑️</span> Clear chat
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Blocked state */}
          {activeConversation.type !== "GROUP" &&
            getOtherUser() &&
            isBlocked(getOtherUser()?.id) && (
              <div
                className="px-4 py-3 bg-red-500/10 border-t border-red-500/20
                  text-center"
              >
                <p className="text-red-400 text-xs">
                  You blocked this contact.{" "}
                  <button
                    onClick={() => unblockUser(getOtherUser().id)}
                    className="underline hover:text-red-300"
                  >
                    Unblock
                  </button>
                </p>
              </div>
            )}

          {/* Messages */}
          <div
            className="flex-1 min-h-0 overflow-y-auto px-4 py-3"
            onScroll={(e) => {
              const element = e.currentTarget;

              const distanceFromBottom =
                element.scrollHeight -
                element.scrollTop -
                element.clientHeight;

              // Allow a small tolerance so normal wheel/touch scrolling
              // near the bottom still counts as being at the bottom.
              isNearBottomRef.current =
                distanceFromBottom <= 80;
            }}
          >
            <div ref={messagesContentRef} className="min-h-full">
              {messages.length === 0 ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <div className="text-5xl mb-3">👋</div>
                    <p className="text-gray-500 text-sm">Say hello to {name}!</p>
                  </div>
                </div>
              ) : (
                messages.map((msg, idx) => (
                  <MessageBubble
                    key={msg.id}
                    message={msg}
                    showDate={
                      idx === 0 ||
                      isDifferentDay(messages[idx - 1], msg)
                    }
                    otherUserOnline={isOtherOnline()}
                  />
                ))
              )}
              <div ref={bottomRef} />
            </div>
          </div>

          <MessageInput stompClient={stompClient} />
        </div>

        {/* Group info panel */}
        {showGroupInfo && activeConversation.type === "GROUP" && (
          <GroupInfoPanel
            conversation={activeConversation}
            onClose={() => setShowGroupInfo(false)}
          />
        )}
      </div>
    </>
  );
};

export default ChatWindow;