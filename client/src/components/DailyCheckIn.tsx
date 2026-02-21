import { Flame } from 'lucide-react';
import { StorageService } from '../services/storage';

export function DailyCheckIn() {
  const profileId = StorageService.getActiveProfileId();
  const retention = profileId ? StorageService.getRetention(profileId) : null;
  const streak = retention?.streak.currentStreak ?? 0;

  const message =
    streak === 0 ? 'Start your wellness journey today' :
    streak < 3 ? 'Great start! Keep it going' :
    streak < 7 ? `${streak} days strong!` :
    streak < 30 ? 'Amazing consistency!' :
    'Incredible dedication!';

  return (
    <div className="daily-checkin-widget">
      <div className="checkin-streak">
        <Flame size={16} />
        <span>{streak} day{streak !== 1 ? 's' : ''}</span>
      </div>
      <p className="checkin-motivation">{message}</p>
    </div>
  );
}
