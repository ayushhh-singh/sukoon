import { Mic, MicOff, PhoneOff } from 'lucide-react';
import type { ConnectionStatus } from '../types';

interface SessionControlsProps {
  isActive: boolean;
  connectionStatus: ConnectionStatus;
  onStart: () => void;
  onEnd: () => void;
}

export function SessionControls({
  isActive,
  connectionStatus,
  onStart,
  onEnd,
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
      <div className="mic-indicator">
        {connectionStatus === 'connected' ? (
          <Mic size={20} className="mic-active" />
        ) : (
          <MicOff size={20} />
        )}
        <span>
          {connectionStatus === 'connected'
            ? 'Microphone active — speak naturally'
            : 'Connecting...'}
        </span>
      </div>
      <button className="btn-end" onClick={onEnd}>
        <PhoneOff size={20} />
        <span>End Session</span>
      </button>
    </div>
  );
}
