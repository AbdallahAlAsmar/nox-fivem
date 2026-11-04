import { SignIn } from '@clerk/nextjs';

export default function SignInPage() {
  return (
    <div className="min-h-screen bg-[#111315] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 font-mono mb-3">
            <img src="/brand/noxes-symbol.svg" alt="NOXES" className="w-7 h-7" />
            <span className="text-[#F4F1E9] font-display font-extrabold text-2xl tracking-[0.2em]">
              NOXES<span className="text-[#E83708]">.</span>
            </span>
          </div>
          <h1 className="font-sans text-xs uppercase tracking-[0.2em] text-[#68665F]">
            Sign in to NOXES · Worlds in Motion
          </h1>
        </div>

        <SignIn
          afterSignInUrl="/dashboard"
          afterSignUpUrl="/dashboard"
          appearance={{
            elements: {
              root: 'w-full',
              card: 'bg-[#202326] border border-[#414548] rounded-sm shadow-none',
              headerTitle: 'hidden',
              headerSubtitle: 'hidden',
              socialButtonsBlockButton:
                'border border-[#414548] text-[#F4F1E9] hover:bg-[#2D3237] bg-[#181A1D] rounded-sm font-sans',
              socialButtonsBlockButtonIcon: 'text-[#B6B0A4]',
              formFieldInput:
                'bg-[#181A1D] border border-[#414548] text-[#F4F1E9] placeholder:text-[#68665F] focus:border-[#E83708] rounded-sm font-sans',
              formFieldLabel: 'text-[#B6B0A4] font-sans text-xs font-medium uppercase tracking-wider',
              formButtonPrimary:
                'bg-[#E83708] hover:bg-[#d43106] text-[#111315] font-sans font-semibold text-xs uppercase tracking-wider rounded-sm',
              footerActionLink: 'text-[#E83708] hover:underline font-sans text-xs',
            },
          }}
        />
      </div>
    </div>
  );
}
