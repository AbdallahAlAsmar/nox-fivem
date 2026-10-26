'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * Terminal-style product demo: a scripted loop showing the core flow —
 * request → file read → diff → approval → checkpointed apply.
 * Pure text + CSS. No fake success states; this is a marketing rendering
 * of the real pipeline (stage → approve → checkpoint → apply).
 */

type Line = { kind: 'cmd' | 'sys' | 'file' | 'diff-add' | 'diff-del' | 'ok' | 'wait'; text: string };

const SCRIPT: Line[] = [
  { kind: 'cmd', text: '$ help me adjust my vehicle shop' },
  { kind: 'wait', text: 'scanning connected server resources…' },
  { kind: 'sys', text: '→ mapping relevant files and manifests' },
  { kind: 'file', text: 'READ resources/[shops]/fxmanifest.lua' },
  { kind: 'sys', text: 'proposed change · ready for review' },
  { kind: 'diff-del', text: '- local discount = 0' },
  { kind: 'diff-add', text: '+ local discount = weekendEnabled and 0.2 or 0' },
  { kind: 'diff-add', text: '+ -- staged for your review' },
  { kind: 'wait', text: 'change staged · no files touched' },
  { kind: 'wait', text: 'awaiting your approval…' },
  { kind: 'ok', text: 'APPROVED · git checkpoint created' },
  { kind: 'ok', text: 'change applied · rollback available' },
];

const KIND_STYLE: Record<Line['kind'], string> = {
  cmd: 'text-[#F4F1E9]',
  sys: 'text-[#68665F]',
  file: 'text-[#B6B0A4]',
  'diff-add': 'text-[#E83708]',
  'diff-del': 'text-[#68665F] line-through',
  ok: 'text-[#E83708]',
  wait: 'text-[#68665F]',
};

export default function TerminalDemo() {
  const [lines, setLines] = useState<Line[]>([]);
  const [started, setStarted] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === 'undefined') {
      setStarted(true);
      return;
    }
    const obs = new IntersectionObserver(
      ([e]) => e.isIntersecting && setStarted(true),
      { threshold: 0.35 },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    if (!started) return;
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) {
      setLines(SCRIPT);
      return;
    }
    let i = 4;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;

    const step = () => {
      if (cancelled) return;
      if (i >= SCRIPT.length) {
        // hold the completed transcript, then restart the loop
        timer = setTimeout(() => {
          setLines(SCRIPT.slice(0, 4));
          i = 4;
          step();
        }, 6000);
        return;
      }
      const line = SCRIPT[i];
      setLines((prev) => [...prev, line]);
      i += 1;
      const isCmd = line.kind === 'cmd';
      timer = setTimeout(step, isCmd ? 900 : 480);
    };
    setLines(SCRIPT.slice(0, 4));
    step();

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [started]);

  return (
    <div ref={ref} className="overflow-hidden rounded-sm border border-[#414548] bg-[#181A1D] shadow-2xl">
      {/* Title bar */}
      <div className="flex items-center gap-2 border-b border-[#414548] bg-[#111315] px-4 py-3">
        <span className="h-2 w-2 rounded-sm bg-[#414548]" />
        <span className="h-2 w-2 rounded-sm bg-[#414548]" />
        <span className="h-2 w-2 rounded-sm bg-[#E83708]" />
        <span className="ml-2 font-mono text-[10px] uppercase tracking-[0.2em] text-[#68665F]">
          NOXES · Pipeline Verification
        </span>
      </div>

      <div className="min-h-[380px] p-5 font-mono text-xs md:text-[13px] leading-[1.9] bg-[#181A1D]">
        {lines.map((line, idx) => (
          <div key={idx} className={`${KIND_STYLE[line.kind]} whitespace-pre-wrap break-all`}>
            {line.text}
            {idx === lines.length - 1 && (
              <span
                aria-hidden
                className="ml-1 inline-block h-[13px] w-[7px] bg-[#E83708] align-middle"
                style={{ animation: 'cursor-blink 1.06s steps(1) infinite' }}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
