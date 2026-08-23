'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@clerk/nextjs';
import { fetchOnboardingStatus } from '@/lib/api';
import SidebarNav from '@/components/dashboard/SidebarNav';
import { OnboardingTour } from '@/components/landing/OnboardingTour';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { isSignedIn, isLoaded } = useAuth();

  useEffect(() => {
    if (!isLoaded) return;
    if (!isSignedIn) {
      router.push('/sign-in');
      return;
    }
    fetchOnboardingStatus()
      .then((res) => {
        if (!res.onboarded && !window.location.pathname.includes('/onboarding')) {
          router.replace('/dashboard/onboarding');
        }
      })
      .catch(() => {
        // If API fails, don't block — let user through
      });
  }, [isSignedIn, isLoaded, router]);

  if (!isLoaded) {
    return (
      <div className="h-screen bg-[#0F0F14] flex items-center justify-center">
        <div className="font-mono text-xs text-white/30 uppercase tracking-widest">loading...</div>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-[#0F0F14] dark:bg-[#0F0F14] light:bg-gray-50">
      <SidebarNav />
      <main className="flex-1 flex flex-col overflow-hidden ml-[48px] transition-all duration-300">
        {children}
      </main>
      <OnboardingTour />
    </div>
  );
}
