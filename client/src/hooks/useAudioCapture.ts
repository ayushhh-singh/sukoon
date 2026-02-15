import { useRef, useCallback, useState } from 'react';
import { float32ToPcm16Base64, computeVolume } from '../utils/audioUtils';

interface UseAudioCaptureReturn {
  isCapturing: boolean;
  isMuted: boolean;
  volume: number;
  startCapture: (onAudioChunk: (base64: string) => void) => Promise<void>;
  stopCapture: () => void;
  toggleMute: () => void;
}

export function useAudioCapture(): UseAudioCaptureReturn {
  const [isCapturing, setIsCapturing] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(0);
  const streamRef = useRef<MediaStream | null>(null);
  const contextRef = useRef<AudioContext | null>(null);
  const workletNodeRef = useRef<AudioWorkletNode | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const volumeIntervalRef = useRef<number | null>(null);

  const startCapture = useCallback(async (onAudioChunk: (base64: string) => void) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: 24000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      streamRef.current = stream;

      const context = new AudioContext({ sampleRate: 24000 });
      contextRef.current = context;

      // Create analyser for volume visualization
      const analyser = context.createAnalyser();
      analyser.fftSize = 256;
      analyserRef.current = analyser;

      const source = context.createMediaStreamSource(stream);
      source.connect(analyser);

      // Use ScriptProcessorNode as fallback for AudioWorklet
      // since AudioWorklet requires a separate file
      const processor = context.createScriptProcessor(4096, 1, 1);
      processor.onaudioprocess = (event: AudioProcessingEvent) => {
        const inputData = event.inputBuffer.getChannelData(0);
        const base64 = float32ToPcm16Base64(inputData);
        onAudioChunk(base64);
      };

      source.connect(processor);
      processor.connect(context.destination);

      // Volume monitoring
      const dataArray = new Float32Array(analyser.frequencyBinCount);
      volumeIntervalRef.current = window.setInterval(() => {
        analyser.getFloatTimeDomainData(dataArray);
        setVolume(computeVolume(dataArray));
      }, 50);

      setIsCapturing(true);
    } catch (error) {
      console.error('[Audio] Failed to start capture:', error);
      throw error;
    }
  }, []);

  const toggleMute = useCallback(() => {
    if (!streamRef.current) return;
    const track = streamRef.current.getAudioTracks()[0];
    if (!track) return;
    track.enabled = !track.enabled;
    setIsMuted(!track.enabled);
  }, []);

  const stopCapture = useCallback(() => {
    if (volumeIntervalRef.current) {
      clearInterval(volumeIntervalRef.current);
      volumeIntervalRef.current = null;
    }

    if (workletNodeRef.current) {
      workletNodeRef.current.disconnect();
      workletNodeRef.current = null;
    }

    if (contextRef.current) {
      contextRef.current.close();
      contextRef.current = null;
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }

    setIsCapturing(false);
    setIsMuted(false);
    setVolume(0);
  }, []);

  return { isCapturing, isMuted, volume, startCapture, stopCapture, toggleMute };
}
