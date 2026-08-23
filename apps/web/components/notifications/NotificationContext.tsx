'use client';

import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import type { Notification, NotificationType } from './types';

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  isDropdownOpen: boolean;
  openDropdown: () => void;
  closeDropdown: () => void;
  toggleDropdown: () => void;
  addNotification: (notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  dismissNotification: (id: string) => void;
  clearAll: () => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  // Load notifications from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem('nox_notifications');
      if (saved) {
        const parsed = JSON.parse(saved);
        setNotifications(parsed.map((n: any) => ({
          ...n,
          timestamp: new Date(n.timestamp),
        })));
      }
    } catch {
      // Ignore parse errors
    }
  }, []);

  // Save to localStorage and update unread count
  useEffect(() => {
    try {
      localStorage.setItem('nox_notifications', JSON.stringify(notifications));
      setUnreadCount(notifications.filter((n) => !n.read).length);
    } catch {
      // Ignore storage errors
    }
  }, [notifications]);

  const addNotification = useCallback((notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) => {
    const newNotification: Notification = {
      ...notification,
      id: crypto.randomUUID(),
      timestamp: new Date(),
      read: false,
    };
    setNotifications((prev) => [newNotification, ...prev.slice(0, 49)]); // Keep last 50
  }, []);

  const markAsRead = useCallback((id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  }, []);

  const markAllAsRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }, []);

  const dismissNotification = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  const clearAll = useCallback(() => {
    setNotifications([]);
  }, []);

  const toggleDropdown = useCallback(() => {
    setIsDropdownOpen((prev) => !prev);
  }, []);

  const openDropdown = useCallback(() => {
    setIsDropdownOpen(true);
    // Mark all as read when opening
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }, []);

  const closeDropdown = useCallback(() => {
    setIsDropdownOpen(false);
  }, []);

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        isDropdownOpen,
        openDropdown,
        closeDropdown,
        toggleDropdown,
        addNotification,
        markAsRead,
        markAllAsRead,
        dismissNotification,
        clearAll,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within NotificationProvider');
  }
  return context;
}
