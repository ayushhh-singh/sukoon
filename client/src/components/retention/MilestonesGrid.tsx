import React from 'react';
import { Sparkles, Flame, Trophy, Star, Crown, Target, Award, Medal, ClipboardCheck, Sun, PenLine, Lock } from 'lucide-react';
import { MILESTONE_DEFINITIONS } from '../../data/milestones';

const ICON_MAP: Record<string, React.ComponentType<{ size?: number }>> = {
  Sparkles, Flame, Trophy, Star, Crown, Target, Award, Medal, ClipboardCheck, Sun, PenLine,
};

interface MilestonesGridProps {
  milestones: Record<string, string | null>;
}

export const MilestonesGrid: React.FC<MilestonesGridProps> = ({ milestones }) => {
  return (
    <div className="milestones-grid">
      {MILESTONE_DEFINITIONS.map(def => {
        const unlocked = !!milestones[def.id];
        const Icon = ICON_MAP[def.icon] || Sparkles;

        return (
          <div key={def.id} className={`milestone-badge ${unlocked ? 'unlocked' : 'locked'}`}>
            <div className="milestone-icon">
              {unlocked ? <Icon size={24} /> : <Lock size={18} />}
            </div>
            <p className="milestone-title">{def.title}</p>
            <p className="milestone-desc">{def.description}</p>
          </div>
        );
      })}
    </div>
  );
};
