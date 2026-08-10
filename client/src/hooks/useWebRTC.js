import { useEffect, useRef, useState } from 'react';
import useCallStore from '../store/callStore';
import useAuthStore from '../store/authStore';

const useWebRTC = (stompClient) => {
  const peerConnectionRef = useRef(null);
  const localStreamRef = useRef(null);
  const { user } = useAuthStore();
  const { endCall } = useCallStore();
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);

  const rtcConfig = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
    ],
  };

  const sendSignal = (targetUserId, type, data, callType) => {
    if (!stompClient || !stompClient.connected) return;
    stompClient.publish({
      destination: '/app/signal',
      body: JSON.stringify({
        senderId: user.id,
        senderUsername: user.username,
        senderDisplayName: user.displayName,
        targetUserId,
        type,
        callType,
        data,
      }),
    });
  };

  const createPeerConnection = (targetUserId) => {
    const pc = new RTCPeerConnection(rtcConfig);

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        sendSignal(targetUserId, 'ice-candidate', event.candidate);
      }
    };

    pc.ontrack = (event) => {
      setRemoteStream(event.streams[0]);
    };

    pc.onconnectionstatechange = () => {
      if (
        pc.connectionState === 'disconnected' ||
        pc.connectionState === 'failed'
      ) {
        handleEndCall(targetUserId);
      }
    };

    peerConnectionRef.current = pc;
    return pc;
  };

  // Get media stream with fallback
  const getMediaStream = async (callType) => {
    // Try requested constraints first
    try {
      return await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: callType === 'video',
      });
    } catch (err) {
      console.warn('Failed with requested constraints:', err.name);

      // Fallback 1 — audio only
      try {
        console.warn('Trying audio only...');
        return await navigator.mediaDevices.getUserMedia({
          audio: true,
          video: false,
        });
      } catch (err2) {
        console.error('Audio only also failed:', err2.name);
        throw err2;
      }
    }
  };

  const startCall = async (targetUserId, callType) => {
    try {
      const stream = await getMediaStream(callType);
      localStreamRef.current = stream;
      setLocalStream(stream);

      const pc = createPeerConnection(targetUserId);
      stream.getTracks().forEach((track) =>
        pc.addTrack(track, stream)
      );

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      sendSignal(targetUserId, 'offer', offer, callType);

    } catch (err) {
      console.error('Error starting call:', err.name, err.message);
      handleEndCall(null);
      alert(
        `Could not start call.\n` +
        `Error: ${err.name}\n` +
        `Message: ${err.message}\n\n` +
        `Make sure microphone is connected and allowed.`
      );
    }
  };

  const acceptCall = async (targetUserId, offer, callType) => {
    try {
      const stream = await getMediaStream(callType);
      localStreamRef.current = stream;
      setLocalStream(stream);

      const pc = createPeerConnection(targetUserId);
      stream.getTracks().forEach((track) =>
        pc.addTrack(track, stream)
      );

      await pc.setRemoteDescription(
        new RTCSessionDescription(offer)
      );
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      sendSignal(targetUserId, 'answer', answer, callType);

    } catch (err) {
      console.error('Error accepting call:', err.name, err.message);
      handleEndCall(null);
    }
  };

  const handleAnswer = async (answer) => {
    const pc = peerConnectionRef.current;
    if (!pc) return;
    await pc.setRemoteDescription(
      new RTCSessionDescription(answer)
    );
  };

  const handleIceCandidate = async (candidate) => {
    const pc = peerConnectionRef.current;
    if (!pc) return;
    try {
      await pc.addIceCandidate(new RTCIceCandidate(candidate));
    } catch (err) {
      console.error('Error adding ICE candidate:', err);
    }
  };

  const handleEndCall = (targetUserId) => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks()
        .forEach((track) => track.stop());
      localStreamRef.current = null;
    }
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }
    setLocalStream(null);
    setRemoteStream(null);
    if (targetUserId) {
      sendSignal(targetUserId, 'call-end', null);
    }
    endCall();
  };

  // Listen for WebRTC signals from App.jsx
  useEffect(() => {
    const handleSignal = async (event) => {
      const signal = event.detail;
      switch (signal.type) {
        case 'answer':
          await handleAnswer(signal.data);
          break;
        case 'ice-candidate':
          await handleIceCandidate(signal.data);
          break;
        case 'call-end':
          handleEndCall(null);
          break;
      }
    };

    window.addEventListener('webrtc-signal', handleSignal);
    return () =>
      window.removeEventListener('webrtc-signal', handleSignal);
  }, []);

  return {
    localStream,
    remoteStream,
    startCall,
    acceptCall,
    handleAnswer,
    handleIceCandidate,
    handleEndCall,
  };
};

export default useWebRTC;