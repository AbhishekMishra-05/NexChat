import { useState, useRef, useEffect } from "react";
import EmojiPicker from "emoji-picker-react";
import useAuthStore from "../../store/authStore";
import useChatStore from "../../store/chatStore";
import useMediaUpload from "../../hooks/useMediaUpload";
import useVoiceRecorder from "../../hooks/useVoiceRecorder";
import CameraModal from "../camera/CameraModal";
import api from "../../api/axios";

const MessageInput = ({ stompClient }) => {
  const [text, setText] = useState("");
  const [showEmoji, setShowEmoji] = useState(false);
  const [showGif, setShowGif] = useState(false);
  const [gifSearch, setGifSearch] = useState("");
  const [gifs, setGifs] = useState([]);
  const [gifLoading, setGifLoading] = useState(false);
  const [showCamera, setShowCamera] = useState(false);

  const { user } = useAuthStore();
  const { activeConversation } = useChatStore();

  const { uploadFile, uploading, progress } = useMediaUpload();

  const {
    recording,
    duration,
    formattedDuration,
    startRecording,
    stopRecording,
    cancelRecording,
  } = useVoiceRecorder();

  const emojiRef = useRef(null);
  const gifRef = useRef(null);
  const textareaRef = useRef(null);

  /*
   * Close Emoji/GIF picker when clicking outside
   */
  useEffect(() => {
    const handler = (e) => {
      if (
        emojiRef.current &&
        !emojiRef.current.contains(e.target)
      ) {
        setShowEmoji(false);
      }

      if (
        gifRef.current &&
        !gifRef.current.contains(e.target)
      ) {
        setShowGif(false);
      }
    };

    document.addEventListener("mousedown", handler);

    return () => {
      document.removeEventListener("mousedown", handler);
    };
  }, []);

  /*
   * Send message through WebSocket
   */
  const sendMessage = (content, messageType = "TEXT") => {
    if (!stompClient?.connected || !activeConversation) {
      console.error(
        "Cannot send message: WebSocket is not connected or no active conversation."
      );

      return false;
    }

    try {
      stompClient.publish({
        destination: "/app/chat.send",

        body: JSON.stringify({
          conversationId: activeConversation.id,
          senderId: user.id,
          content,
          messageType,
        }),
      });

      return true;
    } catch (error) {
      console.error("Failed to publish message:", error);

      return false;
    }
  };

  /*
   * Send text message
   */
  const handleSend = () => {
    if (!text.trim()) return;

    sendMessage(text.trim(), "TEXT");

    setText("");
    setShowEmoji(false);
    setShowGif(false);

    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  };

  /*
   * Enter = Send
   * Shift + Enter = New line
   */
  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  /*
   * Emoji
   */
  const handleEmoji = (emojiData) => {
    const cursor =
      textareaRef.current?.selectionStart || text.length;

    setText(
      text.slice(0, cursor) +
        emojiData.emoji +
        text.slice(cursor)
    );

    setTimeout(() => {
      textareaRef.current?.focus();
    }, 10);
  };

  /*
   * Search / load GIFs from GIPHY
   */
  const searchGifs = async (query = "") => {
    try {
      setGifLoading(true);

      const apiKey = import.meta.env.VITE_GIPHY_API_KEY;

      if (!apiKey) {
        throw new Error(
          "VITE_GIPHY_API_KEY is missing. Add it to the frontend .env file and restart Vite."
        );
      }

      const endpoint = query.trim()
        ? "https://api.giphy.com/v1/gifs/search"
        : "https://api.giphy.com/v1/gifs/trending";

      const params = new URLSearchParams({
        api_key: apiKey,
        limit: "20",
        rating: "g",
      });

      if (query.trim()) {
        params.append("q", query.trim());
      }

      const response = await fetch(
        `${endpoint}?${params}`
      );

      if (!response.ok) {
        throw new Error("Failed to fetch GIFs");
      }

      const data = await response.json();

      setGifs(data.data || []);
    } catch (error) {
      console.error("GIF search failed:", error);
      setGifs([]);
    } finally {
      setGifLoading(false);
    }
  };

  /*
   * Select and send GIF
   */
  const handleGifSelect = (gif) => {
    const gifUrl = gif.images?.original?.url;

    if (!gifUrl) {
      console.error("GIF URL not found.");
      return;
    }

    const sent = sendMessage(gifUrl, "GIF");

    if (sent) {
      setShowGif(false);
      setGifs([]);
      setGifSearch("");
    }
  };

  /*
   * Attach file
   */
  const handleAttach = () => {
    uploadFile((url, messageType) =>
      sendMessage(url, messageType)
    );
  };

  /*
   * Upload media from camera / voice
   */
  const uploadAndSend = async (file, messageType) => {
    const formData = new FormData();

    formData.append("file", file);

    try {
      const res = await api.post(
        "/api/media/upload",
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );

      sendMessage(
        res.data.url,
        messageType || res.data.messageType
      );
    } catch (err) {
      console.error("Upload failed:", err);
    }
  };

  /*
   * Camera
   */
  const handleCameraCapture = (file) => {
    setShowCamera(false);

    uploadAndSend(file, "IMAGE");
  };

  /*
   * Voice
   */
  const handleVoiceStop = async () => {
    const file = await stopRecording();

    if (file) {
      uploadAndSend(file, "AUDIO");
    }
  };

  return (
    <>
      {/* Camera Modal */}
      {showCamera && (
        <CameraModal
          onCapture={handleCameraCapture}
          onClose={() => setShowCamera(false)}
        />
      )}

      <div
        className="
          px-4
          pb-4
          pt-2
          border-t
          border-gray-800
          bg-gray-900
          relative
        "
      >
        {/* Upload progress */}
        {uploading && (
          <div className="mb-3">
            <div
              className="
                flex
                justify-between
                text-xs
                text-gray-400
                mb-1
              "
            >
              <span>Uploading...</span>
              <span>{progress}%</span>
            </div>

            <div className="w-full bg-gray-700 rounded-full h-1">
              <div
                className="
                  bg-emerald-500
                  h-1
                  rounded-full
                  transition-all
                "
                style={{
                  width: `${progress}%`,
                }}
              />
            </div>
          </div>
        )}

        {/* =====================================================
            EMOJI PICKER
        ===================================================== */}
        {showEmoji && (
          <div
            ref={emojiRef}
            className="
              absolute
              bottom-20
              left-4
              z-30
            "
          >
            <EmojiPicker
              onEmojiClick={handleEmoji}
              theme="dark"
              width={320}
              height={400}
              lazyLoadEmojis
            />
          </div>
        )}

        {/* =====================================================
            GIF PICKER
        ===================================================== */}
        {showGif && (
          <div
            ref={gifRef}
            onMouseDown={(e) => e.stopPropagation()}
            className="
              absolute
              bottom-20
              left-4
              z-40

              w-[390px]
              max-w-[calc(100vw-2rem)]

              h-[480px]
              max-h-[70vh]

              bg-gray-900

              border
              border-gray-700

              rounded-2xl

              shadow-2xl

              overflow-hidden

              flex
              flex-col
            "
          >
            {/* GIF Search */}
            <div
              className="
                p-3
                border-b
                border-gray-700
                flex-shrink-0
              "
            >
              <input
                type="text"
                value={gifSearch}
                onChange={(e) =>
                  setGifSearch(e.target.value)
                }
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    searchGifs(gifSearch);
                  }
                }}
                placeholder="Search GIFs..."
                className="
                  w-full
                  bg-gray-800
                  text-white
                  placeholder-gray-500
                  rounded-xl
                  px-3
                  py-2.5
                  text-sm
                  outline-none
                  border
                  border-transparent
                  focus:border-gray-600
                "
              />
            </div>

            {/* GIF Results */}
            <div
              className="
                flex-1
                min-h-0

                p-2

                grid
                grid-cols-2
                gap-2

                overflow-y-auto

                scrollbar-thin
                scrollbar-thumb-gray-700
              "
            >
              {gifLoading ? (
                <div
                  className="
                    col-span-2
                    flex
                    items-center
                    justify-center
                    text-gray-400
                    py-10
                  "
                >
                  Loading GIFs...
                </div>
              ) : gifs.length === 0 ? (
                <div
                  className="
                    col-span-2
                    flex
                    items-center
                    justify-center
                    text-gray-500
                    py-10
                  "
                >
                  No GIFs found
                </div>
              ) : (
                gifs.map((gif) => (
                  <button
                    key={gif.id}
                    type="button"
                    onMouseDown={(e) =>
                      e.stopPropagation()
                    }
                    onClick={() =>
                      handleGifSelect(gif)
                    }
                    className="
                      group
                      relative

                      w-full
                      h-24
                      min-h-24

                      overflow-hidden

                      rounded-xl

                      bg-gray-800

                      hover:ring-2
                      hover:ring-emerald-500/70

                      transition-all
                      duration-150
                    "
                  >
                    <img
                      src={
                        gif.images?.fixed_width?.url
                      }
                      alt={gif.title || "GIF"}
                      className="
                        block
                        w-full
                        h-24
                        min-h-24
                        object-cover
                        object-center
                        transition-transform
                        duration-200
                        group-hover:scale-[1.03]
                      "
                      loading="lazy"
                    />
                  </button>
                ))
              )}
            </div>

            {/* GIPHY attribution */}
            <div
              className="
                flex-shrink-0

                text-center
                text-xs
                text-gray-500

                py-2

                border-t
                border-gray-800

                bg-gray-900
              "
            >
              Powered By GIPHY
            </div>
          </div>
        )}

        {/* =====================================================
            VOICE RECORDING
        ===================================================== */}
        {recording ? (
          <div
            className="
              flex
              items-center
              gap-3

              bg-red-500/10

              border
              border-red-500/30

              rounded-2xl

              px-4
              py-3
            "
          >
            <div
              className="
                w-3
                h-3
                bg-red-500
                rounded-full
                animate-pulse
                flex-shrink-0
              "
            />

            <span
              className="
                text-red-400
                text-sm
                font-medium
                flex-1
              "
            >
              Recording {formattedDuration}
            </span>

            <button
              onClick={cancelRecording}
              className="
                text-gray-400
                hover:text-white
                text-sm
                px-2
              "
            >
              Cancel
            </button>

            <button
              onClick={handleVoiceStop}
              className="
                w-10
                h-10
                rounded-full

                bg-emerald-500
                hover:bg-emerald-600

                flex
                items-center
                justify-center

                transition-colors
              "
            >
              <svg
                viewBox="0 0 24 24"
                fill="currentColor"
                className="w-5 h-5 text-white"
              >
                <path d="M3.478 2.405a.75.75 0 00-.926.94l2.432 7.905H13.5a.75.75 0 010 1.5H4.984l-2.432 7.905a.75.75 0 00.926.94 60.519 60.519 0 0018.445-8.986.75.75 0 000-1.218A60.517 60.517 0 003.478 2.405z" />
              </svg>
            </button>
          </div>
        ) : (
          <div className="flex items-end gap-2">
            {/* =================================================
                EMOJI
            ================================================= */}
            <button
              onClick={() => {
                setShowEmoji(!showEmoji);
                setShowGif(false);
              }}
              disabled={!activeConversation}
              className={`
                w-10
                h-10
                rounded-full

                flex
                items-center
                justify-center

                transition-colors

                flex-shrink-0

                disabled:opacity-40

                ${
                  showEmoji
                    ? "bg-emerald-500/20 text-emerald-400"
                    : "bg-gray-800 hover:bg-gray-700 text-gray-400"
                }
              `}
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
                  d="M15.182 15.182a4.5 4.5 0 01-6.364 0M21 12a9 9 0 11-18 0 9 9 0 0118 0zM9.75 9.75c0 .414-.168.75-.375.75S9 10.164 9 9.75 9.168 9 9.375 9s.375.336.375.75zm-.375 0h.008v.015h-.008V9.75zm5.625 0c0 .414-.168.75-.375.75s-.375-.336-.375-.75.168-.75.375-.75.375.336.375.75zm-.375 0h.008v.015h-.008V9.75z"
                />
              </svg>
            </button>

            {/* =================================================
                GIF
            ================================================= */}
            <button
              onClick={() => {
                const nextShowGif = !showGif;

                setShowGif(nextShowGif);
                setShowEmoji(false);

                if (
                  nextShowGif &&
                  gifs.length === 0
                ) {
                  searchGifs();
                }
              }}
              disabled={!activeConversation}
              className={`
                w-10
                h-10
                rounded-full

                flex
                items-center
                justify-center

                transition-colors

                flex-shrink-0

                disabled:opacity-40

                ${
                  showGif
                    ? "bg-emerald-500/20 text-emerald-400"
                    : "bg-gray-800 hover:bg-gray-700 text-gray-400"
                }
              `}
              title="GIF"
            >
              <span className="text-xs font-bold">
                GIF
              </span>
            </button>

            {/* =================================================
                CAMERA
            ================================================= */}
            <button
              onClick={() => setShowCamera(true)}
              disabled={!activeConversation}
              className="
                w-10
                h-10
                rounded-full

                bg-gray-800
                hover:bg-gray-700

                flex
                items-center
                justify-center

                transition-colors

                disabled:opacity-40

                flex-shrink-0

                text-gray-400
              "
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
                  d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 01-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z"
                />

                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0zM18.75 10.5h.008v.008h-.008V10.5z"
                />
              </svg>
            </button>

            {/* =================================================
                ATTACH
            ================================================= */}
            <button
              onClick={handleAttach}
              disabled={
                uploading ||
                !activeConversation
              }
              className="
                w-10
                h-10
                rounded-full

                bg-gray-800
                hover:bg-gray-700

                flex
                items-center
                justify-center

                transition-colors

                disabled:opacity-40

                flex-shrink-0

                text-gray-400
              "
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
                  d="M18.375 12.739l-7.693 7.693a4.5 4.5 0 01-6.364-6.364l10.94-10.94A3 3 0 1119.5 7.372L8.552 18.32m.009-.01l-.01.01m5.699-9.941l-7.81 7.81a1.5 1.5 0 002.112 2.13"
                />
              </svg>
            </button>

            {/* =================================================
                TEXT INPUT
            ================================================= */}
            <div
              className="
                flex-1

                bg-gray-800

                border
                border-gray-700/50

                rounded-2xl

                px-4
                py-2.5
              "
            >
              <textarea
                ref={textareaRef}
                value={text}
                onChange={(e) =>
                  setText(e.target.value)
                }
                onKeyDown={handleKeyDown}
                placeholder={
                  activeConversation
                    ? "Type a message..."
                    : "Select a chat"
                }
                disabled={!activeConversation}
                rows={1}
                className="
                  w-full
                  bg-transparent
                  text-white
                  text-sm

                  placeholder-gray-500

                  focus:outline-none

                  resize-none

                  leading-relaxed

                  max-h-32

                  disabled:opacity-50
                "
                onInput={(e) => {
                  e.target.style.height = "auto";

                  e.target.style.height =
                    Math.min(
                      e.target.scrollHeight,
                      128
                    ) + "px";
                }}
              />
            </div>

            {/* =================================================
                SEND / VOICE
            ================================================= */}
            {text.trim() ? (
              <button
                onClick={handleSend}
                disabled={!activeConversation}
                className="
                  w-10
                  h-10
                  rounded-full

                  bg-emerald-500
                  hover:bg-emerald-600

                  flex
                  items-center
                  justify-center

                  transition-all

                  disabled:opacity-40

                  hover:scale-105
                  active:scale-95

                  flex-shrink-0
                "
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  className="w-5 h-5 text-white"
                >
                  <path d="M3.478 2.405a.75.75 0 00-.926.94l2.432 7.905H13.5a.75.75 0 010 1.5H4.984l-2.432 7.905a.75.75 0 00.926.94 60.519 60.519 0 0018.445-8.986.75.75 0 000-1.218A60.517 60.517 0 003.478 2.405z" />
                </svg>
              </button>
            ) : (
              <button
                onMouseDown={(e) => {
                  e.preventDefault();
                  startRecording();
                }}
                disabled={!activeConversation}
                className="
                  w-10
                  h-10
                  rounded-full

                  bg-gray-800

                  hover:bg-red-500/20
                  hover:text-red-400

                  flex
                  items-center
                  justify-center

                  transition-colors

                  disabled:opacity-40

                  flex-shrink-0

                  text-gray-400
                "
                title="Hold to record voice message"
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
                    d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z"
                  />
                </svg>
              </button>
            )}
          </div>
        )}
      </div>
    </>
  );
};

export default MessageInput;