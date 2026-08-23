'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, CheckCircle2, Bot, User, FileCode } from 'lucide-react';

const demoSteps = [
  {
    user: 'Add a new vehicle spawn point near the hospital',
    ai: 'I found the spawns.lua file. Here is the change:',
    diff: [
      { text: '  local spawns = {}', type: 'neutral' },
      { text: '+ local hospitalSpawn = { x = -320.5, y = 5892.3, z = 11.2, heading = 180.0 }', type: 'add' },
      { text: '+ table.insert(spawns, hospitalSpawn)', type: 'add' },
      { text: '  return spawns', type: 'neutral' },
    ],
  },
  {
    user: 'Make the spawn rotate 45 degrees instead',
    ai: 'Updated the heading value:',
    diff: [
      { text: '  local hospitalSpawn = { x = -320.5, y = 5892.3, z = 11.2', type: 'neutral' },
      { text: '- heading = 180.0 }', type: 'remove' },
      { text: '+ heading = 45.0 }', type: 'add' },
      { text: '  table.insert(spawns, hospitalSpawn)', type: 'neutral' },
    ],
  },
  {
    user: null,
    ai: 'Change applied. Git checkpoint created.',
    diff: [],
    result: 'applied',
  },
];

export function InteractiveDemo() {
  const [step, setStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [typedText, setTypedText] = useState('');
  const [showDiff, setShowDiff] = useState(false);
  const [isApplied, setIsApplied] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!isPlaying) return;

    const current = demoSteps[step];
    if (!current) return;

    // Type out user message
    if (current.user) {
      setTypedText('');
      setShowDiff(false);
      let i = 0;
      const typeInterval = setInterval(() => {
        if (i < current.user!.length) {
          setTypedText(current.user!.slice(0, i + 1));
          i++;
        } else {
          clearInterval(typeInterval);
          // Show AI response after typing
          timeoutRef.current = setTimeout(() => {
            setShowDiff(true);
          }, 600);
        }
      }, 20);
      return () => {
        clearInterval(typeInterval);
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
      };
    }

    // AI response with diff
    if (current.ai) {
      setTypedText('');
      const aiInterval = setInterval(() => {
        setTypedText((prev) => {
          if (prev.length < current.ai!.length) {
            return current.ai!.slice(0, prev.length + 1);
          }
          clearInterval(aiInterval);
          if (step < demoSteps.length - 1) {
            timeoutRef.current = setTimeout(() => setStep(step + 1), 1500);
          } else {
            setIsApplied(true);
          }
          return prev;
        });
      }, 25);
      return () => clearInterval(aiInterval);
    }
  }, [isPlaying, step]);

  const startDemo = () => {
    setIsPlaying(true);
    setStep(0);
    setTypedText('');
    setShowDiff(false);
    setIsApplied(false);
  };

  const resetDemo = () => {
    setIsPlaying(false);
    setStep(0);
    setTypedText('');
    setShowDiff(false);
    setIsApplied(false);
  };

  const currentStep = demoSteps[step];
  const isLastStep = step === demoSteps.length - 1;

  return (
    <div className="w-full max-w-3xl mx-auto">
      {/* Terminal window */}
      <div className="bg-[#0A0A0F] border border-[rgba(255,255,255,0.08)] rounded-xl overflow-hidden shadow-2xl">
        {/* Top bar */}
        <div className="flex items-center justify-between px-4 py-3 bg-[#16161E] border-b border-[rgba(255,255,255,0.08)]">
          <div className="flex items-center gap-2">
            <div className="flex gap-1.5">
              <div className="w-2.5 h-2.5 bg-[rgba(255,255,255,0.15)] rounded-full" />
              <div className="w-2.5 h-2.5 bg-[rgba(255,255,255,0.15)] rounded-full" />
              <div className="w-2.5 h-2.5 bg-[rgba(255,255,255,0.15)] rounded-full" />
            </div>
            <span className="font-mono text-[11px] text-[rgba(255,255,255,0.4)] ml-2 uppercase tracking-wider">
              NOX — Interactive Demo
            </span>
          </div>
          <button
            onClick={isPlaying ? resetDemo : startDemo}
            className="font-mono text-[10px] uppercase tracking-wider px-3 py-1.5 bg-[rgba(94,106,210,0.15)] border border-[rgba(94,106,210,0.3)] text-[#5E6AD2] hover:bg-[rgba(94,106,210,0.25)] transition-colors rounded"
          >
            {isPlaying ? 'Reset' : 'Play Demo'}
          </button>
        </div>

        {/* Chat area */}
        <div className="p-6 min-h-[320px] max-h-[400px] overflow-y-auto space-y-4">
          {!isPlaying && !isApplied && (
            <div className="flex flex-col items-center justify-center h-[240px] text-center">
              <Bot className="w-12 h-12 text-[rgba(94,106,210,0.4)] mb-4" />
              <p className="font-mono text-sm text-[rgba(255,255,255,0.5)] mb-2">
                Watch NOX process a real request
              </p>
              <p className="font-sans text-xs text-[rgba(255,255,255,0.3)] max-w-xs">
                This demo simulates how NOX reads, modifies, and applies changes to your FiveM server files.
              </p>
              <button
                onClick={startDemo}
                className="mt-6 font-mono text-xs uppercase tracking-wider px-5 py-2.5 bg-white text-[#0F0F14] font-medium hover:opacity-85 transition-opacity inline-flex items-center gap-2"
              >
                Start Demo
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          <AnimatePresence>
            {isPlaying && (
              <>
                {/* User message */}
                {currentStep?.user && (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    className="flex items-start gap-3"
                  >
                    <div className="w-7 h-7 bg-[rgba(255,255,255,0.1)] border border-[rgba(255,255,255,0.2)] rounded flex items-center justify-center flex-shrink-0">
                      <User className="w-3.5 h-3.5 text-[rgba(255,255,255,0.6)]" />
                    </div>
                    <div className="bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.08)] px-3 py-2.5 rounded-r-lg rounded-bl-lg min-w-[200px]">
                      <p className="font-sans text-sm text-[rgba(255,255,255,0.8)] leading-[1.5]">
                        {typedText}
                        <span className="inline-block w-0.5 h-4 bg-[#5E6AD2] ml-0.5 animate-pulse" />
                      </p>
                    </div>
                  </motion.div>
                )}

                {/* AI response */}
                {currentStep?.ai && showDiff && (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    className="flex items-start gap-3"
                  >
                    <div className="w-7 h-7 bg-[rgba(94,106,210,0.2)] border border-[rgba(94,106,210,0.4)] rounded flex items-center justify-center flex-shrink-0">
                      <Bot className="w-3.5 h-3.5 text-[#5E6AD2]" />
                    </div>
                    <div className="flex-1 space-y-3">
                      <div className="bg-[rgba(94,106,210,0.08)] border border-[rgba(94,106,210,0.2)] px-3 py-2.5 rounded-r-lg rounded-bl-lg">
                        <p className="font-sans text-sm text-[rgba(255,255,255,0.7)] leading-[1.5]">
                          {typedText}
                        </p>
                      </div>

                      {/* Diff */}
                      {currentStep.diff.length > 0 && (
                        <motion.div
                          initial={{ opacity: 0, scale: 0.98 }}
                          animate={{ opacity: 1, scale: 1 }}
                          className="bg-[#0F0F14] border border-[rgba(255,255,255,0.08)] rounded-lg overflow-hidden"
                        >
                          <div className="flex items-center justify-between px-3 py-2 bg-[#16161E] border-b border-[rgba(255,255,255,0.08)]">
                            <div className="flex items-center gap-2">
                              <FileCode className="w-3.5 h-3.5 text-[rgba(255,255,255,0.4)]" />
                              <span className="font-mono text-[11px] text-[rgba(255,255,255,0.5)]">spawns.lua</span>
                            </div>
                            <span className="font-mono text-[10px] text-[rgba(255,255,255,0.3)]">
                              {currentStep.diff.filter((d) => d.type === 'add').length} additions
                            </span>
                          </div>
                          <div className="p-3 font-mono text-[11px] space-y-0.5">
                            {currentStep.diff.map((line, i) => (
                              <div
                                key={i}
                                className={`px-2 py-0.5 rounded ${
                                  line.type === 'add'
                                    ? 'bg-[rgba(34,197,94,0.1)] text-[#22c55e]'
                                    : line.type === 'remove'
                                    ? 'bg-[rgba(239,68,68,0.1)] text-[#ef4444]'
                                    : 'text-[rgba(255,255,255,0.4)]'
                                }`}
                              >
                                <span className="mr-2">{line.text[0]}</span>
                                {line.text.slice(1)}
                              </div>
                            ))}
                          </div>
                        </motion.div>
                      )}
                    </div>
                  </motion.div>
                )}

                {/* Applied result */}
                {isApplied && (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center gap-3 p-4 bg-[rgba(34,197,94,0.08)] border border-[rgba(34,197,94,0.2)] rounded-lg"
                  >
                    <CheckCircle2 className="w-5 h-5 text-[#22c55e] flex-shrink-0" />
                    <div>
                      <p className="font-mono text-sm text-[#22c55e] font-medium">Change applied successfully</p>
                      <p className="font-sans text-xs text-[rgba(255,255,255,0.5)] mt-0.5">
                        Git checkpoint created • spawns.lua updated
                      </p>
                    </div>
                  </motion.div>
                )}
              </>
            )}
          </AnimatePresence>
        </div>

        {/* Progress indicator */}
        {isPlaying && (
          <div className="px-6 py-3 bg-[#16161E] border-t border-[rgba(255,255,255,0.08)]">
            <div className="flex items-center gap-2">
              {demoSteps.map((_, i) => (
                <div
                  key={i}
                  className={`h-1 flex-1 rounded-full transition-colors duration-200 ${
                    i <= step ? 'bg-[#5E6AD2]' : 'bg-[rgba(255,255,255,0.1)]'
                  }`}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Caption */}
      <p className="font-mono text-xs text-[rgba(255,255,255,0.3)] text-center mt-4 uppercase tracking-wider">
        Try it yourself — type a request and see NOX in action
      </p>
    </div>
  );
}
