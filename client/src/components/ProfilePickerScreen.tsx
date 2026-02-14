import { useState } from 'react';
import { UserPlus, Trash2 } from 'lucide-react';
import type { UserProfile } from '../types/session';
import { StorageService } from '../services/storage';

interface ProfilePickerScreenProps {
  onSelectProfile: (profile: UserProfile) => void;
  onNewUser: () => void;
}

// Warm gradient pairs — one per profile slot, cycling
const AVATAR_GRADIENTS = [
  ['#f59e0b', '#ef4444'],
  ['#8b5cf6', '#ec4899'],
  ['#06b6d4', '#6366f1'],
  ['#10b981', '#06b6d4'],
  ['#f97316', '#f59e0b'],
  ['#a78bfa', '#60a5fa'],
];

function timeAgo(isoDate: string): string {
  const diff = Date.now() - new Date(isoDate).getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days} days ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  return `${Math.floor(days / 30)}mo ago`;
}

export function ProfilePickerScreen({ onSelectProfile, onNewUser }: ProfilePickerScreenProps) {
  const [profiles, setProfiles] = useState<UserProfile[]>(() => StorageService.getProfiles());

  function handleDelete(e: React.MouseEvent, profileId: string) {
    e.stopPropagation();
    StorageService.deleteProfile(profileId);
    setProfiles(StorageService.getProfiles());
  }

  function getLastSession(profileId: string): string | null {
    const sessions = StorageService.getSessionsForUser(profileId);
    if (sessions.length === 0) return null;
    return sessions[sessions.length - 1].date;
  }

  return (
    <div className="pp-screen">
      {/* Decorative blobs */}
      <div className="pp-blob pp-blob-1" />
      <div className="pp-blob pp-blob-2" />

      <div className="pp-card">
        <div className="pp-header">
          <div className="pp-logo">
            <span>✦</span>
          </div>
          <h1 className="pp-title">Sukoon</h1>
          <p className="pp-subtitle">Who's using Sukoon today?</p>
        </div>

        <div className="pp-list">
          {profiles.map((profile, i) => {
            const lastSession = getLastSession(profile.id);
            const [from, to] = AVATAR_GRADIENTS[i % AVATAR_GRADIENTS.length];
            const initials = profile.displayName.slice(0, 2).toUpperCase();
            return (
              <button
                key={profile.id}
                className="pp-profile"
                onClick={() => onSelectProfile(profile)}
              >
                <div
                  className="pp-avatar"
                  style={{ background: `linear-gradient(135deg, ${from}, ${to})` }}
                >
                  {initials}
                </div>
                <div className="pp-info">
                  <span className="pp-name">{profile.displayName}</span>
                  <span className="pp-meta">
                    {lastSession
                      ? `Last session · ${timeAgo(lastSession)}`
                      : 'New here · Welcome!'}
                  </span>
                </div>
                <button
                  className="pp-delete"
                  onClick={e => handleDelete(e, profile.id)}
                  title="Remove profile"
                >
                  <Trash2 size={13} />
                </button>
              </button>
            );
          })}

          <button className="pp-new" onClick={onNewUser}>
            <div className="pp-new-icon">
              <UserPlus size={22} />
            </div>
            <div className="pp-info">
              <span className="pp-name">New User</span>
              <span className="pp-meta">Set up your profile</span>
            </div>
          </button>
        </div>

        <p className="pp-footer">Your data stays on this device</p>
      </div>
    </div>
  );
}
