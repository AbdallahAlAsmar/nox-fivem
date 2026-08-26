/**
 * Notification Types
 */

export type NotificationType = 'cost_cap' | 'failure' | 'pending_approval' | 'info' | 'success';

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
  action?: {
    label: string;
    href: string;
  };
  related?: {
    type: 'server' | 'change' | 'thread';
    id: string;
    name?: string;
  };
}

export interface NotificationState {
  notifications: Notification[];
  unreadCount: number;
  isDropdownOpen: boolean;
}

export const NOTIFICATION_ICONS = {
  cost_cap: {
    icon: '💰',
    color: 'text-[#f59e0b]',
    bg: 'bg-[rgba(245,158,11,0.1)]',
  },
  failure: {
    icon: '❌',
    color: 'text-[#ef4444]',
    bg: 'bg-[rgba(239,68,68,0.1)]',
  },
  pending_approval: {
    icon: '⏳',
    color: 'text-[#3DFFA2]',
    bg: 'bg-[rgba(61,255,162,0.1)]',
  },
  info: {
    icon: 'ℹ️',
    color: 'text-[#3b82f6]',
    bg: 'bg-[rgba(59,130,246,0.1)]',
  },
  success: {
    icon: '✅',
    color: 'text-[#22c55e]',
    bg: 'bg-[rgba(34,197,94,0.1)]',
  },
} as const;

export const NOTIFICATION_COLORS = {
  cost_cap: '#f59e0b',
  failure: '#ef4444',
  pending_approval: '#3DFFA2',
  info: '#3b82f6',
  success: '#22c55e',
} as const;
