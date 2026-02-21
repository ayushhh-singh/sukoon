import React, { useState, useRef, useEffect } from 'react';
import { Send, Square } from 'lucide-react';
import type { ChatMessage } from '../../types/chat';

interface ChatSessionProps {
  messages: ChatMessage[];
  onSendMessage: (text: string) => void;
  onEnd: () => void;
  isConnected: boolean;
}

export const ChatSession: React.FC<ChatSessionProps> = ({
  messages,
  onSendMessage,
  onEnd,
  isConnected,
}) => {
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const isAiStreaming = messages.length > 0 && messages[messages.length - 1].isStreaming;

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (!isAiStreaming) inputRef.current?.focus();
  }, [isAiStreaming]);

  const handleSend = () => {
    if (input.trim() && !isAiStreaming) {
      onSendMessage(input);
      setInput('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="chat-session">
      <div className="chat-header">
        <div className="chat-header-info">
          <div className="chat-avatar">A</div>
          <div>
            <h3>Dr. Aria</h3>
            <span className={`chat-status ${isConnected ? 'online' : ''}`}>
              {isConnected ? 'Online' : 'Connecting...'}
            </span>
          </div>
        </div>
        <button className="chat-end-btn" onClick={onEnd}>
          <Square size={14} />
          <span>End Session</span>
        </button>
      </div>

      <div className="chat-messages">
        {messages.length === 0 && (
          <div className="chat-empty">
            <p>Dr. Aria is joining...</p>
          </div>
        )}
        {messages.map(msg => (
          <div key={msg.id} className={`chat-bubble ${msg.role}${msg.isStreaming ? ' streaming' : ''}`}>
            <p>{msg.text}</p>
            {!msg.isStreaming && (
              <span className="chat-bubble-time">
                {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            )}
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      <div className="chat-input-bar">
        <input
          ref={inputRef}
          type="text"
          className="chat-input"
          placeholder={isAiStreaming ? 'Dr. Aria is typing...' : 'Type your message...'}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={isAiStreaming || !isConnected}
          maxLength={2000}
        />
        <button
          className="chat-send-btn"
          onClick={handleSend}
          disabled={!input.trim() || isAiStreaming || !isConnected}
        >
          <Send size={18} />
        </button>
      </div>
    </div>
  );
};
