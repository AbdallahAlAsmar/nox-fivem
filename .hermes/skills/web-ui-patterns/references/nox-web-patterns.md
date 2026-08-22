# NOX FiveM Web UI Patterns Reference

Session-specific patterns from the NOX FiveM dashboard improvement session.

## Project Context

- **Path**: `D:/fivem-dev/apps/web`
- **Framework**: Next.js 14 + React 18 + Tailwind CSS
- **Build**: `pnpm run build --filter=@fivem-ai/web`
- **UI Library**: shadcn/ui (button, card, badge, input, sonner)
- **Animation**: framer-motion
- **State**: SWR, React hooks
- **Auth**: Clerk

## Skeleton Patterns by Page

### Dashboard Servers
```tsx
// Server card skeleton
<div className="bg-[#16161E] p-4 space-y-3">
  <div className="flex items-start justify-between">
    <div className="space-y-2 flex-1">
      <Skeleton className="h-4 w-32" />
      <Skeleton className="h-3 w-24" />
    </div>
    <Skeleton className="h-6 w-16" />
  </div>
  <div className="flex gap-2">
    <Skeleton className="h-5 w-16" />
    <Skeleton className="h-5 w-16" />
  </div>
  <div className="flex items-center justify-between pt-2">
    <div className="flex items-center gap-2">
      <Skeleton className="h-2 w-2 rounded-full" />
      <Skeleton className="h-3 w-20" />
    </div>
    <Skeleton className="h-3 w-16" />
  </div>
</div>
```

### Players List
```tsx
// Player row skeleton
<div className="bg-[#16161E] px-5 py-3.5 flex items-center gap-4">
  <Skeleton className="w-8 h-8 rounded-full flex-shrink-0" />
  <div className="flex-1 space-y-2">
    <Skeleton className="h-3 w-32" />
    <Skeleton className="h-2.5 w-24" />
  </div>
  <Skeleton className="h-7 w-16" />
</div>
```

### Resources Grid
```tsx
// Resource card skeleton (2-column grid)
<div className="bg-[#16161E] p-4 space-y-3">
  <div className="flex items-center gap-3">
    <Skeleton className="w-10 h-10 rounded-lg flex-shrink-0" />
    <div className="flex-1 space-y-2">
      <Skeleton className="h-3 w-32" />
      <Skeleton className="h-2.5 w-24" />
    </div>
  </div>
  <Skeleton className="w-full h-2.5" />
  <div className="flex gap-2">
    <Skeleton className="h-5 w-16" />
    <Skeleton className="h-5 w-16" />
  </div>
</div>
```

## Error Boundary Implementation

### Component (`components/ui/error-boundary.tsx`)
```tsx
import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';

export class ErrorBoundary extends Component<{
  children: ReactNode;
  fallback?: ReactNode;
}, { hasError: boolean; error: Error | null }> {
  state = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;
      return (
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="text-center space-y-4 max-w-md">
            <div className="w-12 h-12 bg-[rgba(239,68,68,0.1)] rounded-full flex items-center justify-center mx-auto">
              <AlertCircle className="w-6 h-6 text-[#ef4444]" />
            </div>
            <div>
              <h2 className="font-mono text-sm text-white/80 mb-1">Something went wrong</h2>
              <p className="font-sans text-xs text-white/40">
                {this.state.error?.message || 'An unexpected error occurred'}
              </p>
            </div>
            <button
              onClick={() => this.setState({ hasError: false, error: null })}
              className="flex items-center gap-2 px-4 py-2 bg-[#5E6AD2] text-white font-mono text-xs uppercase tracking-wider hover:bg-[#4f5bc0] transition-colors mx-auto"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Try Again
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
```

## Command Palette Implementation

### Keyboard Shortcuts Component (`components/layout/KeyboardShortcuts.tsx`)
```tsx
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
    <CommandPalette isOpen={isPaletteOpen} onClose={() => setIsPaletteOpen(false)} />
  );
}
```

### Add to layout.tsx
```tsx
import { KeyboardShortcuts } from '@/components/layout/KeyboardShortcuts';

// In body:
<body className="...">
  {children}
  <KeyboardShortcuts />
  <Toaster ... />
</body>
```

## Toast Configuration

### In `app/layout.tsx`
```tsx
<Toaster
  position="bottom-right"
  toastOptions={{
    style: {
      background: '#16161E',
      border: '1px solid rgba(94,106,210,0.3)',
      color: '#FFFFFF',
      borderRadius: '0px',
      fontFamily: "'JetBrains Mono', monospace",
    },
  }}
/>
```

### Usage Examples
```tsx
import { toast } from 'sonner';

// Success
toast.success('Server created');
toast.success('Resource installed');

// Error
toast.error('Failed to connect');
toast.error('Scan failed');
```

## Confirm Dialog Implementation

### Hook Pattern
```tsx
const { dialog, confirm, close } = useConfirmDialog();

// Trigger:
confirm({
  title: 'Delete Server',
  message: 'Are you sure you want to delete this server?',
  confirmText: 'Delete',
  cancelText: 'Cancel',
  variant: 'danger',
  onConfirm: async () => {
    await deleteServer(server.id);
    toast.success('Server deleted');
  },
});

// Render:
{dialog && (
  <ConfirmDialog
    isOpen={!!dialog}
    title={dialog.title}
    message={dialog.message}
    confirmText={dialog.confirmText}
    cancelText={dialog.cancelText}
    variant={dialog.variant}
    onConfirm={dialog.onConfirm}
    onCancel={close}
  />
)}
```

## Border Removal in Chat

### Before (white lines visible)
```tsx
className="border border-white/8"
className="border-b border-white/8"
```

### After (clean, no borders)
```tsx
className="bg-[#16161E]"
className="border-l-2 border-l-[#5E6AD2]"
```

Key changes:
- Remove all `border-white/*` from chat bubbles
- Use background color differences for separation
- Use left border accent for active/focused states
- Keep focus rings on inputs for accessibility

## Files Created/Modified

### New Components
- `components/ui/skeleton.tsx`
- `components/ui/skeletons.tsx`
- `components/ui/error-boundary.tsx`
- `components/ui/command-palette.tsx`
- `components/ui/confirm-dialog.tsx`
- `components/layout/KeyboardShortcuts.tsx`

### Modified Pages
- `app/layout.tsx` - Added KeyboardShortcuts, Toaster config
- `app/dashboard/page.tsx` - Skeletons, toasts, confirm dialog
- `app/dashboard/players/page.tsx` - Error boundary, toasts
- `app/dashboard/resources/page.tsx` - Error boundary, toasts
- `components/chat/ChatPanel.tsx` - Removed white borders

## Dependencies Added

```bash
pnpm add react-hotkeys-hook
```

## NOX Brand Colors

```
Primary: #5E6AD2
Success: #22c55e
Warning: #f59e0b
Error: #ef4444
Background: #0a0a0f
Card: #16161E
Text: #ffffff
Muted: rgba(255,255,255,0.4)
```