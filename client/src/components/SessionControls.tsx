import { Mic, MicOff, PhoneOff } from 'lucide-react';
import type { ConnectionStatus } from '../types';

interface SessionControlsProps {
  isActive: boolean;
  connectionStatus: ConnectionStatus;
  onStart: () => void;
  onEnd: () => void;
  isMuted?: boolean;
  onToggleMute?: () => void;
}

export function SessionControls({
  isActive,
  connectionStatus,
  onStart,
  onEnd,
  isMuted = false,
  onToggleMute,
}: SessionControlsProps) {
  if (!isActive) {
    return (
      <div className="session-controls">
        <button className="btn-start" onClick={onStart}>
          <Mic size={24} />
          <span>Start Session</span>
        </button>
        <p className="controls-hint">
          Press to begin your conversation with Dr. Aria
        </p>
      </div>
    );
  }

  return (
    <div className="session-controls active">
      <div className="session-controls-row">
        <button
          className={`btn-mute${isMuted ? ' muted' : ''}`}
          onClick={onToggleMute}
          title={isMuted ? 'Unmute microphone' : 'Mute microphone'}
          disabled={connectionStatus !== 'connected'}
        >
          {isMuted ? <MicOff size={20} /> : <Mic size={20} />}
          <span>{isMuted ? 'Unmute' : 'Mute'}</span>
        </button>

        <button className="btn-end" onClick={onEnd}>
          <PhoneOff size={20} />
          <span>End Session</span>
        </button>
      </div>

      <p className="controls-hint-active">
        {isMuted
          ? 'Microphone muted — Dr. Aria cannot hear you'
          : connectionStatus === 'connected'
            ? 'Microphone active — speak naturally'
            : 'Connecting...'}
      </p>
    </div>
  );
}
