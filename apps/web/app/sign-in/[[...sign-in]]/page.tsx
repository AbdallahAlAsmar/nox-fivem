import { SignIn } from '@clerk/nextjs';

export default function SignInPage() {
  return (
    <div className="min-h-screen bg-[#0F0F14] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-0 font-mono mb-4">
            <img src="/noxes-avatar.svg" alt="NOXES" className="w-8 h-8 opacity-90" />
            <span className="text-white font-mono text-3xl font-medium tracking-[0.2em] ml-1">NOXES<span className="font-normal opacity-60">.</span></span>
          </div>
          <h1 className="font-mono text-sm uppercase tracking-[0.2em] text-[rgba(255,255,255,0.5)]">
            Sign in to NOXES.
          </h1>
        </div>

        <SignIn
          afterSignInUrl="/dashboard"
          afterSignUpUrl="/dashboard"
          appearance={{
            elements: {
              root: 'w-full',
              card: 'bg-[#16161E] border border-[rgba(255,255,255,0.08)] shadow-none',
              headerTitle: 'hidden',
              headerSubtitle: 'hidden',
              socialButtonsBlockButton:
                'border border-[rgba(255,255,255,0.08)] text-white hover:border-[rgba(255,255,255,0.18)] bg-transparent',
              socialButtonsBlockButtonIcon: 'text-[rgba(255,255,255,0.4)]',
              formFieldInput:
                'bg-transparent border border-[rgba(255,255,255,0.1)] text-white placeholder:text-[rgba(255,255,255,0.25)] rounded-none',
              formFieldLabel: 'text-[rgba(255,255,255,0.6)] font-mono text-xs uppercase tracking-wider',
              formButtonPrimary:
                'bg-white text-[#0F0F14] font-mono text-xs uppercase tracking-[1.4px] hover:opacity-85 rounded-none',
              footerActionLink: 'text-[#3DFFA2] hover:underline font-mono text-xs',
            },
          }}
        />
      </div>
    </div>
  );
}
