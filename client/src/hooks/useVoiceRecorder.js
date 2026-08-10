import { useState, useRef } from 'react';

const useVoiceRecorder = () => {
  const [recording, setRecording] = useState(false);
  const [duration, setDuration] = useState(0);
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const timerRef = useRef(null);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true
      });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.start(100);
      setRecording(true);
      setDuration(0);

      timerRef.current = setInterval(() => {
        setDuration(d => d + 1);
      }, 1000);

    } catch (err) {
      console.error('Microphone access denied:', err);
      alert('Please allow microphone access to record voice messages.');
    }
  };

  const stopRecording = () => {
    return new Promise((resolve) => {
      const mediaRecorder = mediaRecorderRef.current;
      if (!mediaRecorder) return resolve(null);

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current,
          { type: 'audio/webm' });
        const file = new File([blob],
          `voice_${Date.now()}.webm`,
          { type: 'audio/webm' });

        // Stop all tracks
        mediaRecorder.stream.getTracks()
          .forEach(t => t.stop());

        resolve(file);
      };

      mediaRecorder.stop();
      setRecording(false);
      clearInterval(timerRef.current);
      setDuration(0);
    });
  };

  const cancelRecording = () => {
    const mediaRecorder = mediaRecorderRef.current;
    if (mediaRecorder) {
      mediaRecorder.stream.getTracks().forEach(t => t.stop());
      mediaRecorder.stop();
    }
    setRecording(false);
    clearInterval(timerRef.current);
    setDuration(0);
    chunksRef.current = [];
  };

  const formatDuration = (s) => {
    const m = Math.floor(s / 60).toString().padStart(2, '0');
    return `${m}:${(s % 60).toString().padStart(2, '0')}`;
  };

  return {
    recording,
    duration,
    formattedDuration: formatDuration(duration),
    startRecording,
    stopRecording,
    cancelRecording,
  };
};

export default useVoiceRecorder;