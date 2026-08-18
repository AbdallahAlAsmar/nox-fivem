// Onboarding flow component
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Server, MessageSquare, FileDiff, Settings,
  Check, ChevronRight, ChevronLeft, Sparkles
} from 'lucide-react'

interface OnboardingProps {
  onComplete: () => void
}

const STEPS = [
  {
    id: 'welcome',
    icon: Sparkles,
    title: 'Welcome to NOX // FiveM',
    description: 'Your AI-powered assistant for managing FiveM servers. Chat with AI, propose changes, and apply them safely.',
  },
  {
    id: 'server',
    icon: Server,
    title: 'Add Your Server',
    description: 'Connect your FiveM server by adding its directory. The agent will scan and index your resources.',
    tip: 'Click "Add Server" in the dashboard to get started.',
  },
  {
    id: 'chat',
    icon: MessageSquare,
    title: 'Chat with AI',
    description: 'Ask questions about your server, request changes, or get help with errors. AI will propose changes for your review.',
    tip: 'Try: "Change my HUD color to blue"',
  },
  {
    id: 'changes',
    icon: FileDiff,
    title: 'Review & Apply',
    description: 'Every change is reviewed before applying. You can see the diff, approve it, and rollback if needed.',
    tip: 'Git checkpoints ensure you can always undo changes.',
  },
  {
    id: 'skills',
    icon: Settings,
    title: 'Use Specialized Skills',
    description: 'Select skills like Config Editor, Error Fixer, or Vehicle Handler to get specialized AI assistance.',
    tip: 'Skills are auto-selected based on your request.',
  },
]

export default function Onboarding({ onComplete }: OnboardingProps) {
  const [currentStep, setCurrentStep] = useState(0)
  const [isComplete, setIsComplete] = useState(false)

  const handleNext = () => {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep(prev => prev + 1)
    } else {
      setIsComplete(true)
      setTimeout(onComplete, 500)
    }
  }

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1)
    }
  }

  const current = STEPS[currentStep]
  const Icon = current.icon

  return (
    <div className="fixed inset-0 bg-[#0F0F14]/90 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-nox-surface border border-[rgba(255,255,255,0.08)] w-full max-w-lg p-8"
      >
        <AnimatePresence mode="wait">
          {!isComplete ? (
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              {/* Progress */}
              <div className="flex gap-1 mb-6">
                {STEPS.map((_, index) => (
                  <div
                    key={index}
                    className={`h-0.5 flex-1 ${
                      index <= currentStep ? 'bg-[#5E6AD2]' : 'bg-[rgba(255,255,255,0.1)]'
                    }`}
                  />
                ))}
              </div>

              {/* Icon */}
              <div className="w-14 h-14 bg-[rgba(94,106,210,0.1)] border border-[rgba(94,106,210,0.2)] flex items-center justify-center mb-6">
                <Icon className="w-7 h-7 text-[#5E6AD2]" />
              </div>

              {/* Content */}
              <h2 className="font-mono text-lg uppercase tracking-[0.15em] text-white mb-3">{current.title}</h2>
              <p className="font-sans text-sm text-[rgba(255,255,255,0.5)] mb-4 leading-[1.6]">{current.description}</p>

              {current.tip && (
                <div className="bg-[#0A0A0F] border border-[rgba(255,255,255,0.06)] p-3 mb-6">
                  <p className="font-mono text-xs text-[#5E6AD2]">{current.tip}</p>
                </div>
              )}

              {/* Navigation */}
              <div className="flex justify-between">
                <button
                  onClick={handlePrevious}
                  disabled={currentStep === 0}
                  className="flex items-center gap-1 px-4 py-2 font-mono text-xs uppercase tracking-wider text-[rgba(255,255,255,0.4)] hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors duration-100"
                >
                  <ChevronLeft className="w-4 h-4" />
                  Back
                </button>
                <button
                  onClick={handleNext}
                  className="font-mono text-xs uppercase tracking-[1.4px] px-5 py-2.5 bg-white text-[#0F0F14] font-medium hover:opacity-85 transition-opacity duration-100 flex items-center gap-1"
                >
                  {currentStep === STEPS.length - 1 ? 'Get Started' : 'Next'}
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center py-8"
            >
              <div className="w-16 h-16 bg-[rgba(94,106,210,0.1)] border border-[rgba(94,106,210,0.2)] flex items-center justify-center mx-auto mb-6">
                <Check className="w-8 h-8 text-[#5E6AD2]" />
              </div>
              <h2 className="font-mono text-lg uppercase tracking-[0.15em] text-white mb-3">You're All Set</h2>
              <p className="font-sans text-sm text-[rgba(255,255,255,0.5)] mb-6">
                Start by adding your first server in the dashboard.
              </p>
              <button
                onClick={onComplete}
                className="font-mono text-xs uppercase tracking-[1.4px] px-6 py-3 bg-white text-[#0F0F14] font-medium hover:opacity-85 transition-opacity duration-100"
              >
                Open Dashboard
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  )
}
