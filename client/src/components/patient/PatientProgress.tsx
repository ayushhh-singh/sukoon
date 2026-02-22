import { ProgressDashboard } from '../retention/ProgressDashboard';

export function PatientProgress() {
  return (
    <div className="patient-tab-content">
      <ProgressDashboard onClose={() => {}} isInline={true} />
    </div>
  );
}
