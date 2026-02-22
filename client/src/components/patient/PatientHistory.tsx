import { HistoryScreen } from '../history/HistoryScreen';
import type { BookmarkedStrategy } from '../../types/session';

interface PatientHistoryProps {
  bookmarks: BookmarkedStrategy[];
  onToggleBookmark: (strategy: BookmarkedStrategy) => void;
}

export function PatientHistory({ bookmarks, onToggleBookmark }: PatientHistoryProps) {
  return (
    <div className="patient-tab-content">
      <HistoryScreen
        onClose={() => {}}
        bookmarks={bookmarks}
        onToggleBookmark={onToggleBookmark}
        isInline={true}
      />
    </div>
  );
}
