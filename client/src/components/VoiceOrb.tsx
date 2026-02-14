import { useMemo } from 'react';
import type { SpeakingState } from '../types';

interface VoiceOrbProps {
  speakingState: SpeakingState;
  micVolume: number;
  aiVolume: number;
}

export function VoiceOrb({ speakingState, micVolume, aiVolume }: VoiceOrbProps) {
  const scale = useMemo(() => {
    if (speakingState === 'user-speaking') {
      return 1 + micVolume * 3;
    }
    if (speakingState === 'ai-speaking') {
      return 1 + aiVolume * 3;
    }
    return 1;
  }, [speakingState, micVolume, aiVolume]);

  const orbClass = [
    'voice-orb',
    speakingState === 'user-speaking' && 'orb-user',
    speakingState === 'ai-speaking' && 'orb-ai',
    speakingState === 'idle' && 'orb-idle',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className="voice-orb-container">
      {/* Glow layers */}
      <div
        className={`${orbClass} orb-glow-outer`}
        style={{ transform: `scale(${scale * 1.4})` }}
      />
      <div
        className={`${orbClass} orb-glow`}
        style={{ transform: `scale(${scale * 1.2})` }}
      />
      {/* Main orb */}
      <div
        className={orbClass}
        style={{ transform: `scale(${scale})` }}
      />

      {/* State label */}
      <div className="orb-label">
        {speakingState === 'user-speaking' && 'Listening...'}
        {speakingState === 'ai-speaking' && 'Dr. Aria is speaking...'}
        {speakingState === 'idle' && 'Ready'}
      </div>
    </div>
  );
}
