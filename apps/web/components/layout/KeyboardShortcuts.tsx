'use client';

import { useEffect, useState } from 'react';
import { useHotkeys } from 'react-hotkeys-hook';
import CommandPalette from '@/components/ui/command-palette';

export function KeyboardShortcuts() {
  const [isPaletteOpen, setIsPaletteOpen] = useState(false);

  useHotkeys('meta+k,ctrl+k', (e) => {
    e.preventDefault();
    setIsPaletteOpen((prev) => !prev);
  });

  useHotkeys('/', (e) => {
    e.preventDefault();
    setIsPaletteOpen(true);
  });

  useHotkeys('esc', () => {
    setIsPaletteOpen(false);
  });

  return (
    <>
      <CommandPalette isOpen={isPaletteOpen} onClose={() => setIsPaletteOpen(false)} />
    </>
  );
}