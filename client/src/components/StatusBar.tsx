import { Wifi, WifiOff, Loader2 } from 'lucide-react';
import type { ConnectionStatus } from '../types';

interface StatusBarProps {
  status: ConnectionStatus;
}

export function StatusBar({ status }: StatusBarProps) {
  const statusConfig: Record<ConnectionStatus, { label: string; className: string; icon: React.ReactNode }> = {
    idle: { label: 'Not Connected', className: 'status-idle', icon: <WifiOff size={14} /> },
    connecting: { label: 'Connecting...', className: 'status-connecting', icon: <Loader2 size={14} className="spin" /> },
    connected: { label: 'Connected', className: 'status-connected', icon: <Wifi size={14} /> },
    disconnected: { label: 'Disconnected', className: 'status-disconnected', icon: <WifiOff size={14} /> },
    error: { label: 'Connection Error', className: 'status-error', icon: <WifiOff size={14} /> },
  };

  const config = statusConfig[status];

  return (
    <div className={`status-bar ${config.className}`}>
      {config.icon}
      <span>{config.label}</span>
    </div>
  );
}
