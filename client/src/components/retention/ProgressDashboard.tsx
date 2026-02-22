import React, { useState, useMemo, useEffect } from 'react';
import { X, Calendar } from 'lucide-react';
import { retention as retentionApi, sessions as sessionsApi, moods as moodsApi } from '../../services/api';
import { StreakCard } from './StreakCard';
import { MilestonesGrid } from './MilestonesGrid';
import { SessionScheduler } from './SessionScheduler';
import type { StreakData, ScheduleEntry } from '../../types/retention';

interface ProgressDashboardProps {
  onClose: () => void;
  isInline?: boolean;
}

export const ProgressDashboard: React.FC<ProgressDashboardProps> = ({ onClose, isInline }) => {
  const [showScheduler, setShowScheduler] = useState(false);
  const [loading, setLoading] = useState(true);
  const [retentionData, setRetentionData] = useState<Record<string, unknown> | null>(null);
  const [sessionList, setSessionList] = useState<Record<string, unknown>[]>([]);
  const [moodList, setMoodList] = useState<Record<string, unknown>[]>([]);

  useEffect(() => {
    async function load() {
      try {
        const [ret, sess, moodzz] = await Promise.all([
          retentionApi.get(),
          sessionsApi.list(),
          moodsApi.list(),
        ]);
        setRetentionData(ret);
        setSessionList(sess);
        setMoodList(moodzz);
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  // Mood trend data (last 10 pre-session moods)
  const moodTrend = useMemo(() => {
    return moodList
      .filter(m => m.context === 'pre-session')
      .slice(-10)
      .map(m => ({
        date: new Date((m.timestamp || m.created_at) as string).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
        value: (m.value as number) || 3,
      }));
  }, [moodList]);

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

      const count = sessionList.filter(s => {
        const d = new Date((s.date || s.created_at) as string);
        return d >= weekStart && d < weekEnd;
      }).length;

      weeks.push({
        label: weekStart.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
        count,
      });
    }
    return weeks;
  }, [sessionList]);

  const maxWeekly = Math.max(...weeklyFrequency.map(w => w.count), 1);

  if (loading) {
    return (
      <div className={`progress-dashboard ${isInline ? 'progress-dashboard-inline' : ''}`}>
        <div className="progress-header">
          <h2>Your Progress</h2>
          {!isInline && <button className="progress-close" onClick={onClose}><X size={20} /></button>}
        </div>
        <p style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>Loading...</p>
      </div>
    );
  }

  const rawStreak = retentionData?.streak as Record<string, unknown> | undefined;
  const streak: StreakData | undefined = rawStreak ? {
    currentStreak: (rawStreak.currentStreak ?? rawStreak.current_streak ?? 0) as number,
    longestStreak: (rawStreak.longestStreak ?? rawStreak.longest_streak ?? 0) as number,
    lastSessionDate: (rawStreak.lastSessionDate ?? rawStreak.last_session_date ?? '') as string,
  } : undefined;
  const milestones = (retentionData?.milestones || {}) as Record<string, string | null>;
  const schedule = (retentionData?.schedule || []) as ScheduleEntry[];

  const dashboardContent = (
    <div className={`progress-dashboard ${isInline ? 'progress-dashboard-inline' : ''}`}>
      <div className="progress-header">
        <h2>Your Progress</h2>
        <div className="progress-header-actions">
          <button className="progress-schedule-btn" onClick={() => setShowScheduler(true)} title="Session Reminders">
            <Calendar size={18} />
          </button>
          {!isInline && <button className="progress-close" onClick={onClose}><X size={20} /></button>}
        </div>
      </div>

      {streak && <StreakCard streak={streak} />}

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
      {sessionList.length > 0 && (
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
        <MilestonesGrid milestones={milestones} />
      </div>

      <div className="progress-stats">
        <div className="progress-stat">
          <span className="progress-stat-value">{sessionList.length}</span>
          <span className="progress-stat-label">Total Sessions</span>
        </div>
        <div className="progress-stat">
          <span className="progress-stat-value">
            {Object.values(milestones).filter(v => v !== null).length}
          </span>
          <span className="progress-stat-label">Unlocked</span>
        </div>
      </div>

      {showScheduler && (
        <SessionScheduler
          schedule={schedule}
          onSave={async (newSchedule) => {
            try {
              await retentionApi.updateSchedule(newSchedule as unknown as Record<string, unknown>[]);
            } catch {
              // ignore
            }
          }}
          onClose={() => setShowScheduler(false)}
        />
      )}
    </div>
  );

  if (isInline) return dashboardContent;

  return (
    <div className="progress-overlay">
      {dashboardContent}
    </div>
  );
};
