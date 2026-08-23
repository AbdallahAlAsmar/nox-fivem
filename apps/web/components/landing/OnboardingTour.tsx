'use client';

import { useState, useEffect } from 'react';
import { Joyride, Step } from 'react-joyride';
import { usePathname } from 'next/navigation';

interface CallbackData {
  action: string;
  type: string;
  index: number;
  size: number;
  steppedIndex: number;
  skippedIndex: number;
  lastStep: boolean;
}

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
      content: 'Welcome to NOX! This is your command center. Let us show you around.',
      placement: 'bottom',
      disableBeacon: true,
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

  const handleCallback = (data: CallbackData) => {
    const { action, type } = data;
    if (type === 'tour:finished' || action === 'close') {
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
      showProgress
      showSkipButton
      hideCloseButton
      styles={{
        options: {
          arrowColor: '#16161E',
          backgroundColor: '#16161E',
          beaconSize: 36,
          overlayColor: 'rgba(0, 0, 0, 0.5)',
          primaryColor: '#5E6AD2',
          textColor: 'rgba(255, 255, 255, 0.9)',
          width: 380,
          zIndex: 1000,
        },
      }}
      locale={{
        back: 'Back',
        close: 'Close',
        last: 'Finish',
        next: 'Next',
        skip: 'Skip',
      }}
      callback={handleCallback}
    />
  );
}
