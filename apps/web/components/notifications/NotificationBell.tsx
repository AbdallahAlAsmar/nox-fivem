'use client';

import { useEffect } from 'react';
import { useNotifications } from './NotificationContext';
import { Bell, CheckCircle2, XCircle, Clock, AlertCircle, Info } from 'lucide-react';

export function NotificationBell() {
  const { unreadCount, notifications, toggleDropdown, isDropdownOpen, closeDropdown, markAsRead, dismissNotification, clearAll } = useNotifications();

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('[data-notification-dropdown]')) {
        closeDropdown();
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [closeDropdown]);

  const getIcon = (type: string) => {
    switch (type) {
      case 'cost_cap':
        return <AlertCircle className="w-4 h-4 text-[#f59e0b]" />;
      case 'failure':
        return <XCircle className="w-4 h-4 text-[#ef4444]" />;
      case 'pending_approval':
        return <Clock className="w-4 h-4 text-[#5E6AD2]" />;
      case 'success':
        return <CheckCircle2 className="w-4 h-4 text-[#22c55e]" />;
      default:
        return <Info className="w-4 h-4 text-[#3b82f6]" />;
    }
  };

  const getIconColor = (type: string) => {
    switch (type) {
      case 'cost_cap':
        return 'text-[#f59e0b]';
      case 'failure':
        return 'text-[#ef4444]';
      case 'pending_approval':
        return 'text-[#5E6AD2]';
      case 'success':
        return 'text-[#22c55e]';
      default:
        return 'text-[#3b82f6]';
    }
  };

  const formatTime = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - new Date(date).getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  };

  return (
    <div className="relative" data-notification-dropdown>
      <button
        onClick={toggleDropdown}
        className="relative flex items-center gap-2 px-3 py-2 font-mono text-[10px] uppercase tracking-wider text-[rgba(255,255,255,0.5)] hover:text-white hover:bg-[rgba(255,255,255,0.05)] transition-colors duration-100"
      >
        <Bell className="w-4 h-4" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 w-4 h-4 bg-[#ef4444] text-white text-[9px] font-mono flex items-center justify-center rounded-full">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isDropdownOpen && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-[#16161E] border border-[rgba(255,255,255,0.1)] rounded-lg shadow-2xl z-50 max-h-96 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between p-3 border-b border-[rgba(255,255,255,0.06)]">
            <span className="font-mono text-xs uppercase tracking-wider text-white">Notifications</span>
            {notifications.length > 0 && (
              <button
                onClick={clearAll}
                className="text-[10px] text-[rgba(255,255,255,0.4)] hover:text-white transition-colors"
              >
                Clear all
              </button>
            )}
          </div>

          {/* Notifications List */}
          <div className="overflow-y-auto max-h-72">
            {notifications.length === 0 ? (
              <div className="p-6 text-center">
                <Bell className="w-6 h-6 text-[rgba(255,255,255,0.2)] mx-auto mb-2" />
                <p className="font-sans text-xs text-[rgba(255,255,255,0.3)]">No notifications</p>
              </div>
            ) : (
              notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`p-3 border-b border-[rgba(255,255,255,0.04)] hover:bg-[rgba(255,255,255,0.02)] transition-colors ${
                    !notification.read ? 'bg-[rgba(94,106,210,0.05)]' : ''
                  }`}
                  onClick={() => markAsRead(notification.id)}
                >
                  <div className="flex items-start gap-2">
                    <div className={`mt-0.5 ${getIconColor(notification.type)}`}>
                      {getIcon(notification.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-mono text-xs text-white truncate">{notification.title}</p>
                      <p className="font-sans text-[11px] text-[rgba(255,255,255,0.5)] mt-0.5 line-clamp-2">
                        {notification.message}
                      </p>
                      <p className="font-mono text-[10px] text-[rgba(255,255,255,0.3)] mt-1">
                        {formatTime(notification.timestamp)}
                      </p>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        dismissNotification(notification.id);
                      }}
                      className="text-[rgba(255,255,255,0.3)] hover:text-white transition-colors"
                    >
                      <XCircle className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  {notification.action && (
                    <a
                      href={notification.action.href}
                      onClick={(e) => e.stopPropagation()}
                      className="block mt-2 text-[11px] font-mono text-[#5E6AD2] hover:text-[#7c8aff] transition-colors"
                    >
                      {notification.action.label} →
                    </a>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
