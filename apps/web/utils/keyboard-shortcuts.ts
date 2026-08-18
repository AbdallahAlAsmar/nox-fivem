// Keyboard shortcuts hook
import { useEffect, useCallback } from 'react';

interface ShortcutConfig {
  key: string;
  ctrl?: boolean;
  alt?: boolean;
  shift?: boolean;
  meta?: boolean;
  action: () => void;
  description?: string;
}

export function useKeyboardShortcuts(shortcuts: ShortcutConfig[]) {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      for (const shortcut of shortcuts) {
        if (
          event.key === shortcut.key &&
          (!!shortcut.ctrl === event.ctrlKey) &&
          (!!shortcut.alt === event.altKey) &&
          (!!shortcut.shift === event.shiftKey) &&
          (!!shortcut.meta === event.metaKey)
        ) {
          event.preventDefault();
          shortcut.action();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [shortcuts]);
}
