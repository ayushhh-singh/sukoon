import { useEffect, useRef } from 'react';
import type { AmbientSound } from '../../types/session';

interface AmbientSoundPlayerProps {
  sound: AmbientSound;
  isAiSpeaking: boolean;
}

// Generates ambient sound using Web Audio API — no audio files needed.
export function AmbientSoundPlayer({ sound, isAiSpeaking }: AmbientSoundPlayerProps) {
  const ctxRef = useRef<AudioContext | null>(null);
  const gainRef = useRef<GainNode | null>(null);
  const sourceRef = useRef<AudioBufferSourceNode | null>(null);
  const lfoRef = useRef<OscillatorNode | null>(null);

  useEffect(() => {
    if (sound === 'none') {
      stop();
      return;
    }

    const ctx = new AudioContext();
    ctxRef.current = ctx;

    // Build a brown-noise buffer (8 seconds, loops seamlessly)
    const rate = ctx.sampleRate;
    const buf = ctx.createBuffer(1, rate * 8, rate);
    const data = buf.getChannelData(0);
    let last = 0;
    for (let i = 0; i < data.length; i++) {
      const white = Math.random() * 2 - 1;
      data[i] = (last + 0.02 * white) / 1.02;
      last = data[i];
      data[i] *= 3.5;
    }

    const source = ctx.createBufferSource();
    source.buffer = buf;
    source.loop = true;
    sourceRef.current = source;

    const filter = ctx.createBiquadFilter();
    const gain = ctx.createGain();
    gainRef.current = gain;
    gain.gain.value = 0.25;

    if (sound === 'rain') {
      filter.type = 'bandpass';
      filter.frequency.value = 3800;
      filter.Q.value = 0.6;
    } else if (sound === 'ocean') {
      filter.type = 'lowpass';
      filter.frequency.value = 700;
      // LFO creates gentle wave swell
      const lfo = ctx.createOscillator();
      const lfoGain = ctx.createGain();
      lfo.frequency.value = 0.12;
      lfoGain.gain.value = 250;
      lfo.connect(lfoGain);
      lfoGain.connect(filter.frequency);
      lfo.start();
      lfoRef.current = lfo;
    } else if (sound === 'forest') {
      filter.type = 'bandpass';
      filter.frequency.value = 2200;
      filter.Q.value = 0.4;
    } else if (sound === 'piano') {
      filter.type = 'lowpass';
      filter.frequency.value = 500;
      gain.gain.value = 0.12;
    }

    source.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    source.start();

    return stop;
  }, [sound]);

  // Duck volume while AI is speaking
  useEffect(() => {
    if (!gainRef.current || !ctxRef.current) return;
    const target = isAiSpeaking ? 0.04 : 0.25;
    gainRef.current.gain.setTargetAtTime(target, ctxRef.current.currentTime, 0.6);
  }, [isAiSpeaking]);

  function stop() {
    try { sourceRef.current?.stop(); } catch { /* already stopped */ }
    sourceRef.current = null;
    try { lfoRef.current?.stop(); } catch { /* already stopped */ }
    lfoRef.current = null;
    ctxRef.current?.close();
    ctxRef.current = null;
    gainRef.current = null;
  }

  return null;
}
