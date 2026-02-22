import { JournalPanel } from '../journal/JournalPanel';

export function PatientJournal() {
  return (
    <div className="patient-tab-content">
      <JournalPanel onClose={() => {}} isInline={true} />
    </div>
  );
}
