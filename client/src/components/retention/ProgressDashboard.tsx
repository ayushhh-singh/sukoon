import React, { useState, useMemo } from 'react';
import { X, Calendar } from 'lucide-react';
import { StorageService } from '../../services/storage';
import { StreakCard } from './StreakCard';
import { MilestonesGrid } from './MilestonesGrid';
import { SessionScheduler } from './SessionScheduler';

interface ProgressDashboardProps {
  onClose: () => void;
}

export const ProgressDashboard: React.FC<ProgressDashboardProps> = ({ onClose }) => {
  const [showScheduler, setShowScheduler] = useState(false);

  const profileId = StorageService.getActiveProfileId();
  const retention = useMemo(() => profileId ? StorageService.getRetention(profileId) : null, [profileId]);
  const sessions = useMemo(() => profileId ? StorageService.getSessionsForUser(profileId) : [], [profileId]);
  const moods = useMemo(() => StorageService.getMoods().filter(m => m.sessionId && sessions.some(s => s.sessionId === m.sessionId)), [sessions]);

  // Mood trend data (last 10 pre-session moods)
  const moodTrend = useMemo(() => {
    return moods
      .filter(m => m.context === 'pre-session')
      .slice(-10)
      .map(m => ({ date: new Date(m.timestamp).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }), value: m.value }));
  }, [moods]);

  // Session frequency (last 8 weeks)
  const weeklyFrequency = useMemo(() => {
    const now = new Date();
    const weeks: { label: string; count: number }[] = [];
    for (let i = 7; i >= 0; i--) {
      const weekStart = new Date(now);
      weekStart.setDate(now.getDate() - (i * 7 + now.getDay()));
      weekStart.setHours(0, 0, 0, 0);
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 7);

      const count = sessions.filter(s => {
        const d = new Date(s.date);
        return d >= weekStart && d < weekEnd;
      }).length;

      weeks.push({
        label: weekStart.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
        count,
      });
    }
    return weeks;
  }, [sessions]);

  const maxWeekly = Math.max(...weeklyFrequency.map(w => w.count), 1);

  if (!retention) return null;

  return (
    <div className="progress-overlay">
      <div className="progress-dashboard">
        <div className="progress-header">
          <h2>Your Progress</h2>
          <div className="progress-header-actions">
            <button className="progress-schedule-btn" onClick={() => setShowScheduler(true)} title="Session Reminders">
              <Calendar size={18} />
            </button>
            <button className="progress-close" onClick={onClose}><X size={20} /></button>
          </div>
        </div>

        <StreakCard streak={retention.streak} />

        {/* Mood Trend */}
        {moodTrend.length > 1 && (
          <div className="progress-section">
            <h3>Mood Trend</h3>
            <div className="mood-trend-chart">
              {moodTrend.map((m, i) => (
                <div key={i} className="mood-trend-bar-container">
                  <div
                    className="mood-trend-bar"
                    style={{ height: `${(m.value / 5) * 100}%` }}
                    data-value={m.value}
                  />
                  <span className="mood-trend-label">{m.date}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Session Frequency */}
        {sessions.length > 0 && (
          <div className="progress-section">
            <h3>Weekly Sessions</h3>
            <div className="session-freq-chart">
              {weeklyFrequency.map((w, i) => (
                <div key={i} className="freq-bar-container">
                  <div
                    className="freq-bar"
                    style={{ height: `${(w.count / maxWeekly) * 100}%` }}
                  />
                  <span className="freq-count">{w.count}</span>
                  <span className="freq-label">{w.label}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Milestones */}
        <div className="progress-section">
          <h3>Milestones</h3>
          <MilestonesGrid milestones={retention.milestones} />
        </div>

        <div className="progress-stats">
          <div className="progress-stat">
            <span className="progress-stat-value">{sessions.length}</span>
            <span className="progress-stat-label">Total Sessions</span>
          </div>
          <div className="progress-stat">
            <span className="progress-stat-value">
              {Object.values(retention.milestones).filter(v => v !== null).length}
            </span>
            <span className="progress-stat-label">Unlocked</span>
          </div>
        </div>
      </div>

      {showScheduler && (
        <SessionScheduler
          schedule={retention.schedule}
          onSave={(schedule) => {
            if (profileId) StorageService.saveSchedule(profileId, schedule);
          }}
          onClose={() => setShowScheduler(false)}
        />
      )}
    </div>
  );
};
