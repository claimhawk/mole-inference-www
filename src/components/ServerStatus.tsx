'use client';

import { useEffect, useState, useCallback } from 'react';
import type { ServerStatus as ServerStatusType } from '@/lib/types';
import { checkServerStatus } from '@/lib/api';

const STATUS_CONFIG: Record<ServerStatusType, { color: string; label: string; pulse: boolean }> = {
  unknown: { color: 'bg-gray-500', label: 'Unknown', pulse: false },
  sleeping: { color: 'bg-gray-500', label: 'Sleeping', pulse: false },
  waking: { color: 'bg-yellow-400', label: 'Waking', pulse: true },
  warm: { color: 'bg-green-400', label: 'Warm', pulse: false },
  active: { color: 'bg-blue-500', label: 'Active', pulse: true },
};

interface Props {
  onStatusChange?: (status: ServerStatusType) => void;
  isInferring?: boolean;
}

export function ServerStatus({ onStatusChange, isInferring = false }: Props) {
  const [status, setStatus] = useState<ServerStatusType>('unknown');
  const [lastChecked, setLastChecked] = useState<Date | null>(null);

  const updateStatus = useCallback(async () => {
    const newStatus = await checkServerStatus();
    setStatus(newStatus);
    setLastChecked(new Date());
    onStatusChange?.(newStatus);
  }, [onStatusChange]);

  useEffect(() => {
    // Initial check
    updateStatus();

    // Poll every 30 seconds when not actively inferring
    const interval = setInterval(() => {
      if (!isInferring) {
        updateStatus();
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [updateStatus, isInferring]);

  // Show 'active' status when inferring
  const displayStatus = isInferring ? 'active' : status;
  const config = STATUS_CONFIG[displayStatus];

  return (
    <div className="flex items-center gap-3 px-4 py-2 bg-[var(--card)] rounded-lg border border-[var(--card-border)]">
      <div className="flex items-center gap-2">
        <div className="relative">
          <div className={`w-2.5 h-2.5 rounded-full ${config.color}`} />
          {config.pulse && (
            <div className={`absolute inset-0 w-2.5 h-2.5 rounded-full ${config.color} animate-ping opacity-75`} />
          )}
        </div>
        <span className="text-sm font-medium">{config.label}</span>
      </div>
      {lastChecked && (
        <span className="text-xs text-[var(--muted)]">
          {lastChecked.toLocaleTimeString()}
        </span>
      )}
      <button
        onClick={updateStatus}
        disabled={isInferring}
        className="ml-auto text-xs text-[var(--muted)] hover:text-[var(--foreground)] disabled:opacity-50 transition-colors"
        title="Refresh status"
      >
        ↻
      </button>
    </div>
  );
}
