import { useRef, useCallback, useState } from 'react';
import { pcm16Base64ToFloat32 } from '../utils/audioUtils';

interface UseAudioPlaybackReturn {
  isPlaying: boolean;
  playChunk: (base64: string) => void;
  stop: () => void;
  volume: number;
}

export function useAudioPlayback(): UseAudioPlaybackReturn {
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(0);
  const contextRef = useRef<AudioContext | null>(null);
  const nextStartTimeRef = useRef(0);
  const activeSourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());

  const getContext = useCallback(() => {
    if (!contextRef.current || contextRef.current.state === 'closed') {
      contextRef.current = new AudioContext({ sampleRate: 24000 });
      nextStartTimeRef.current = 0;
    }
    return contextRef.current;
  }, []);

  const playChunk = useCallback((base64: string) => {
    const context = getContext();
    const float32 = pcm16Base64ToFloat32(base64);

    // Compute volume for visualization
    let sum = 0;
    for (let i = 0; i < float32.length; i++) {
      sum += float32[i] * float32[i];
    }
    setVolume(Math.sqrt(sum / float32.length));

    const buffer = context.createBuffer(1, float32.length, 24000);
    buffer.getChannelData(0).set(float32);

    const source = context.createBufferSource();
    source.buffer = buffer;
    source.connect(context.destination);

    // Schedule seamless playback
    const now = context.currentTime;
    const startTime = Math.max(now, nextStartTimeRef.current);
    source.start(startTime);
    nextStartTimeRef.current = startTime + buffer.duration;

    activeSourcesRef.current.add(source);
    setIsPlaying(true);

    source.onended = () => {
      activeSourcesRef.current.delete(source);
      if (activeSourcesRef.current.size === 0) {
        setIsPlaying(false);
        setVolume(0);
      }
    };
  }, [getContext]);

  const stop = useCallback(() => {
    activeSourcesRef.current.forEach(source => {
      try { source.stop(); } catch { /* already stopped */ }
    });
    activeSourcesRef.current.clear();
    nextStartTimeRef.current = 0;
    setIsPlaying(false);
    setVolume(0);
  }, []);

  return { isPlaying, playChunk, stop, volume };
}
