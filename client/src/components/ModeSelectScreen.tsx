import React from 'react';
import { Mic, MessageSquare, ArrowLeft } from 'lucide-react';
import type { SessionMode } from '../types/chat';

interface ModeSelectScreenProps {
  onSelect: (mode: SessionMode) => void;
  onBack?: () => void;
}

export const ModeSelectScreen: React.FC<ModeSelectScreenProps> = ({ onSelect, onBack }) => {
  return (
    <div className="mode-select-screen">
      {onBack && (
        <button className="step-back-btn" onClick={onBack}>
          <ArrowLeft size={16} /> Back
        </button>
      )}
      <div className="mode-select-header">
        <h2>Choose Your Session Type</h2>
        <p>How would you like to connect with Dr. Aria today?</p>
      </div>

      <div className="mode-cards">
        <button className="mode-card" onClick={() => onSelect('voice')}>
          <div className="mode-card-icon voice">
            <Mic size={32} />
          </div>
          <h3>Voice Session</h3>
          <p>Real-time voice conversation</p>
          <span className="mode-card-hint">Best for deeper sessions</span>
        </button>

        <button className="mode-card" onClick={() => onSelect('chat')}>
          <div className="mode-card-icon chat">
            <MessageSquare size={32} />
          </div>
          <h3>Chat Session</h3>
          <p>Text-based conversation</p>
          <span className="mode-card-hint">Quick check-ins &amp; journaling</span>
        </button>
      </div>
    </div>
  );
};
