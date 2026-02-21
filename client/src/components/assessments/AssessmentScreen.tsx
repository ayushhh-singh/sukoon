import { useState } from 'react';
import { ChevronLeft, ChevronRight, SkipForward, ArrowLeft } from 'lucide-react';
import type { AssessmentConfig, AssessmentResponse } from '../../types/assessments';

interface AssessmentScreenProps {
  config: AssessmentConfig;
  timing: 'pre-session' | 'post-session';
  onComplete: (responses: AssessmentResponse[]) => void;
  onSkip: () => void;
  onBack?: () => void;
}

export function AssessmentScreen({ config, timing, onComplete, onSkip, onBack }: AssessmentScreenProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [responses, setResponses] = useState<Map<number, number>>(new Map());

  const question = config.questions[currentIndex];
  const totalQuestions = config.questions.length;
  const progress = ((currentIndex + 1) / totalQuestions) * 100;
  const currentValue = responses.get(question.id);
  const allAnswered = responses.size === totalQuestions;

  function selectOption(value: number) {
    const updated = new Map(responses);
    updated.set(question.id, value);
    setResponses(updated);

    // Auto-advance after short delay
    if (currentIndex < totalQuestions - 1) {
      setTimeout(() => setCurrentIndex(i => Math.min(i + 1, totalQuestions - 1)), 300);
    }
  }

  function handleSubmit() {
    const result: AssessmentResponse[] = Array.from(responses.entries()).map(
      ([questionId, value]) => ({ questionId, value })
    );
    onComplete(result);
  }

  return (
    <div className="assessment-screen">
      <div className="assessment-card">
        {onBack && (
          <button className="step-back-btn" onClick={onBack}>
            <ArrowLeft size={16} /> Back
          </button>
        )}
        <div className="assessment-header">
          <h2>{config.title}</h2>
          <p className="assessment-timing">
            {timing === 'pre-session' ? 'Before your session' : 'After your session'}
          </p>
          <p className="assessment-desc">{config.description}</p>
        </div>

        {/* Progress bar */}
        <div className="assessment-progress">
          <div className="assessment-progress-bar" style={{ width: `${progress}%` }} />
          <span className="assessment-progress-text">
            {currentIndex + 1} of {totalQuestions}
          </span>
        </div>

        {/* Question */}
        <div className="assessment-question">
          <p className="question-text">{question.text}</p>

          <div className="response-options">
            {config.responseOptions.map(option => (
              <button
                key={option.value}
                className={`response-option ${currentValue === option.value ? 'selected' : ''}`}
                onClick={() => selectOption(option.value)}
              >
                <span className="response-radio">
                  {currentValue === option.value && <span className="response-radio-dot" />}
                </span>
                <span>{option.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Navigation */}
        <div className="assessment-nav">
          <button
            className="nav-btn"
            onClick={() => setCurrentIndex(i => Math.max(0, i - 1))}
            disabled={currentIndex === 0}
          >
            <ChevronLeft size={18} /> Back
          </button>

          {currentIndex < totalQuestions - 1 ? (
            <button
              className="nav-btn"
              onClick={() => setCurrentIndex(i => i + 1)}
              disabled={currentValue === undefined}
            >
              Next <ChevronRight size={18} />
            </button>
          ) : (
            <button
              className="btn-primary nav-submit"
              onClick={handleSubmit}
              disabled={!allAnswered}
            >
              View Results
            </button>
          )}
        </div>

        <button className="assessment-skip" onClick={onSkip}>
          <SkipForward size={14} /> Skip assessment
        </button>
      </div>
    </div>
  );
}
