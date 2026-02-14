import { useState } from 'react';
import { Shield, Heart, AlertTriangle, ChevronDown, ChevronUp } from 'lucide-react';

interface ConsentScreenProps {
  onAccept: () => void;
}

export function ConsentScreen({ onAccept }: ConsentScreenProps) {
  const [agreed, setAgreed] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  return (
    <div className="consent-screen">
      <div className="consent-card">
        <div className="consent-header">
          <div className="consent-logo">
            <Heart size={32} />
          </div>
          <h1>Sukoon</h1>
          <p className="consent-subtitle">AI-Powered Supportive Conversations</p>
        </div>

        <div className="consent-body">
          <div className="consent-notice">
            <Shield size={20} />
            <div>
              <strong>Your Privacy Matters</strong>
              <p>
                Your conversations are processed in real-time and are{' '}
                <strong>not stored or recorded</strong> on our servers. Audio is streamed
                directly and discarded after processing.
              </p>
            </div>
          </div>

          <div className="consent-notice warning">
            <AlertTriangle size={20} />
            <div>
              <strong>Important Disclaimer</strong>
              <p>
                This is an AI assistant, <strong>not a licensed therapist</strong>. It cannot
                prescribe medication, provide formal diagnoses, or replace professional
                mental health care. If you are in crisis, please contact emergency services
                or a crisis helpline immediately.
              </p>
            </div>
          </div>

          <button
            className="details-toggle"
            onClick={() => setShowDetails(!showDetails)}
            type="button"
          >
            {showDetails ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            What to expect
          </button>

          {showDetails && (
            <div className="consent-details">
              <ul>
                <li>You'll speak with Dr. Aria, an AI psychologist</li>
                <li>The conversation uses voice — microphone access is required</li>
                <li>You can end the session at any time</li>
                <li>Topics can include stress, anxiety, relationships, and more</li>
                <li>Crisis resources will be provided if needed</li>
                <li>Each session is independent — no history is saved</li>
              </ul>
            </div>
          )}

          <div className="consent-crisis-info">
            <p><strong>Crisis Resources (available 24/7):</strong></p>
            <ul>
              <li>Emergency: <strong>112</strong></li>
              <li>Vandrevala Foundation: <strong>1860-2662-345</strong></li>
              <li>iCALL (TISS): <strong>9152987821</strong></li>
              <li>AASRA: <strong>9820466726</strong></li>
            </ul>
          </div>

          <label className="consent-checkbox">
            <input
              type="checkbox"
              checked={agreed}
              onChange={(e) => setAgreed(e.target.checked)}
            />
            <span>
              I understand that this is an AI assistant, not a replacement for professional
              mental health care. I consent to microphone access for this session.
            </span>
          </label>
        </div>

        <div className="consent-footer">
          <button
            className="btn-primary"
            onClick={onAccept}
            disabled={!agreed}
          >
            Begin Session
          </button>
        </div>
      </div>
    </div>
  );
}
