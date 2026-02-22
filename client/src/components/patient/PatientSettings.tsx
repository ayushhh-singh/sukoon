import { SettingsPanel } from '../settings/SettingsPanel';

interface PatientSettingsProps {
  onProfileUpdated: () => void;
}

export function PatientSettings({ onProfileUpdated }: PatientSettingsProps) {
  return (
    <div className="patient-tab-content">
      <SettingsPanel
        onClose={() => {}}
        onProfileUpdated={onProfileUpdated}
        isInline={true}
      />
    </div>
  );
}
