import { useEffect, useRef } from 'react';
import { MessageCircle } from 'lucide-react';
import type { TranscriptEntry } from '../types';

interface TranscriptProps {
  entries: TranscriptEntry[];
  currentAiText: string;
}

export function Transcript({ entries, currentAiText }: TranscriptProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [entries, currentAiText]);

  if (entries.length === 0 && !currentAiText) {
    return null;
  }

  return (
    <div className="transcript-panel">
      <div className="transcript-header">
        <MessageCircle size={16} />
        <span>Conversation</span>
      </div>
      <div className="transcript-body" ref={scrollRef}>
        {entries.map((entry) => (
          <div key={entry.id} className={`transcript-entry ${entry.role}`}>
            <div className="transcript-role">
              {entry.role === 'ai' ? 'Dr. Aria' : 'You'}
            </div>
            <div className="transcript-text">{entry.text}</div>
          </div>
        ))}
        {currentAiText && (
          <div className="transcript-entry ai streaming">
            <div className="transcript-role">Dr. Aria</div>
            <div className="transcript-text">{currentAiText}<span className="cursor" /></div>
          </div>
        )}
      </div>
    </div>
  );
}
