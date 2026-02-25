import type { Step } from 'react-joyride';

export const patientTourSteps: Step[] = [
  {
    target: '[data-tour="tab-sessions"]',
    content: 'Start a conversation with your AI psychologist anytime. It\'s like having a supportive therapist available 24/7.',
    title: 'Talk to AI Psychologist',
    disableBeacon: true,
  },
  {
    target: '[data-tour="tab-history"]',
    content: 'View summaries and insights from all your past sessions. Track your therapeutic journey over time.',
    title: 'Session History',
  },
  {
    target: '[data-tour="tab-progress"]',
    content: 'See your mood trends, assessment scores, and streaks. Visualize how you\'re progressing.',
    title: 'Your Progress',
  },
  {
    target: '[data-tour="tab-journal"]',
    content: 'Write journal entries to reflect on your thoughts and feelings between sessions.',
    title: 'Journal',
  },
  {
    target: '[data-tour="tab-doctor-input"]',
    content: 'See notes, medications, and treatment plans from your linked doctors. Set dose reminders here too.',
    title: "Doctor's Input",
  },
  {
    target: '[data-tour="tab-appointments"]',
    content: 'Book and manage appointments with your therapist.',
    title: 'Appointments',
  },
  {
    target: '[data-tour="notification-bell"]',
    content: 'Stay updated with notifications about appointments, new notes, and medication reminders.',
    title: 'Notifications',
  },
];

export const therapistTourSteps: Step[] = [
  {
    target: '[data-tour="tab-dashboard"]',
    content: 'Get a quick overview of your practice — upcoming appointments, recent patient activity, and key alerts.',
    title: 'Dashboard',
    disableBeacon: true,
  },
  {
    target: '[data-tour="tab-patients"]',
    content: 'View all your linked patients. Click any patient to see their full clinical picture — sessions, assessments, treatment plans, and more.',
    title: 'Patients',
  },
  {
    target: '[data-tour="tab-appointments"]',
    content: 'Manage your appointment schedule. Confirm, start, or complete sessions with patients.',
    title: 'Appointments',
  },
  {
    target: '[data-tour="tab-notes"]',
    content: 'Write and manage clinical notes including SOAP notes for your patients.',
    title: 'Notes',
  },
  {
    target: '[data-tour="tab-medications"]',
    content: 'Prescribe and track medications for your patients. Monitor their adherence.',
    title: 'Medications',
  },
];
