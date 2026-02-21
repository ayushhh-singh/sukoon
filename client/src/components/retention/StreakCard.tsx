import React from 'react';
import type { StreakData } from '../../types/retention';

interface StreakCardProps {
  streak: StreakData;
}

export const StreakCard: React.FC<StreakCardProps> = ({ streak }) => {
  return (
    <div className="streak-card">
      <div className="streak-fire">
        <span className="streak-emoji">{streak.currentStreak > 0 ? '🔥' : '💤'}</span>
        <span className="streak-count">{streak.currentStreak}</span>
      </div>
      <p className="streak-label">
        {streak.currentStreak === 0
          ? 'Start a session to begin your streak!'
          : streak.currentStreak === 1
            ? 'day streak'
            : 'day streak'}
      </p>
      <p className="streak-best">Best: {streak.longestStreak} days</p>
    </div>
  );
};
