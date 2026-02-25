import Joyride, { type CallBackProps, STATUS } from 'react-joyride';
import type { Step } from 'react-joyride';

interface GuidedTourProps {
  steps: Step[];
  storageKey: string;
}

export function GuidedTour({ steps, storageKey }: GuidedTourProps) {
  const isDone = localStorage.getItem(storageKey) === 'true';

  if (isDone || steps.length === 0) return null;

  function handleCallback(data: CallBackProps) {
    const { status } = data;
    if (status === STATUS.FINISHED || status === STATUS.SKIPPED) {
      localStorage.setItem(storageKey, 'true');
    }
  }

  return (
    <Joyride
      steps={steps}
      continuous
      showSkipButton
      showProgress
      run={!isDone}
      callback={handleCallback}
      styles={{
        options: {
          primaryColor: 'var(--accent, #6366f1)',
          zIndex: 10000,
          textColor: '#333',
          backgroundColor: '#fff',
          arrowColor: '#fff',
        },
        tooltip: {
          borderRadius: '14px',
          padding: '1.25rem',
        },
        tooltipTitle: {
          fontSize: '1rem',
          fontWeight: 600,
        },
        tooltipContent: {
          fontSize: '0.875rem',
          lineHeight: 1.5,
        },
        buttonNext: {
          borderRadius: '8px',
          padding: '8px 16px',
          fontSize: '0.85rem',
        },
        buttonBack: {
          borderRadius: '8px',
          padding: '8px 16px',
          fontSize: '0.85rem',
          color: '#666',
        },
        buttonSkip: {
          fontSize: '0.8rem',
          color: '#999',
        },
      }}
      locale={{
        back: 'Back',
        close: 'Close',
        last: 'Done',
        next: 'Next',
        skip: 'Skip tour',
      }}
    />
  );
}
