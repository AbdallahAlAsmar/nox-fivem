'use client';

import { useState, useEffect } from 'react';
import { Joyride, Step } from 'react-joyride';
import { usePathname } from 'next/navigation';

export function OnboardingTour() {
  const [run, setRun] = useState(false);
  const [finished, setFinished] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    const lastRun = localStorage.getItem('nox-tour-last-run');
    const now = Date.now();
    if (!lastRun || now - parseInt(lastRun) > 7 * 24 * 60 * 60 * 1000) {
      setRun(true);
    }
  }, []);

  const steps: Step[] = [
    {
      target: '[data-tour="dashboard-header"]',
      content: 'Welcome to NOXES! This is your command center. Let us show you around.',
      placement: 'bottom',
    },
    {
      target: '[data-tour="server-cards"]',
      content: 'Your connected FiveM servers appear here. Each card shows live player count and status.',
      placement: 'bottom',
    },
    {
      target: '[data-tour="nav-chat"]',
      content: 'Chat with the AI to request changes, create scripts, or debug issues. Everything is tracked in threads.',
      placement: 'right',
    },
    {
      target: '[data-tour="nav-changes"]',
      content: 'Review proposed changes, compare diffs, and approve or reject with a single click.',
      placement: 'right',
    },
    {
      target: '[data-tour="nav-resources"]',
      content: 'Install and manage FiveM resources. Track installation progress and roll back if needed.',
      placement: 'right',
    },
    {
      target: '[data-tour="nav-docs"]',
      content: 'Access documentation, troubleshooting guides, and API references whenever you need them.',
      placement: 'right',
    },
    {
      target: '[data-tour="user-menu"]',
      content: 'Manage your account, API keys, and billing settings here.',
      placement: 'left',
    },
  ];

  const handleEvent = (data: { type: string; action: string; index: number }) => {
    if (data.type === 'tour:finished' || data.action === 'close') {
      setFinished(true);
      localStorage.setItem('nox-tour-last-run', Date.now().toString());
    }
  };

  if (pathname === '/' || !pathname.startsWith('/dashboard')) return null;
  if (finished) return null;

  return (
    <Joyride
      steps={steps}
      run={run}
      continuous
      onEvent={handleEvent}
      styles={{
        beacon: {
          background: '#3DFFA2',
          border: '2px solid #16161E',
          borderRadius: '50%',
          height: 36,
          width: 36,
        },
        overlay: {
          background: 'rgba(0, 0, 0, 0.5)',
        },
        tooltip: {
          background: '#16161E',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: 8,
          color: 'rgba(255, 255, 255, 0.9)',
          maxWidth: 380,
          padding: 16,
        },
        tooltipContainer: {
          textAlign: 'left',
        },
        buttonPrimary: {
          background: '#3DFFA2',
          borderRadius: 4,
          color: '#fff',
          fontSize: 13,
          fontWeight: 500,
          padding: '6px 12px',
        },
        buttonBack: {
          color: 'rgba(255, 255, 255, 0.6)',
          fontSize: 13,
          marginRight: 8,
        },
        buttonSkip: {
          color: 'rgba(255, 255, 255, 0.4)',
          fontSize: 13,
        },
      }}
      locale={{
        back: 'Back',
        close: 'Close',
        last: 'Finish',
        next: 'Next',
        skip: 'Skip',
      }}
    />
  );
}
