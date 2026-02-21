import React from 'react';
import { Users, MessageSquare, TrendingUp, Activity } from 'lucide-react';
import type { TherapistAggregateStats } from '../../types/therapist';

interface AggregateStatsProps {
  stats: TherapistAggregateStats;
}

export const AggregateStats: React.FC<AggregateStatsProps> = ({ stats }) => {
  const moodSign = stats.averageMoodDelta >= 0 ? '+' : '';

  return (
    <div className="aggregate-stats">
      <div className="stat-card">
        <Users size={20} />
        <span className="stat-value">{stats.totalProfiles}</span>
        <span className="stat-label">Patients</span>
      </div>
      <div className="stat-card">
        <MessageSquare size={20} />
        <span className="stat-value">{stats.totalSessions}</span>
        <span className="stat-label">Total Sessions</span>
      </div>
      <div className="stat-card">
        <TrendingUp size={20} />
        <span className="stat-value">{moodSign}{stats.averageMoodDelta.toFixed(1)}</span>
        <span className="stat-label">Avg Mood Change</span>
      </div>
      <div className="stat-card">
        <Activity size={20} />
        <span className="stat-value">{stats.sessionsThisWeek}</span>
        <span className="stat-label">This Week</span>
      </div>
    </div>
  );
};
