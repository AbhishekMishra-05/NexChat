import { useEffect, useRef, useState, useCallback } from 'react';
import useCallStore from '../../store/callStore';
import useAuthStore from '../../store/authStore';
import useWebRTC from '../../hooks/useWebRTC';

const CallOverlay = ({ stompClient }) => {
  const { inCall, callType, remoteUser, isIncoming,
          incomingOffer } = useCallStore();
  const { user } = useAuthStore();
  const { localStream, remoteStream, startCall,
          acceptCall, handleEndCall } = useWebRTC(stompClient);

  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const remoteAudioRef = useRef(null);
  const [muted, setMuted] = useState(false);
  const [cameraOff, setCameraOff] = useState(false);
  const [speakerOn, setSpeakerOn] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [showControls, setShowControls] = useState(true);
  const [callState, setCallState] = useState('idle');
  const timerRef = useRef(null);
  const hideTimerRef = useRef(null);

  // Fix: use callback ref for local video
  const localVideoCallback = useCallback(node => {
    if (node && localStream) {
      node.srcObject = localStream;
      localVideoRef.current = node;
    }
  }, [localStream]);

  // Attach remote video
  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
    if (remoteAudioRef.current && remoteStream) {
      remoteAudioRef.current.srcObject = remoteStream;
      remoteAudioRef.current.muted = true; // speaker off by default
    }
    if (remoteStream) {
      setCallState('active');
      timerRef.current = setInterval(() =>
        setCallDuration(d => d + 1), 1000);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [remoteStream]);

  useEffect(() => {
    if (inCall && !isIncoming && remoteUser) {
      setCallState('ringing');
      startCall(remoteUser.id, callType);
    }
    if (inCall && isIncoming) setCallState('incoming');
  }, [inCall]);

  if (!inCall) return null;

  const fmt = s => {
    const m = Math.floor(s / 60).toString().padStart(2,'0');
    return `${m}:${(s%60).toString().padStart(2,'0')}`;
  };

  const initials = name =>
    (name||'U').split(' ').map(n=>n[0]).join('').toUpperCase().slice(0,2);

  const toggleMute = () => {
    localStream?.getAudioTracks().forEach(t => { t.enabled = !t.enabled; });
    setMuted(m => !m);
  };

  const toggleCamera = () => {
    localStream?.getVideoTracks().forEach(t => { t.enabled = !t.enabled; });
    setCameraOff(c => !c);
  };

  const toggleSpeaker = () => {
    const newVal = !speakerOn;
    if (remoteAudioRef.current) remoteAudioRef.current.muted = !newVal;
    if (remoteVideoRef.current) remoteVideoRef.current.muted = !newVal;
    setSpeakerOn(newVal);
  };

  const showCtrl = () => {
    setShowControls(true);
    clearTimeout(hideTimerRef.current);
    if (callState === 'active' && callType === 'video') {
      hideTimerRef.current = setTimeout(() => setShowControls(false), 4000);
    }
  };

  const name = remoteUser?.displayName || remoteUser?.username || '';
  const isActive = callState === 'active';

  // ── BUTTON COMPONENT ────────────────────────────────────────
  const Btn = ({ onClick, red, active, big, label, children }) => (
    <div className="flex flex-col items-center gap-2">
      <button onClick={onClick}
        className={`rounded-full flex items-center justify-center
                    transition-all duration-200 hover:scale-105
                    active:scale-95 shadow-lg
                    ${big ? 'w-16 h-16' : 'w-13 h-13'}
                    ${red
                      ? 'bg-red-500 hover:bg-red-600'
                      : active
                        ? 'bg-white/25 ring-2 ring-white/50'
                        : 'bg-black/40 hover:bg-black/60 border border-white/10'
                    }`}
        style={big ? {} : {width:52,height:52}}>
        {children}
      </button>
      <span className="text-white/70 text-xs">{label}</span>
    </div>
  );

  // ── INCOMING CALL ────────────────────────────────────────────
  if (callState === 'incoming') {
    return (
      <div className="fixed inset-0 z-50 flex flex-col
                      bg-gradient-to-b from-gray-900 to-black">
        <audio ref={remoteAudioRef} autoPlay playsInline/>
        <div className="flex-1 flex flex-col items-center
                        justify-center gap-8">
          <div className="relative">
            <div className="absolute inset-0 rounded-full
                            bg-emerald-500/20 animate-ping scale-150"/>
            <div className="absolute inset-0 rounded-full
                            bg-emerald-500/10 animate-ping
                            scale-125 delay-75"/>
            <div className="w-36 h-36 rounded-full bg-emerald-600
                            flex items-center justify-center
                            text-6xl font-bold text-white relative z-10">
              {initials(name)}
            </div>
          </div>
          <div className="text-center">
            <p className="text-emerald-400 text-sm tracking-widest
                          uppercase mb-2">
              Incoming {callType === 'video' ? 'Video' : 'Audio'} Call
            </p>
            <h2 className="text-white text-3xl font-bold">{name}</h2>
          </div>
        </div>
        <div className="pb-20 flex justify-center gap-24">
          <div className="flex flex-col items-center gap-2">
            <button onClick={() => handleEndCall(remoteUser?.id)}
              className="w-16 h-16 rounded-full bg-red-500
                         hover:bg-red-600 flex items-center
                         justify-center shadow-xl transition-all
                         hover:scale-110 active:scale-95">
              <svg viewBox="0 0 24 24" fill="currentColor"
                   className="w-7 h-7 text-white">
                <path d="M5.47 5.47a.75.75 0 011.06 0L12 10.94l5.47-5.47a.75.75 0 111.06 1.06L13.06 12l5.47 5.47a.75.75 0 11-1.06 1.06L12 13.06l-5.47 5.47a.75.75 0 01-1.06-1.06L10.94 12 5.47 6.53a.75.75 0 010-1.06z"/>
              </svg>
            </button>
            <span className="text-gray-400 text-sm">Decline</span>
          </div>
          <div className="flex flex-col items-center gap-2">
            <button
              onClick={() => acceptCall(remoteUser?.id, incomingOffer, callType)}
              className="w-16 h-16 rounded-full bg-emerald-500
                         hover:bg-emerald-400 flex items-center
                         justify-center shadow-xl animate-bounce
                         transition-all hover:scale-110 active:scale-95">
              <svg viewBox="0 0 24 24" fill="currentColor"
                   className="w-7 h-7 text-white">
                <path fillRule="evenodd" clipRule="evenodd"
                  d="M1.5 4.5a3 3 0 013-3h1.372c.86 0 1.61.586 1.819 1.42l1.105 4.423a1.875 1.875 0 01-.694 1.955l-1.293.97c-.135.101-.164.249-.126.352a11.285 11.285 0 006.697 6.697c.103.038.25.009.352-.126l.97-1.293a1.875 1.875 0 011.955-.694l4.423 1.105c.834.209 1.42.959 1.42 1.82V19.5a3 3 0 01-3 3h-2.25C8.552 22.5 1.5 15.448 1.5 6.75V4.5z"/>
              </svg>
            </button>
            <span className="text-gray-400 text-sm">Accept</span>
          </div>
        </div>
      </div>
    );
  }

  // ── AUDIO CALL ───────────────────────────────────────────────
  if (callType === 'audio') {
    return (
      <div className="fixed inset-0 z-50 flex flex-col
                      bg-gradient-to-b from-gray-900 to-black">
        <audio ref={remoteAudioRef} autoPlay playsInline/>
        <div className="flex items-center justify-between px-6 pt-6">
          <div>
            <p className="text-white font-semibold text-base">{name}</p>
            <p className={`text-sm ${isActive
              ? 'text-emerald-400' : 'text-gray-400'}`}>
              {isActive ? fmt(callDuration) : 'Connecting...'}
            </p>
          </div>
          <span className="text-gray-400 text-xs">📞 Audio call</span>
        </div>
        <div className="flex-1 flex flex-col items-center
                        justify-center gap-6">
          <div className={`w-36 h-36 rounded-full bg-emerald-600
                           flex items-center justify-center
                           text-white text-6xl font-bold
                           transition-all duration-1000
                           ${isActive
                             ? 'ring-4 ring-emerald-400/40 ring-offset-8 ring-offset-black'
                             : ''}`}>
            {initials(name)}
          </div>
          <p className="text-gray-400 text-sm">
            {isActive ? `Connected • ${fmt(callDuration)}` : 'Ringing...'}
          </p>
        </div>
        <div className="pb-16 flex justify-center gap-5">
          <Btn onClick={toggleMute} active={muted}
            label={muted ? 'Unmute' : 'Mute'}>
            <svg viewBox="0 0 24 24" fill="currentColor"
                 className="w-6 h-6 text-white">
              {muted
                ? <path d="M13.5 4.06c0-1.336-1.616-2.005-2.56-1.06l-4.5 4.5H4.508c-1.141 0-2.318.664-2.66 1.905A9.76 9.76 0 001.5 12c0 .898.121 1.768.35 2.595.341 1.24 1.518 1.905 2.659 1.905h1.93l4.5 4.5c.945.945 2.561.276 2.561-1.06V4.06zM17.78 9.22a.75.75 0 10-1.06 1.06L18.44 12l-1.72 1.72a.75.75 0 001.06 1.06l1.72-1.72 1.72 1.72a.75.75 0 001.06-1.06L20.56 12l1.72-1.72a.75.75 0 00-1.06-1.06l-1.72 1.72-1.72-1.72z"/>
                : <><path d="M8.25 4.5a3.75 3.75 0 117.5 0v8.25a3.75 3.75 0 11-7.5 0V4.5z"/><path d="M6 10.5a.75.75 0 01.75.75v1.5a5.25 5.25 0 1010.5 0v-1.5a.75.75 0 011.5 0v1.5a6.751 6.751 0 01-6 6.709v2.291h3a.75.75 0 010 1.5h-7.5a.75.75 0 010-1.5h3v-2.291a6.751 6.751 0 01-6-6.709v-1.5A.75.75 0 016 10.5z"/></>
              }
            </svg>
          </Btn>
          <Btn onClick={() => handleEndCall(remoteUser?.id)}
            red big label="End call">
            <svg viewBox="0 0 24 24" fill="currentColor"
                 className="w-8 h-8 text-white rotate-135">
              <path fillRule="evenodd" clipRule="evenodd"
                d="M1.5 4.5a3 3 0 013-3h1.372c.86 0 1.61.586 1.819 1.42l1.105 4.423a1.875 1.875 0 01-.694 1.955l-1.293.97c-.135.101-.164.249-.126.352a11.285 11.285 0 006.697 6.697c.103.038.25.009.352-.126l.97-1.293a1.875 1.875 0 011.955-.694l4.423 1.105c.834.209 1.42.959 1.42 1.82V19.5a3 3 0 01-3 3h-2.25C8.552 22.5 1.5 15.448 1.5 6.75V4.5z"/>
            </svg>
          </Btn>
          <Btn onClick={toggleSpeaker} active={speakerOn}
            label={speakerOn ? 'Speaker on' : 'Speaker'}>
            <svg viewBox="0 0 24 24" fill="currentColor"
                 className="w-6 h-6 text-white">
              {speakerOn
                ? <path d="M13.5 4.06c0-1.336-1.616-2.005-2.56-1.06l-4.5 4.5H4.508c-1.141 0-2.318.664-2.66 1.905A9.76 9.76 0 001.5 12c0 .898.121 1.768.35 2.595.341 1.24 1.518 1.905 2.659 1.905h1.93l4.5 4.5c.945.945 2.561.276 2.561-1.06V4.06zM18.584 5.106a.75.75 0 011.06 0c3.808 3.807 3.808 9.98 0 13.788a.75.75 0 11-1.06-1.06 8.25 8.25 0 000-11.668.75.75 0 010-1.06zM15.932 7.757a.75.75 0 011.061 0 6 6 0 010 8.486.75.75 0 01-1.06-1.061 4.5 4.5 0 000-6.364.75.75 0 010-1.06z"/>
                : <path d="M13.5 4.06c0-1.336-1.616-2.005-2.56-1.06l-4.5 4.5H4.508c-1.141 0-2.318.664-2.66 1.905A9.76 9.76 0 001.5 12c0 .898.121 1.768.35 2.595.341 1.24 1.518 1.905 2.659 1.905h1.93l4.5 4.5c.945.945 2.561.276 2.561-1.06V4.06zM17.78 9.22a.75.75 0 10-1.06 1.06L18.44 12l-1.72 1.72a.75.75 0 001.06 1.06l1.72-1.72 1.72 1.72a.75.75 0 001.06-1.06L20.56 12l1.72-1.72a.75.75 0 00-1.06-1.06l-1.72 1.72-1.72-1.72z"/>
              }
            </svg>
          </Btn>
        </div>
      </div>
    );
  }

  // ── VIDEO CALL ───────────────────────────────────────────────
  return (
    <div className="fixed inset-0 z-50 bg-black"
      onMouseMove={showCtrl} onClick={showCtrl}>

      {/* Hidden audio element for speaker control */}
      <audio ref={remoteAudioRef} autoPlay playsInline/>

      {/* Remote video */}
      {remoteStream ? (
        <video ref={remoteVideoRef} autoPlay playsInline
               className="absolute inset-0 w-full h-full object-cover"/>
      ) : (
        <div className="absolute inset-0 flex items-center
                        justify-center bg-gray-900">
          <div className="text-center">
            <div className="relative mx-auto w-28 h-28 mb-4">
              <div className="absolute inset-0 rounded-full
                              bg-emerald-500/20 animate-ping"/>
              <div className="w-28 h-28 rounded-full bg-emerald-600
                              flex items-center justify-center
                              text-white text-5xl font-bold relative">
                {initials(name)}
              </div>
            </div>
            <p className="text-white text-lg font-medium">{name}</p>
            <p className="text-gray-400 mt-1 text-sm">
              {callState === 'ringing' ? 'Ringing...' : 'Connecting...'}
            </p>
          </div>
        </div>
      )}

      {/* Top bar */}
      <div className={`absolute top-0 inset-x-0 px-6 pt-6 pb-16
                       bg-gradient-to-b from-black/70 to-transparent
                       transition-opacity duration-500
                       ${showControls ? 'opacity-100' : 'opacity-0'}`}>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-white font-semibold text-lg">{name}</p>
            <p className={`text-sm ${isActive
              ? 'text-emerald-400' : 'text-gray-400'}`}>
              {isActive ? fmt(callDuration) : 'Connecting...'}
            </p>
          </div>
          <span className="text-gray-300 text-xs bg-black/40
                           px-3 py-1 rounded-full">
            📹 Video call
          </span>
        </div>
      </div>

      {/* Local PiP video — using callback ref to fix black box */}
      <div className={`absolute bottom-28 right-4 w-28 h-40
                       rounded-2xl overflow-hidden border border-white/20
                       shadow-2xl bg-gray-800
                       ${showControls ? 'opacity-100' : 'opacity-60'}
                       transition-opacity duration-300`}>
        <video ref={localVideoCallback} autoPlay playsInline muted
               className={`w-full h-full object-cover scale-x-[-1]
                           ${cameraOff ? 'hidden' : 'block'}`}/>
        {cameraOff && (
          <div className="w-full h-full flex items-center
                          justify-center bg-gray-800">
            <div className="text-center">
              <div className="w-10 h-10 rounded-full bg-gray-600
                              flex items-center justify-center
                              mx-auto mb-1 text-white text-sm font-bold">
                {initials(user?.displayName || user?.username)}
              </div>
              <p className="text-gray-400 text-xs">Off</p>
            </div>
          </div>
        )}
      </div>

      {/* Bottom controls */}
      <div className={`absolute bottom-0 inset-x-0 px-8 pb-10 pt-20
                       bg-gradient-to-t from-black/80 to-transparent
                       transition-opacity duration-500
                       ${showControls ? 'opacity-100' : 'opacity-0'}`}>
        <div className="flex items-end justify-center gap-4">
          <Btn onClick={toggleMute} active={muted}
            label={muted ? 'Unmute' : 'Mute'}>
            <svg viewBox="0 0 24 24" fill="currentColor"
                 className="w-6 h-6 text-white">
              {muted
                ? <path d="M13.5 4.06c0-1.336-1.616-2.005-2.56-1.06l-4.5 4.5H4.508c-1.141 0-2.318.664-2.66 1.905A9.76 9.76 0 001.5 12c0 .898.121 1.768.35 2.595.341 1.24 1.518 1.905 2.659 1.905h1.93l4.5 4.5c.945.945 2.561.276 2.561-1.06V4.06zM17.78 9.22a.75.75 0 10-1.06 1.06L18.44 12l-1.72 1.72a.75.75 0 001.06 1.06l1.72-1.72 1.72 1.72a.75.75 0 001.06-1.06L20.56 12l1.72-1.72a.75.75 0 00-1.06-1.06l-1.72 1.72-1.72-1.72z"/>
                : <><path d="M8.25 4.5a3.75 3.75 0 117.5 0v8.25a3.75 3.75 0 11-7.5 0V4.5z"/><path d="M6 10.5a.75.75 0 01.75.75v1.5a5.25 5.25 0 1010.5 0v-1.5a.75.75 0 011.5 0v1.5a6.751 6.751 0 01-6 6.709v2.291h3a.75.75 0 010 1.5h-7.5a.75.75 0 010-1.5h3v-2.291a6.751 6.751 0 01-6-6.709v-1.5A.75.75 0 016 10.5z"/></>
              }
            </svg>
          </Btn>
          <Btn onClick={toggleSpeaker} active={speakerOn}
            label={speakerOn ? 'Speaker on' : 'Speaker'}>
            <svg viewBox="0 0 24 24" fill="currentColor"
                 className="w-6 h-6 text-white">
              {speakerOn
                ? <path d="M13.5 4.06c0-1.336-1.616-2.005-2.56-1.06l-4.5 4.5H4.508c-1.141 0-2.318.664-2.66 1.905A9.76 9.76 0 001.5 12c0 .898.121 1.768.35 2.595.341 1.24 1.518 1.905 2.659 1.905h1.93l4.5 4.5c.945.945 2.561.276 2.561-1.06V4.06zM18.584 5.106a.75.75 0 011.06 0c3.808 3.807 3.808 9.98 0 13.788a.75.75 0 11-1.06-1.06 8.25 8.25 0 000-11.668.75.75 0 010-1.06z"/>
                : <path d="M13.5 4.06c0-1.336-1.616-2.005-2.56-1.06l-4.5 4.5H4.508c-1.141 0-2.318.664-2.66 1.905A9.76 9.76 0 001.5 12c0 .898.121 1.768.35 2.595.341 1.24 1.518 1.905 2.659 1.905h1.93l4.5 4.5c.945.945 2.561.276 2.561-1.06V4.06zM17.78 9.22a.75.75 0 10-1.06 1.06L18.44 12l-1.72 1.72a.75.75 0 001.06 1.06l1.72-1.72 1.72 1.72a.75.75 0 001.06-1.06L20.56 12l1.72-1.72a.75.75 0 00-1.06-1.06l-1.72 1.72-1.72-1.72z"/>
              }
            </svg>
          </Btn>
          <Btn onClick={() => handleEndCall(remoteUser?.id)}
            red big label="End call">
            <svg viewBox="0 0 24 24" fill="currentColor"
                 className="w-8 h-8 text-white rotate-135">
              <path fillRule="evenodd" clipRule="evenodd"
                d="M1.5 4.5a3 3 0 013-3h1.372c.86 0 1.61.586 1.819 1.42l1.105 4.423a1.875 1.875 0 01-.694 1.955l-1.293.97c-.135.101-.164.249-.126.352a11.285 11.285 0 006.697 6.697c.103.038.25.009.352-.126l.97-1.293a1.875 1.875 0 011.955-.694l4.423 1.105c.834.209 1.42.959 1.42 1.82V19.5a3 3 0 01-3 3h-2.25C8.552 22.5 1.5 15.448 1.5 6.75V4.5z"/>
            </svg>
          </Btn>
          <Btn onClick={toggleCamera} active={cameraOff}
            label={cameraOff ? 'Cam on' : 'Cam off'}>
            <svg viewBox="0 0 24 24" fill="currentColor"
                 className="w-6 h-6 text-white">
              {cameraOff
                ? <path d="M3.53 2.47a.75.75 0 00-1.06 1.06l18 18a.75.75 0 101.06-1.06l-18-18zM22.676 12.553a11.249 11.249 0 01-2.631 4.31l-3.099-3.099a5.25 5.25 0 00-6.71-6.71L7.759 4.577A11.217 11.217 0 0112 3.75c5.907 0 10.353 4.068 10.676 8.803zm-13.115 7.498l-3.079-3.08A11.26 11.26 0 011.5 12.135a11.249 11.249 0 012.514-4.684l3.084 3.084A5.25 5.25 0 007.499 12a5.25 5.25 0 005.25 5.25c.625 0 1.224-.107 1.78-.304z"/>
                : <path d="M4.5 4.5a3 3 0 00-3 3v9a3 3 0 003 3h8.25a3 3 0 003-3v-9a3 3 0 00-3-3H4.5zM19.94 18.75l-2.69-2.69V7.94l2.69-2.69c.944-.945 2.56-.276 2.56 1.06v11.38c0 1.336-1.616 2.005-2.56 1.06z"/>
              }
            </svg>
          </Btn>
        </div>
      </div>
    </div>
  );
};

export default CallOverlay;