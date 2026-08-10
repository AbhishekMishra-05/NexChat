import { useEffect, useRef, useState, useCallback } from 'react';

const CameraModal = ({ onCapture, onClose, title = "Camera" }) => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const streamRef = useRef(null);

  const [mode, setMode] = useState('photo'); // photo | video
  const [facingMode, setFacingMode] = useState('environment');
  const [captured, setCaptured] = useState(null); // { url, type }
  const [recording, setRecording] = useState(false);
  const [recordDuration, setRecordDuration] = useState(0);
  const [error, setError] = useState('');
  const timerRef = useRef(null);

  const startStream = useCallback(async (facing = facingMode) => {
    // Stop existing stream
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
    }
    try {
      const s = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: facing, width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: mode === 'video',
      });
      streamRef.current = s;
      if (videoRef.current) {
        videoRef.current.srcObject = s;
      }
      setError('');
    } catch {
      setError('Cannot access camera. Check permissions in your browser settings.');
    }
  }, [mode, facingMode]);

  useEffect(() => {
    startStream();
    return () => {
      streamRef.current?.getTracks().forEach(t => t.stop());
      clearInterval(timerRef.current);
    };
  }, []);

  useEffect(() => {
    if (videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
    }
  }, [captured]);

  const handleFlip = () => {
    const newFacing = facingMode === 'environment' ? 'user' : 'environment';
    setFacingMode(newFacing);
    startStream(newFacing);
  };

  const switchMode = (newMode) => {
    if (recording) stopRecording();
    setCaptured(null);
    setMode(newMode);
    // Restart stream for video mode (needs audio)
    setTimeout(() => startStream(), 100);
  };

  // Take photo
  const takePhoto = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    const ctx = canvas.getContext('2d');
    if (facingMode === 'user') {
      ctx.scale(-1, 1);
      ctx.drawImage(video, -canvas.width, 0);
    } else {
      ctx.drawImage(video, 0, 0);
    }
    const url = canvas.toDataURL('image/jpeg', 0.92);
    setCaptured({ url, type: 'image' });
    streamRef.current?.getTracks().forEach(t => t.stop());
  };

  // Start video recording
  const startRecording = () => {
    const stream = streamRef.current;
    if (!stream) return;
    chunksRef.current = [];
    const mr = new MediaRecorder(stream);
    mediaRecorderRef.current = mr;
    mr.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };
    mr.start(100);
    setRecording(true);
    setRecordDuration(0);
    timerRef.current = setInterval(() =>
      setRecordDuration(d => d + 1), 1000);
  };

  // Stop video recording
  const stopRecording = () => {
    return new Promise(resolve => {
      const mr = mediaRecorderRef.current;
      if (!mr) return resolve();
      mr.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'video/webm' });
        const url = URL.createObjectURL(blob);
        setCaptured({ url, type: 'video', blob });
        clearInterval(timerRef.current);
        setRecording(false);
        setRecordDuration(0);
        resolve();
      };
      mr.stop();
      streamRef.current?.getTracks().forEach(t => t.stop());
    });
  };

  const handleCapture = () => {
    if (mode === 'photo') {
      takePhoto();
    } else if (recording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  const handleRetake = () => {
    setCaptured(null);
    startStream();
  };

  const handleSend = () => {
    if (!captured) return;
    if (captured.type === 'image') {
      fetch(captured.url)
        .then(r => r.blob())
        .then(blob => {
          const file = new File([blob], `photo_${Date.now()}.jpg`,
            { type: 'image/jpeg' });
          onCapture(file, 'IMAGE');
        });
    } else {
      const file = new File(
        [captured.blob], `video_${Date.now()}.webm`,
        { type: 'video/webm' }
      );
      onCapture(file, 'VIDEO');
    }
  };

  const fmt = (s) =>
    `${Math.floor(s/60).toString().padStart(2,'0')}:${(s%60).toString().padStart(2,'0')}`;

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col">

      {/* Header */}
      <div className="absolute top-0 inset-x-0 z-10 flex items-center
                      justify-between px-4 pt-4 pb-2
                      bg-gradient-to-b from-black/80 to-transparent">
        <button onClick={() => {
          streamRef.current?.getTracks().forEach(t => t.stop());
          onClose();
        }} className="w-9 h-9 rounded-full bg-black/40 flex items-center
                      justify-center text-white text-xl hover:bg-black/60">
          ✕
        </button>

        <span className="text-white font-medium text-sm">{title}</span>

        {!captured && (
          <button onClick={handleFlip}
            className="w-9 h-9 rounded-full bg-black/40 flex items-center
                       justify-center text-white hover:bg-black/60 text-lg">
            🔄
          </button>
        )}
        {captured && <div className="w-9"/>}
      </div>

      {/* Mode tabs — only when not captured */}
      {!captured && !error && (
        <div className="absolute top-16 inset-x-0 z-10 flex
                        justify-center gap-2">
          {['photo', 'video'].map(m => (
            <button key={m} onClick={() => switchMode(m)}
              className={`px-5 py-1.5 rounded-full text-sm font-medium
                          transition-colors capitalize
                          ${mode === m
                            ? 'bg-white text-black'
                            : 'bg-black/40 text-white hover:bg-black/60'}`}>
              {m === 'photo' ? '📷 Photo' : '🎥 Video'}
            </button>
          ))}
        </div>
      )}

      {/* Main area */}
      <div className="flex-1 relative overflow-hidden">
        {error ? (
          <div className="absolute inset-0 flex items-center
                          justify-center bg-gray-900">
            <div className="text-center px-8">
              <p className="text-5xl mb-4">📷</p>
              <p className="text-red-400 text-sm mb-4">{error}</p>
              <button onClick={() => startStream()}
                className="px-6 py-2.5 bg-emerald-500 text-white
                           rounded-xl text-sm">
                Try Again
              </button>
            </div>
          </div>
        ) : captured ? (
          // Show captured media
          captured.type === 'image' ? (
            <img src={captured.url} alt="captured"
                 className="absolute inset-0 w-full h-full object-cover"/>
          ) : (
            <video src={captured.url} controls autoPlay
                   className="absolute inset-0 w-full h-full object-cover"/>
          )
        ) : (
          // Live camera
          <video ref={videoRef} autoPlay playsInline muted
                 className={`absolute inset-0 w-full h-full object-cover
                             ${facingMode === 'user'
                               ? 'scale-x-[-1]' : ''}`}/>
        )}

        {/* Recording indicator */}
        {recording && (
          <div className="absolute top-20 inset-x-0 flex justify-center">
            <div className="flex items-center gap-2 bg-black/60
                            px-4 py-2 rounded-full">
              <div className="w-3 h-3 bg-red-500 rounded-full
                              animate-pulse"/>
              <span className="text-white text-sm font-medium">
                REC {fmt(recordDuration)}
              </span>
            </div>
          </div>
        )}

        <canvas ref={canvasRef} className="hidden"/>
      </div>

      {/* Controls */}
      <div className="bg-black pt-4 pb-8 flex-shrink-0">
        {captured ? (
          // After capture — retake or send
          <div className="flex items-center justify-center gap-8 px-8">
            <button onClick={handleRetake}
              className="flex flex-col items-center gap-1.5">
              <div className="w-14 h-14 rounded-full bg-gray-700
                              hover:bg-gray-600 flex items-center
                              justify-center transition-colors text-2xl">
                🔄
              </div>
              <span className="text-white/70 text-xs">Retake</span>
            </button>

            <button onClick={handleSend}
              className="flex flex-col items-center gap-1.5">
              <div className="w-16 h-16 rounded-full bg-emerald-500
                              hover:bg-emerald-600 flex items-center
                              justify-center transition-colors shadow-xl">
                <svg viewBox="0 0 24 24" fill="currentColor"
                     className="w-7 h-7 text-white">
                  <path d="M3.478 2.405a.75.75 0 00-.926.94l2.432 7.905H13.5a.75.75 0 010 1.5H4.984l-2.432 7.905a.75.75 0 00.926.94 60.519 60.519 0 0018.445-8.986.75.75 0 000-1.218A60.517 60.517 0 003.478 2.405z"/>
                </svg>
              </div>
              <span className="text-white text-xs font-medium">Send</span>
            </button>
          </div>
        ) : (
          // Capture button
          <div className="flex items-center justify-center">
            <button onClick={handleCapture}
              className={`relative transition-all active:scale-95
                          ${mode === 'video' && recording
                            ? 'scale-90' : ''}`}>
              {mode === 'photo' ? (
                // Photo shutter
                <div className="w-20 h-20 rounded-full border-4
                                border-white flex items-center
                                justify-center">
                  <div className="w-16 h-16 rounded-full bg-white
                                  hover:bg-gray-200 transition-colors"/>
                </div>
              ) : (
                // Video record/stop
                <div className={`w-20 h-20 rounded-full border-4
                                 border-white flex items-center
                                 justify-center transition-all
                                 ${recording
                                   ? 'border-red-500'
                                   : ''}`}>
                  <div className={`transition-all
                                   ${recording
                                     ? 'w-8 h-8 rounded-lg bg-red-500'
                                     : 'w-16 h-16 rounded-full bg-red-500'}`}/>
                </div>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default CameraModal;