'use client';

import * as React from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowUp, Mic, Square } from 'lucide-react';
import { cn } from '@/lib/utils';

type SpeechResult = {
  isFinal: boolean;
  0: { transcript: string };
};

type SpeechRecognizer = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: { resultIndex: number; results: ArrayLike<SpeechResult> }) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
};

type SpeechWindow = Window & {
  SpeechRecognition?: new () => SpeechRecognizer;
  webkitSpeechRecognition?: new () => SpeechRecognizer;
};

export interface PromptInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: (value: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  maxLength?: number;
}

export const PromptInput = React.forwardRef<HTMLTextAreaElement, PromptInputProps>(
  function PromptInput(
    {
      value,
      onChange,
      onSubmit,
      placeholder = 'Describe the prompt you want to create…',
      className,
      disabled = false,
      maxLength = 12_000,
    },
    forwardedRef,
  ) {
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const recognitionRef = useRef<SpeechRecognizer | null>(null);
    const speechBaseRef = useRef('');
    const speechFinalRef = useRef('');
    const [expanded, setExpanded] = useState(false);
    const [listening, setListening] = useState(false);
    const [voiceError, setVoiceError] = useState('');
    const hasValue = value.trim().length > 0;

    React.useImperativeHandle(forwardedRef, () => textareaRef.current as HTMLTextAreaElement, []);

    const resizeTextarea = useCallback(() => {
      const textarea = textareaRef.current;
      if (!textarea) return;
      textarea.style.height = 'auto';
      textarea.style.height = `${Math.min(Math.max(textarea.scrollHeight, 48), 160)}px`;
    }, []);

    useEffect(() => {
      resizeTextarea();
      if (hasValue) setExpanded(true);
    }, [hasValue, resizeTextarea, value]);

    const stopVoiceInput = useCallback(() => {
      recognitionRef.current?.stop();
      recognitionRef.current = null;
      setListening(false);
    }, []);

    useEffect(() => () => recognitionRef.current?.stop(), []);

    const startVoiceInput = () => {
      const SpeechRecognition = (window as SpeechWindow).SpeechRecognition
        || (window as SpeechWindow).webkitSpeechRecognition;
      if (!SpeechRecognition) {
        setVoiceError('Voice input is not supported by this browser.');
        return;
      }

      setVoiceError('');
      setExpanded(true);
      speechBaseRef.current = value.trimEnd();
      speechFinalRef.current = '';

      try {
        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = navigator.language || 'en-US';
        recognition.onresult = (event) => {
          let interim = '';
          for (let index = event.resultIndex; index < event.results.length; index += 1) {
            const result = event.results[index];
            if (result.isFinal) speechFinalRef.current += result[0].transcript;
            else interim += result[0].transcript;
          }

          const transcript = [speechBaseRef.current, speechFinalRef.current, interim]
            .filter(Boolean)
            .join(' ')
            .trim();
          onChange(transcript.slice(0, maxLength));
        };
        recognition.onerror = (event) => {
          setListening(false);
          recognitionRef.current = null;
          if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
            setVoiceError('Allow microphone access in your browser to use voice input.');
          } else if (event.error !== 'aborted' && event.error !== 'no-speech') {
            setVoiceError('Voice input stopped. You can continue typing.');
          }
        };
        recognition.onend = () => {
          setListening(false);
          recognitionRef.current = null;
        };
        recognitionRef.current = recognition;
        recognition.start();
        setListening(true);
      } catch {
        recognitionRef.current = null;
        setListening(false);
        setVoiceError('Could not start voice input. You can continue typing.');
      }
    };

    const handleSubmit = () => {
      const message = value.trim();
      if (!message || disabled || listening) return;
      onSubmit(message);
      setExpanded(false);
    };

    const handleBlur = (event: React.FocusEvent<HTMLDivElement>) => {
      if (event.currentTarget.contains(event.relatedTarget as Node)) return;
      if (!hasValue && !listening) setExpanded(false);
    };

    return (
      <div className={cn('w-full', className)} onBlur={handleBlur}>
        <div
          className={cn(
            'relative border bg-[#202326] transition-[border-color,min-height] duration-200',
            expanded || hasValue ? 'min-h-[118px]' : 'min-h-[56px]',
            disabled ? 'border-[#414548] opacity-70' : 'border-[#68665F] focus-within:border-[#E83708]',
          )}
        >
          <label htmlFor="prompt-input" className="sr-only">Describe the prompt you want to create</label>
          <textarea
            id="prompt-input"
            ref={textareaRef}
            value={value}
            onChange={(event) => onChange(event.target.value.slice(0, maxLength))}
            onFocus={() => { setExpanded(true); setVoiceError(''); }}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
                event.preventDefault();
                handleSubmit();
              }
              if (event.key === 'Escape' && !hasValue && !listening) setExpanded(false);
            }}
            maxLength={maxLength}
            rows={1}
            disabled={disabled || listening}
            placeholder={placeholder}
            aria-describedby={expanded ? 'prompt-input-hint' : undefined}
            className="block max-h-40 min-h-12 w-full resize-none bg-transparent px-4 pb-3 pt-3 text-sm leading-6 text-[#F4F1E9] outline-none placeholder:text-[#B6B0A4] disabled:cursor-not-allowed"
          />

          {expanded && (
            <div className="flex min-h-12 items-center justify-between gap-3 px-3 pb-2">
              <p id="prompt-input-hint" className="min-w-0 text-xs leading-5 text-[#B6B0A4]">
                {listening ? 'Listening… Speak clearly, then stop when you’re done.' : 'Lyra · Automatic model routing · Enter to send'}
              </p>
              <div className="flex shrink-0 items-center gap-2">
                {(!hasValue || listening) && (
                  <button
                    type="button"
                    onClick={listening ? stopVoiceInput : startVoiceInput}
                    disabled={disabled}
                    aria-label={listening ? 'Stop voice input' : 'Start voice input'}
                    aria-pressed={listening}
                    className="flex h-10 w-10 items-center justify-center border border-[#414548] text-[#B6B0A4] hover:border-[#68665F] hover:text-[#F4F1E9] disabled:cursor-not-allowed"
                  >
                    {listening ? <Square size={14} /> : <Mic size={16} />}
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={!hasValue || disabled || listening}
                  aria-label="Send message"
                  className="brand-button-primary flex h-10 w-10 min-h-10 p-0 disabled:cursor-not-allowed disabled:border-[#414548] disabled:bg-[#414548] disabled:text-[#B6B0A4]"
                >
                  <ArrowUp size={18} />
                </button>
              </div>
            </div>
          )}

          {!expanded && (
            <button
              type="button"
              onClick={() => { setExpanded(true); textareaRef.current?.focus(); }}
              className="absolute inset-0 text-left outline-none focus-visible:ring-2 focus-visible:ring-[#E83708] focus-visible:ring-inset"
              aria-label="Open prompt input"
            />
          )}
        </div>
        <p role="status" aria-live="polite" className="mt-2 min-h-5 text-xs leading-5 text-[#E2A18D]">
          {voiceError}
        </p>
      </div>
    );
  },
);

PromptInput.displayName = 'PromptInput';
