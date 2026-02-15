import type { SpeakingState } from '../types';

interface VoiceOrbProps {
  speakingState: SpeakingState;
  micVolume: number;
  aiVolume: number;
}

export function VoiceOrb({ speakingState, micVolume, aiVolume }: VoiceOrbProps) {
  const scale =
    speakingState === 'user-speaking' ? 1 + micVolume * 3 :
    speakingState === 'ai-speaking'   ? 1 + aiVolume * 3  : 1;

  const stateKey = speakingState === 'user-speaking' ? 'user' : speakingState === 'ai-speaking' ? 'ai' : 'idle';
  const orbClass = `voice-orb orb-${stateKey}`;

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
