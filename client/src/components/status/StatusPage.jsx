import { useState, useEffect, useRef } from 'react';
import useAuthStore from '../../store/authStore';
import CameraModal from '../camera/CameraModal';
import api from '../../api/axios';

const BG_OPTIONS = [
  { bg: 'from-emerald-600 to-emerald-800', label: 'Green' },
  { bg: 'from-blue-600 to-blue-800', label: 'Blue' },
  { bg: 'from-purple-600 to-purple-800', label: 'Purple' },
  { bg: 'from-orange-500 to-red-600', label: 'Sunset' },
  { bg: 'from-pink-500 to-rose-600', label: 'Pink' },
  { bg: 'from-gray-700 to-gray-900', label: 'Dark' },
  { bg: 'from-yellow-400 to-orange-500', label: 'Gold' },
  { bg: 'from-teal-500 to-cyan-700', label: 'Teal' },
];

const FONT_COLORS = [
  { color: 'text-white', label: 'White' },
  { color: 'text-yellow-300', label: 'Yellow' },
  { color: 'text-emerald-300', label: 'Green' },
  { color: 'text-pink-300', label: 'Pink' },
  { color: 'text-blue-200', label: 'Blue' },
  { color: 'text-black', bg: 'bg-white', label: 'Black' },
];

const StatusPage = ({ onClose }) => {
  const { user } = useAuthStore();
  const [tab, setTab] = useState('view'); // view | text | camera
  const [allStatuses, setAllStatuses] = useState([]);
  const [viewingStatus, setViewingStatus] = useState(null);
  const [viewProgress, setViewProgress] = useState(0);
  const [showCamera, setShowCamera] = useState(false);

  // Text status composer
  const [statusText, setStatusText] = useState('');
  const [selectedBg, setSelectedBg] = useState(BG_OPTIONS[0].bg);
  const [selectedFont, setSelectedFont] = useState(FONT_COLORS[0].color);
  const [caption, setCaption] = useState('');

  const fileInputRef = useRef(null);
  const progressRef = useRef(null);

  useEffect(() => {
    loadStatuses();
  }, []);

  const loadStatuses = () => {
    const stored = JSON.parse(
      localStorage.getItem('nexchat_statuses') || '[]'
    );
    const now = Date.now();
    const valid = stored.filter(
      s => now - s.timestamp < 24 * 60 * 60 * 1000
    );
    localStorage.setItem('nexchat_statuses', JSON.stringify(valid));
    setAllStatuses(valid);
  };

  const saveStatus = (statusData) => {
    const stored = JSON.parse(
      localStorage.getItem('nexchat_statuses') || '[]'
    ).filter(s => s.userId !== user.id || s.id !== statusData.id);
    stored.unshift(statusData);
    localStorage.setItem('nexchat_statuses', JSON.stringify(stored));
    setAllStatuses(stored.filter(s =>
      Date.now() - s.timestamp < 24 * 60 * 60 * 1000
    ));
  };

  const postTextStatus = () => {
    if (!statusText.trim()) return;
    const s = {
      id: Date.now().toString(),
      userId: user.id,
      username: user.username,
      displayName: user.displayName,
      type: 'text',
      text: statusText.trim(),
      bg: selectedBg,
      fontColor: selectedFont,
      timestamp: Date.now(),
      viewers: [],
    };
    saveStatus(s);
    setStatusText('');
    setTab('view');
  };

  const postMediaStatus = async (file) => {
    setShowCamera(false);
    const reader = new FileReader();
    reader.onload = (ev) => {
      const s = {
        id: Date.now().toString(),
        userId: user.id,
        username: user.username,
        displayName: user.displayName,
        type: file.type.startsWith('video') ? 'video' : 'image',
        content: ev.target.result,
        caption: caption.trim(),
        timestamp: Date.now(),
        viewers: [],
      };
      saveStatus(s);
      setCaption('');
      setTab('view');
    };
    reader.readAsDataURL(file);
  };

  const deleteStatus = (statusId) => {
    const stored = JSON.parse(
      localStorage.getItem('nexchat_statuses') || '[]'
    ).filter(s => s.id !== statusId);
    localStorage.setItem('nexchat_statuses', JSON.stringify(stored));
    loadStatuses();
    if (viewingStatus?.id === statusId) setViewingStatus(null);
  };

  const handleViewStatus = (status) => {
    setViewingStatus(status);
    setViewProgress(0);
    // Mark viewed
    const stored = JSON.parse(
      localStorage.getItem('nexchat_statuses') || '[]'
    );
    const updated = stored.map(s =>
      s.id === status.id
        ? { ...s, viewers: [...new Set([...s.viewers, user.id])] }
        : s
    );
    localStorage.setItem('nexchat_statuses', JSON.stringify(updated));
  };

  useEffect(() => {
    if (!viewingStatus) return;
    const dur = viewingStatus.type === 'video' ? 15000 : 5000;
    const interval = setInterval(() => {
      setViewProgress(p => {
        if (p >= 100) {
          setViewingStatus(null);
          return 0;
        }
        return p + (100 / (dur / 100));
      });
    }, 100);
    return () => clearInterval(interval);
  }, [viewingStatus]);

  const fmtTime = (ts) => {
    const diff = Date.now() - ts;
    const h = Math.floor(diff / 3600000);
    const m = Math.floor((diff % 3600000) / 60000);
    if (h > 0) return `${h}h ago`;
    if (m > 0) return `${m}m ago`;
    return 'just now';
  };

  const initials = (name) =>
    (name || 'U').split(' ').map(n => n[0]).join('')
      .toUpperCase().slice(0, 2);

  const myStatuses = allStatuses.filter(s => s.userId === user?.id);
  const othersStatuses = allStatuses.filter(s => s.userId !== user?.id);

  return (
    <>
      {showCamera && (
        <CameraModal
          title="Add to Status"
          onCapture={(file) => postMediaStatus(file)}
          onClose={() => setShowCamera(false)}
        />
      )}

      <div className="fixed inset-0 z-40 bg-black/60 flex items-end
                      sm:items-center justify-center p-4">
        <div className="bg-gray-900 border border-gray-700 rounded-2xl
                        w-full max-w-md max-h-[90vh] flex flex-col
                        overflow-hidden shadow-2xl">

          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4
                          border-b border-gray-800 flex-shrink-0">
            <h2 className="text-white font-semibold text-lg">Status</h2>
            <button onClick={onClose}
              className="text-gray-400 hover:text-white">✕</button>
          </div>

          {/* Add status options */}
          <div className="flex gap-2 px-5 py-3 border-b border-gray-800
                          flex-shrink-0">
            <button onClick={() => setTab('text')}
              className={`flex-1 py-2 rounded-xl text-sm font-medium
                          transition-colors
                          ${tab === 'text'
                            ? 'bg-emerald-500/20 text-emerald-400'
                            : 'bg-gray-800 text-gray-400 hover:text-white'}`}>
              ✍️ Text
            </button>
            <button onClick={() => setShowCamera(true)}
              className="flex-1 py-2 rounded-xl text-sm font-medium
                         bg-gray-800 text-gray-400 hover:text-white
                         transition-colors">
              📷 Camera
            </button>
            <button onClick={() => fileInputRef.current?.click()}
              className="flex-1 py-2 rounded-xl text-sm font-medium
                         bg-gray-800 text-gray-400 hover:text-white
                         transition-colors">
              🖼️ Gallery
            </button>
            <input ref={fileInputRef} type="file"
                   accept="image/*,video/*" className="hidden"
                   onChange={e => {
                     const f = e.target.files[0];
                     if (f) postMediaStatus(f);
                     e.target.value = '';
                   }}/>
          </div>

          {/* Text status composer */}
          {tab === 'text' && (
            <div className="px-5 py-4 border-b border-gray-800
                            flex-shrink-0 space-y-3">
              {/* Preview */}
              <div className={`w-full h-32 rounded-xl bg-gradient-to-br
                               ${selectedBg} flex items-center
                               justify-center p-4`}>
                <p className={`text-center font-semibold text-lg
                                ${selectedFont} break-words`}>
                  {statusText || 'Type your status...'}
                </p>
              </div>

              <textarea
                value={statusText}
                onChange={e => setStatusText(e.target.value)}
                placeholder="What's on your mind?"
                rows={2}
                maxLength={200}
                className="w-full bg-gray-800 border border-gray-700
                           rounded-xl px-4 py-2.5 text-white text-sm
                           placeholder-gray-500 focus:outline-none
                           focus:border-emerald-500 resize-none"/>

              {/* Background colors */}
              <div>
                <p className="text-xs text-gray-500 mb-2">Background</p>
                <div className="flex gap-2 flex-wrap">
                  {BG_OPTIONS.map(bg => (
                    <button key={bg.bg}
                      onClick={() => setSelectedBg(bg.bg)}
                      className={`w-8 h-8 rounded-full bg-gradient-to-br
                                   ${bg.bg} transition-all
                                   ${selectedBg === bg.bg
                                     ? 'ring-2 ring-white scale-110'
                                     : 'hover:scale-105'}`}/>
                  ))}
                </div>
              </div>

              {/* Font colors */}
              <div>
                <p className="text-xs text-gray-500 mb-2">Text color</p>
                <div className="flex gap-2">
                  {FONT_COLORS.map(fc => (
                    <button key={fc.color}
                      onClick={() => setSelectedFont(fc.color)}
                      className={`w-8 h-8 rounded-full flex items-center
                                   justify-center text-xs font-bold
                                   border-2 transition-all
                                   ${fc.bg || 'bg-gray-700'}
                                   ${selectedFont === fc.color
                                     ? 'border-white scale-110'
                                     : 'border-transparent hover:scale-105'}
                                   ${fc.color}`}>
                      A
                    </button>
                  ))}
                </div>
              </div>

              <button onClick={postTextStatus}
                disabled={!statusText.trim()}
                className="w-full py-2.5 bg-emerald-500 hover:bg-emerald-600
                           text-white font-semibold rounded-xl
                           disabled:opacity-40 transition-colors">
                Post Status
              </button>
            </div>
          )}

          {/* Statuses list */}
          <div className="flex-1 overflow-y-auto">

            {/* My statuses */}
            {myStatuses.length > 0 && (
              <div className="px-5 py-3 border-b border-gray-800">
                <p className="text-xs text-gray-500 uppercase
                               tracking-wider mb-2">
                  My Status
                </p>
                {myStatuses.map(s => (
                  <div key={s.id}
                    className="flex items-center gap-3 py-2">
                    <button
                      onClick={() => handleViewStatus(s)}
                      className="w-12 h-12 rounded-full overflow-hidden
                                 ring-2 ring-emerald-400 ring-offset-2
                                 ring-offset-gray-900 flex-shrink-0">
                      {s.type === 'text' ? (
                        <div className={`w-full h-full bg-gradient-to-br
                                         ${s.bg} flex items-center
                                         justify-center`}>
                          <span className={`text-xs font-bold
                                            ${s.fontColor}`}>
                            {s.text.slice(0, 2)}
                          </span>
                        </div>
                      ) : (
                        <img src={s.content} alt="status"
                             className="w-full h-full object-cover"/>
                      )}
                    </button>
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm font-medium">
                        My status
                      </p>
                      <p className="text-gray-400 text-xs">
                        {fmtTime(s.timestamp)} ·{' '}
                        {s.viewers.length} viewers
                      </p>
                    </div>
                    <button onClick={() => deleteStatus(s.id)}
                      className="text-gray-500 hover:text-red-400
                                 transition-colors text-sm px-2">
                      🗑️
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Others */}
            {othersStatuses.length > 0 && (
              <div className="px-5 py-3">
                <p className="text-xs text-gray-500 uppercase
                               tracking-wider mb-2">
                  Recent Updates
                </p>
                {othersStatuses.map(s => (
                  <button key={s.id}
                    onClick={() => handleViewStatus(s)}
                    className="flex items-center gap-3 w-full py-2
                               hover:bg-gray-800/50 rounded-xl px-2
                               -mx-2 transition-colors">
                    <div className="w-12 h-12 rounded-full overflow-hidden
                                    ring-2 ring-emerald-400 ring-offset-2
                                    ring-offset-gray-900 flex-shrink-0">
                      {s.type === 'text' ? (
                        <div className={`w-full h-full bg-gradient-to-br
                                         ${s.bg} flex items-center
                                         justify-center`}>
                          <span className={`text-xs font-bold ${s.fontColor}`}>
                            {s.text.slice(0, 2)}
                          </span>
                        </div>
                      ) : (
                        <img src={s.content} alt="status"
                             className="w-full h-full object-cover"/>
                      )}
                    </div>
                    <div className="text-left">
                      <p className="text-white text-sm font-medium">
                        {s.displayName || s.username}
                      </p>
                      <p className="text-gray-400 text-xs">
                        {fmtTime(s.timestamp)}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {myStatuses.length === 0 && othersStatuses.length === 0 && (
              <div className="text-center py-10 px-4">
                <p className="text-4xl mb-3">📸</p>
                <p className="text-gray-400 text-sm">
                  No status updates yet
                </p>
                <p className="text-gray-600 text-xs mt-1">
                  Add a text, photo, or video status above
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Status Viewer */}
      {viewingStatus && (
        <div className="fixed inset-0 z-50 bg-black flex flex-col">
          {/* Progress */}
          <div className="h-1 bg-gray-700 mx-3 mt-3 rounded-full flex-shrink-0">
            <div className="h-full bg-white rounded-full transition-none"
                 style={{ width: `${viewProgress}%` }}/>
          </div>

          {/* Header */}
          <div className="flex items-center gap-3 px-4 py-3 flex-shrink-0">
            <div className="w-9 h-9 rounded-full bg-emerald-600
                            flex items-center justify-center
                            text-white text-sm font-bold">
              {initials(viewingStatus.displayName || viewingStatus.username)}
            </div>
            <div className="flex-1">
              <p className="text-white text-sm font-medium">
                {viewingStatus.displayName || viewingStatus.username}
              </p>
              <p className="text-gray-400 text-xs">
                {fmtTime(viewingStatus.timestamp)}
              </p>
            </div>
            {viewingStatus.userId === user?.id && (
              <button onClick={() => {
                deleteStatus(viewingStatus.id);
                setViewingStatus(null);
              }} className="text-gray-400 hover:text-red-400 text-xl px-2">
                🗑️
              </button>
            )}
            <button onClick={() => setViewingStatus(null)}
              className="text-white text-xl px-1">✕</button>
          </div>

          {/* Content */}
          <div className="flex-1 flex items-center justify-center p-4">
            {viewingStatus.type === 'text' ? (
              <div className={`w-full max-w-sm aspect-square rounded-2xl
                               bg-gradient-to-br ${viewingStatus.bg}
                               flex items-center justify-center p-8`}>
                <p className={`text-center text-2xl font-bold
                                ${viewingStatus.fontColor} leading-relaxed`}>
                  {viewingStatus.text}
                </p>
              </div>
            ) : viewingStatus.type === 'video' ? (
              <video src={viewingStatus.content} autoPlay loop
                     className="max-w-full max-h-full object-contain
                                rounded-xl"/>
            ) : (
              <div className="flex flex-col items-center gap-3">
                <img src={viewingStatus.content} alt="status"
                     className="max-w-full max-h-[70vh] object-contain
                                rounded-xl"/>
                {viewingStatus.caption && (
                  <p className="text-white text-center text-sm
                                 bg-black/50 px-4 py-2 rounded-xl">
                    {viewingStatus.caption}
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default StatusPage;