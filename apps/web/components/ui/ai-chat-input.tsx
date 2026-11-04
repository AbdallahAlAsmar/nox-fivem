'use client';

import * as React from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowUp, LoaderCircle, Mic, Square } from 'lucide-react';
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
  isSubmitting?: boolean;
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
      isSubmitting = false,
      maxLength = 12_000,
    },
    forwardedRef,
  ) {
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const recognitionRef = useRef<SpeechRecognizer | null>(null);
    const speechBaseRef = useRef('');
    const speechFinalRef = useRef('');
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
    };

    return (
      <div className={cn('w-full', className)}>
        <div
          className={cn(
            'relative overflow-hidden rounded-xl border bg-[#202326] transition-colors duration-200',
            disabled ? 'border-[#414548] opacity-70' : 'border-[#414548] focus-within:border-[#B6B0A4] focus-within:outline focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-[#B6B0A4]',
          )}
        >
          <div className="flex items-center justify-between gap-3 px-4 pt-3 sm:px-5">
            <label htmlFor="prompt-input" className="text-sm font-medium text-[#F4F1E9]">Message Lyra</label>
            {listening && <span className="flex items-center gap-2 text-xs text-[#E2A18D]"><span className="h-2 w-2 animate-pulse rounded-full bg-[#E83708]" />Listening</span>}
          </div>
          <textarea
            id="prompt-input"
            ref={textareaRef}
            value={value}
            onChange={(event) => onChange(event.target.value.slice(0, maxLength))}
            onFocus={() => setVoiceError('')}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
                event.preventDefault();
                handleSubmit();
              }
            }}
            maxLength={maxLength}
            rows={2}
            disabled={disabled || listening}
            placeholder={placeholder}
            aria-describedby={voiceError ? 'prompt-input-error' : 'prompt-input-hint'}
            className="prompt-studio-textarea block max-h-40 min-h-[112px] w-full resize-none bg-transparent px-4 pb-14 pt-2 text-[16px] leading-7 text-[#F4F1E9] outline-none placeholder:text-[#68665F] disabled:cursor-not-allowed sm:px-5"
          />

          <div className="absolute inset-x-3 bottom-3 flex items-center justify-between gap-3 sm:inset-x-4">
            <p id="prompt-input-hint" className="min-w-0 text-xs leading-5 text-[#B6B0A4]">
              {listening ? 'Listening… select stop when you’re done.' : 'Enter to send · Shift + Enter for a new line'}
            </p>
            <button
              type="button"
              onClick={listening ? stopVoiceInput : hasValue ? handleSubmit : startVoiceInput}
              disabled={disabled}
              aria-label={isSubmitting ? 'Sending message' : listening ? 'Stop voice input' : hasValue ? 'Send message' : 'Start voice input'}
              aria-pressed={listening || undefined}
              className="brand-button-primary flex h-11 min-h-11 min-w-11 cursor-pointer rounded-lg px-3 shadow-none transition-transform active:scale-95 disabled:cursor-not-allowed disabled:border-[#414548] disabled:bg-[#414548] disabled:text-[#B6B0A4] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#B6B0A4]"
            >
              {isSubmitting ? <LoaderCircle size={17} className="animate-spin" /> : listening ? <Square size={14} /> : hasValue ? <ArrowUp size={18} /> : <Mic size={17} />}
              <span className="hidden text-sm sm:inline">{isSubmitting ? 'Working' : listening ? 'Stop' : hasValue ? 'Send' : 'Voice'}</span>
            </button>
          </div>
        </div>
        <p id="prompt-input-error" role="status" aria-live="polite" className="mt-2 min-h-5 text-xs leading-5 text-[#E2A18D]">
          {voiceError}
        </p>
      </div>
    );
  },
);

PromptInput.displayName = 'PromptInput';
