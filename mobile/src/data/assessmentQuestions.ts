import type { AssessmentConfig } from '../types/assessments';

export const PHQ9_CONFIG: AssessmentConfig = {
  type: 'PHQ9',
  title: 'Depression Screening (PHQ-9)',
  description: 'Over the last 2 weeks, how often have you been bothered by any of the following problems?',
  instructions: 'Select the answer that best describes how often you have experienced each symptom.',
  questions: [
    { id: 1, text: 'Little interest or pleasure in doing things' },
    { id: 2, text: 'Feeling down, depressed, or hopeless' },
    { id: 3, text: 'Trouble falling or staying asleep, or sleeping too much' },
    { id: 4, text: 'Feeling tired or having little energy' },
    { id: 5, text: 'Poor appetite or overeating' },
    { id: 6, text: 'Feeling bad about yourself — or that you are a failure or have let yourself or your family down' },
    { id: 7, text: 'Trouble concentrating on things, such as reading the newspaper or watching television' },
    { id: 8, text: 'Moving or speaking so slowly that other people could have noticed? Or the opposite — being so fidgety or restless that you have been moving around a lot more than usual' },
    { id: 9, text: 'Thoughts that you would be better off dead, or of hurting yourself in some way' },
  ],
  responseOptions: [
    { value: 0, label: 'Not at all' },
    { value: 1, label: 'Several days' },
    { value: 2, label: 'More than half the days' },
    { value: 3, label: 'Nearly every day' },
  ],
  scoringRanges: [
    { min: 0, max: 4, severity: 'Minimal', description: 'Minimal depression', color: '#22c55e' },
    { min: 5, max: 9, severity: 'Mild', description: 'Mild depression', color: '#eab308' },
    { min: 10, max: 14, severity: 'Moderate', description: 'Moderate depression', color: '#f97316' },
    { min: 15, max: 19, severity: 'Moderately Severe', description: 'Moderately severe depression', color: '#ef4444' },
    { min: 20, max: 27, severity: 'Severe', description: 'Severe depression', color: '#dc2626' },
  ],
  maxScore: 27,
};

export const GAD7_CONFIG: AssessmentConfig = {
  type: 'GAD7',
  title: 'Anxiety Screening (GAD-7)',
  description: 'Over the last 2 weeks, how often have you been bothered by the following problems?',
  instructions: 'Select the answer that best describes your experience.',
  questions: [
    { id: 1, text: 'Feeling nervous, anxious, or on edge' },
    { id: 2, text: 'Not being able to stop or control worrying' },
    { id: 3, text: 'Worrying too much about different things' },
    { id: 4, text: 'Trouble relaxing' },
    { id: 5, text: "Being so restless that it's hard to sit still" },
    { id: 6, text: 'Becoming easily annoyed or irritable' },
    { id: 7, text: 'Feeling afraid as if something awful might happen' },
  ],
  responseOptions: [
    { value: 0, label: 'Not at all' },
    { value: 1, label: 'Several days' },
    { value: 2, label: 'More than half the days' },
    { value: 3, label: 'Nearly every day' },
  ],
  scoringRanges: [
    { min: 0, max: 4, severity: 'Minimal', description: 'Minimal anxiety', color: '#22c55e' },
    { min: 5, max: 9, severity: 'Mild', description: 'Mild anxiety', color: '#eab308' },
    { min: 10, max: 14, severity: 'Moderate', description: 'Moderate anxiety', color: '#f97316' },
    { min: 15, max: 21, severity: 'Severe', description: 'Severe anxiety', color: '#ef4444' },
  ],
  maxScore: 21,
};

export const PSS10_CONFIG: AssessmentConfig = {
  type: 'PSS',
  title: 'Stress Assessment (PSS-10)',
  description: 'In the last month, how often have you...',
  instructions: 'Rate how often you have felt or thought a certain way.',
  questions: [
    { id: 1, text: 'Been upset because of something that happened unexpectedly' },
    { id: 2, text: 'Felt that you were unable to control the important things in your life' },
    { id: 3, text: 'Felt nervous and stressed' },
    { id: 4, text: 'Felt confident about your ability to handle your personal problems', isReversed: true },
    { id: 5, text: 'Felt that things were going your way', isReversed: true },
    { id: 6, text: 'Found that you could not cope with all the things that you had to do' },
    { id: 7, text: 'Been able to control irritations in your life', isReversed: true },
    { id: 8, text: 'Felt that you were on top of things', isReversed: true },
    { id: 9, text: 'Been angered because of things that happened that were outside of your control' },
    { id: 10, text: 'Felt difficulties were piling up so high that you could not overcome them' },
  ],
  responseOptions: [
    { value: 0, label: 'Never' },
    { value: 1, label: 'Almost never' },
    { value: 2, label: 'Sometimes' },
    { value: 3, label: 'Fairly often' },
    { value: 4, label: 'Very often' },
  ],
  scoringRanges: [
    { min: 0, max: 13, severity: 'Low', description: 'Low perceived stress', color: '#22c55e' },
    { min: 14, max: 26, severity: 'Moderate', description: 'Moderate perceived stress', color: '#eab308' },
    { min: 27, max: 40, severity: 'High', description: 'High perceived stress', color: '#ef4444' },
  ],
  maxScore: 40,
};

export const ALL_ASSESSMENTS = [PHQ9_CONFIG, GAD7_CONFIG, PSS10_CONFIG];
