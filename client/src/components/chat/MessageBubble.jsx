import { useState, useRef, useEffect } from "react";
import useAuthStore from "../../store/authStore";
import useChatStore from "../../store/chatStore";
import useStarredStore from "../../store/starredStore";
import api from "../../api/axios";

const MessageBubble = ({
  message,
  showDate,
  otherUserOnline,
}) => {
  const { user } = useAuthStore();

  const {
    messages,
    setMessages,
  } = useChatStore();

  const {
    starMessage,
    unstarMessage,
    isStarred,
  } = useStarredStore();

  const [showMenu, setShowMenu] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState(
    message.content || ""
  );

  const menuRef = useRef(null);

  /*
   * ============================================================
   * BASIC MESSAGE INFORMATION
   * ============================================================
   */

  const isMe = message.senderId === user?.id;

  const isGif = message.messageType === "GIF";
  const isText = message.messageType === "TEXT";
  const isImage = message.messageType === "IMAGE";
  const isAudio = message.messageType === "AUDIO";
  const isVideo = message.messageType === "VIDEO";

  const starred = isStarred(message.id);

  /*
   * ============================================================
   * CLOSE MENU WHEN CLICKING OUTSIDE
   * ============================================================
   */

  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (
        menuRef.current &&
        !menuRef.current.contains(event.target)
      ) {
        setShowMenu(false);
      }
    };

    document.addEventListener(
      "mousedown",
      handleOutsideClick
    );

    return () => {
      document.removeEventListener(
        "mousedown",
        handleOutsideClick
      );
    };
  }, []);

  /*
   * ============================================================
   * TIME FORMAT
   * ============================================================
   */

  const formatTime = (timestamp) => {
    if (!timestamp) return "";

    return new Date(timestamp).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  /*
   * ============================================================
   * DATE FORMAT
   * ============================================================
   */

  const formatDate = (timestamp) => {
    if (!timestamp) return "";

    const date = new Date(timestamp);

    const today = new Date();

    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);

    if (
      date.toDateString() === today.toDateString()
    ) {
      return "Today";
    }

    if (
      date.toDateString() ===
      yesterday.toDateString()
    ) {
      return "Yesterday";
    }

    return date.toLocaleDateString([], {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  };

  /*
   * ============================================================
   * COPY MESSAGE
   * ============================================================
   */

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(
        message.content || ""
      );
    } catch (error) {
      console.error(
        "Failed to copy message:",
        error
      );
    }

    setShowMenu(false);
  };

  /*
   * ============================================================
   * DELETE MESSAGE
   * ============================================================
   */

  const handleDelete = async () => {
    setShowMenu(false);

    try {
      await api.delete(
        `/api/messages/${message.id}`
      );
    } catch (error) {
      console.error(
        "Failed to delete message:",
        error
      );
    }

    setMessages(
      messages.filter(
        (item) => item.id !== message.id
      )
    );
  };

  /*
   * ============================================================
   * EDIT MESSAGE
   * ============================================================
   */

  const handleEdit = async () => {
    const trimmedText = editText.trim();

    if (!trimmedText) {
      setEditing(false);
      setEditText(message.content || "");
      return;
    }

    if (trimmedText === message.content) {
      setEditing(false);
      return;
    }

    try {
      await api.put(
        `/api/messages/${message.id}`,
        {
          content: trimmedText,
        }
      );

      setMessages(
        messages.map((item) =>
          item.id === message.id
            ? {
                ...item,
                content: trimmedText,
              }
            : item
        )
      );
    } catch (error) {
      console.error(
        "Failed to edit message:",
        error
      );
    }

    setEditing(false);
  };

  /*
   * ============================================================
   * SHARE MESSAGE
   * ============================================================
   *
   * For GIFs/media, this shares the URL.
   * It does NOT automatically open the URL.
   */

  const handleShare = async () => {
    setShowMenu(false);

    try {
      if (navigator.share) {
        await navigator.share({
          text: message.content || "",
        });
      } else {
        await navigator.clipboard.writeText(
          message.content || ""
        );
      }
    } catch (error) {
      /*
       * User cancelling native share is not an error
       * that needs to be shown.
       */
    }
  };

  /*
   * ============================================================
   * STAR / UNSTAR
   * ============================================================
   */

  const handleStar = () => {
    setShowMenu(false);

    if (starred) {
      unstarMessage(message.id);
    } else {
      starMessage(message);
    }
  };

  /*
   * ============================================================
   * DELIVERY / READ TICKS
   * ============================================================
   */

  const renderTicks = () => {
    if (!isMe) {
      return null;
    }

    const readBy = message.readBy || [];

    const isRead = readBy.some(
      (id) => id !== user?.id
    );

    /*
     * Read
     */
    if (isRead) {
      return (
        <span className="ml-1 text-purple-400 text-xs">
          ✓✓
        </span>
      );
    }

    /*
     * Delivered
     */
    if (otherUserOnline) {
      return (
        <span className="ml-1 text-gray-400 text-xs">
          ✓✓
        </span>
      );
    }

    /*
     * Sent
     */
    return (
      <span className="ml-1 text-gray-500 text-xs">
        ✓
      </span>
    );
  };

  /*
   * ============================================================
   * DATE SEPARATOR
   * ============================================================
   */

  const renderDateSeparator = () => {
    if (!showDate) {
      return null;
    }

    return (
      <div className="flex items-center gap-3 my-4">
        <div className="flex-1 h-px bg-gray-700/50" />

        <span
          className="
            text-xs
            text-gray-500
            bg-gray-800/50
            px-3
            py-1
            rounded-full
          "
        >
          {formatDate(message.timestamp)}
        </span>

        <div className="flex-1 h-px bg-gray-700/50" />
      </div>
    );
  };

  /*
   * ============================================================
   * MESSAGE MENU
   * ============================================================
   */

  const renderMenu = () => {
    return (
      <div
        className="
          relative
          self-center

          opacity-0
          group-hover:opacity-100

          transition-opacity

          flex-shrink-0
        "
        ref={menuRef}
      >
        <button
          type="button"
          onClick={() =>
            setShowMenu((previous) => !previous)
          }
          className="
            w-6
            h-6
            rounded-full

            bg-gray-700
            hover:bg-gray-600

            flex
            items-center
            justify-center
          "
          aria-label="Message options"
        >
          <svg
            viewBox="0 0 24 24"
            fill="currentColor"
            className="w-3.5 h-3.5 text-gray-300"
          >
            <path d="M12 6.75a.75.75 0 110-1.5.75.75 0 010 1.5zM12 12.75a.75.75 0 110-1.5.75.75 0 010 1.5zM12 18.75a.75.75 0 110-1.5.75.75 0 010 1.5z" />
          </svg>
        </button>

        {showMenu && (
          <div
            className={`
              absolute
              bottom-8
              z-50

              bg-gray-800

              border
              border-gray-700/50

              rounded-2xl

              shadow-2xl

              py-1.5

              min-w-44

              ${
                isMe
                  ? "right-0"
                  : "left-0"
              }
            `}
          >
            {/* ================================================
                COPY
                Only available for text
            ================================================= */}

            {isText && (
              <button
                type="button"
                onClick={handleCopy}
                className="
                  w-full
                  px-4
                  py-2.5

                  text-left
                  text-sm
                  text-white

                  hover:bg-gray-700/50

                  flex
                  items-center
                  gap-3
                "
              >
                <span>📋</span>
                Copy
              </button>
            )}

            {/* ================================================
                STAR
            ================================================= */}

            <button
              type="button"
              onClick={handleStar}
              className="
                w-full
                px-4
                py-2.5

                text-left
                text-sm
                text-white

                hover:bg-gray-700/50

                flex
                items-center
                gap-3
              "
            >
              <span>
                {starred ? "⭐" : "☆"}
              </span>

              {starred
                ? "Unstar"
                : "Star message"}
            </button>

            {/* ================================================
                SHARE
            ================================================= */}

            <button
              type="button"
              onClick={handleShare}
              className="
                w-full
                px-4
                py-2.5

                text-left
                text-sm
                text-white

                hover:bg-gray-700/50

                flex
                items-center
                gap-3
              "
            >
              <span>🔗</span>
              Share
            </button>

            {/* ================================================
                EDIT
                Only text messages can be edited
            ================================================= */}

            {isMe && isText && (
              <button
                type="button"
                onClick={() => {
                  setEditing(true);
                  setShowMenu(false);
                }}
                className="
                  w-full
                  px-4
                  py-2.5

                  text-left
                  text-sm
                  text-white

                  hover:bg-gray-700/50

                  flex
                  items-center
                  gap-3
                "
              >
                <span>✏️</span>
                Edit
              </button>
            )}

            {/* ================================================
                DELETE
            ================================================= */}

            {isMe && (
              <>
                <div className="h-px bg-gray-700/50 my-1" />

                <button
                  type="button"
                  onClick={handleDelete}
                  className="
                    w-full
                    px-4
                    py-2.5

                    text-left
                    text-sm
                    text-red-400

                    hover:bg-gray-700/50

                    flex
                    items-center
                    gap-3
                  "
                >
                  <span>🗑️</span>
                  Delete
                </button>
              </>
            )}
          </div>
        )}
      </div>
    );
  };

  /*
   * ============================================================
   * GIF MESSAGE
   * ============================================================
   *
   * IMPORTANT:
   *
   * There is intentionally NO onClick here.
   *
   * Therefore:
   *
   * GIF click
   *      ↓
   * Nothing opens
   *      ↓
   * GIF remains inside chat
   *
   * message.content contains the GIPHY URL internally,
   * but the URL itself is never rendered as text.
   */

  const renderGif = () => {
    return (
      <div
        className="
          relative
          inline-block

          max-w-[280px]
          max-h-[260px]

          overflow-hidden

          rounded-2xl

          shadow-lg

          bg-gray-900
        "
      >
        <img
          src={message.content}
          alt="GIF"
          draggable={false}
          className="
            block

            w-auto
            h-auto

            max-w-[280px]
            max-h-[260px]

            rounded-2xl

            object-contain

            select-none

            pointer-events-none
          "
        />

        {/* GIF timestamp */}
        <div
          className="
            absolute

            bottom-2
            right-2

            flex
            items-center
            gap-1

            px-2
            py-1

            rounded-full

            bg-black/60

            text-white
          "
        >
          <span className="text-[11px]">
            {formatTime(message.timestamp)}
          </span>

          {renderTicks()}
        </div>
      </div>
    );
  };

  /*
   * ============================================================
   * NORMAL MESSAGE CONTENT
   * ============================================================
   */

  const renderNormalMessage = () => {
    return (
      <div
        className={`
          px-4
          py-2.5

          rounded-2xl

          shadow-sm

          ${
            isMe
              ? "bg-emerald-500 text-white rounded-br-sm"
              : "bg-gray-800 text-white rounded-bl-sm"
          }
        `}
      >
        {/* Sender name */}
        {!isMe &&
          message.senderDisplayName && (
            <p
              className="
                text-xs
                text-emerald-300
                font-medium
                mb-1
              "
            >
              {message.senderDisplayName}
            </p>
          )}

        {/* ================================================
            EDIT MODE
        ================================================= */}

        {editing ? (
          <div>
            <textarea
              value={editText}
              onChange={(event) =>
                setEditText(event.target.value)
              }
              onKeyDown={(event) => {
                if (
                  event.key === "Enter" &&
                  !event.shiftKey
                ) {
                  event.preventDefault();
                  handleEdit();
                }

                if (event.key === "Escape") {
                  setEditing(false);
                  setEditText(
                    message.content || ""
                  );
                }
              }}
              className="
                bg-emerald-600
                text-white
                text-sm

                rounded-lg

                px-2
                py-1

                w-full
                min-w-48

                resize-none

                focus:outline-none
              "
              rows={2}
              autoFocus
            />

            <div className="flex gap-2 mt-1">
              <button
                type="button"
                onClick={handleEdit}
                className="
                  text-xs
                  text-emerald-100
                  hover:text-white
                "
              >
                Save
              </button>

              <button
                type="button"
                onClick={() => {
                  setEditing(false);
                  setEditText(
                    message.content || ""
                  );
                }}
                className="
                  text-xs
                  text-emerald-200/70
                  hover:text-white
                "
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* ============================================
                TEXT
            ============================================ */}

            {isText && (
              <p
                className="
                  text-sm
                  leading-relaxed
                  break-words
                  whitespace-pre-wrap
                "
              >
                {message.content}
              </p>
            )}

            {/* ============================================
                IMAGE
            ============================================ */}

            {isImage && (
              <img
                src={message.content}
                alt="Shared"
                className="
                  rounded-xl

                  max-w-full
                  max-h-64

                  object-cover

                  cursor-pointer
                "
                onClick={() =>
                  window.open(
                    message.content,
                    "_blank",
                    "noopener,noreferrer"
                  )
                }
              />
            )}

            {/* ============================================
                AUDIO
            ============================================ */}

            {isAudio && (
              <div
                className="
                  flex
                  items-center
                  gap-2
                  min-w-52
                "
              >
                <span className="text-lg flex-shrink-0">
                  🎵
                </span>

                <audio
                  controls
                  className="
                    h-8
                    flex-1
                    max-w-48
                  "
                >
                  <source
                    src={message.content}
                  />

                  Your browser does not support
                  audio playback.
                </audio>
              </div>
            )}

            {/* ============================================
                VIDEO
            ============================================ */}

            {isVideo && (
              <video
                controls
                className="
                  rounded-xl

                  max-w-full
                  max-h-48
                "
              >
                <source
                  src={message.content}
                />

                Your browser does not support
                video playback.
              </video>
            )}
          </>
        )}

        {/* ================================================
            TIMESTAMP
        ================================================= */}

        <div
          className={`
            flex
            items-center
            justify-end
            gap-1
            mt-1

            ${
              isMe
                ? "text-emerald-100/60"
                : "text-gray-500"
            }
          `}
        >
          <span className="text-xs">
            {formatTime(message.timestamp)}
          </span>

          {renderTicks()}
        </div>
      </div>
    );
  };

  /*
   * ============================================================
   * MAIN RETURN
   * ============================================================
   */

  return (
    <>
      {/* ======================================================
          DATE SEPARATOR
      ====================================================== */}

      {renderDateSeparator()}

      {/* ======================================================
          MESSAGE ROW
      ====================================================== */}

      <div
        className={`
          flex
          items-end
          gap-2
          mb-1
          group

          ${
            isMe
              ? "flex-row-reverse"
              : "flex-row"
          }
        `}
      >
        {/* ====================================================
            OTHER USER AVATAR
        ==================================================== */}

        {!isMe && (
          <div
            className="
              w-7
              h-7

              rounded-full

              bg-emerald-600

              flex
              items-center
              justify-center

              text-white
              text-xs
              font-semibold

              flex-shrink-0
              self-end
            "
          >
            {(
              message.senderDisplayName ||
              "U"
            )
              .charAt(0)
              .toUpperCase()}
          </div>
        )}

        {/* ====================================================
            MESSAGE AREA
        ==================================================== */}

        <div
          className={`
            flex
            items-end
            gap-1

            max-w-xs
            lg:max-w-md

            ${
              isMe
                ? "flex-row-reverse"
                : "flex-row"
            }
          `}
        >
          {/* Message options */}
          {renderMenu()}

          {/* Starred indicator */}
          {starred && (
            <span
              className="
                text-yellow-400
                text-xs

                self-end
                mb-1

                flex-shrink-0
              "
            >
              ⭐
            </span>
          )}

          {/* ==================================================
              GIF
          ================================================== */}

          {isGif
            ? renderGif()
            : renderNormalMessage()}
        </div>
      </div>
    </>
  );
};

export default MessageBubble;