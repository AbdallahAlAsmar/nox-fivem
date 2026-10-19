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
  cmd: 'text-white',
  sys: 'text-white/40',
  file: 'text-white/70',
  'diff-add': 'text-[#5B72F2]',
  'diff-del': 'text-white/30 line-through decoration-white/30',
  ok: 'text-[#5B72F2]',
  wait: 'text-white/30',
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
    <div ref={ref} className="noxes-card !p-0 overflow-hidden">
      {/* Title bar */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-white/8 bg-[#101426]">
        <span className="w-2 h-2 bg-white/15" />
        <span className="w-2 h-2 bg-white/15" />
        <span className="w-2 h-2 bg-[#5B72F2]/60" />
        <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-white/30 ml-2">
          NOXES · workflow preview
        </span>
      </div>

      <div className="p-5 font-mono text-xs md:text-[13px] leading-[1.9] min-h-[380px]">
        {lines.map((line, idx) => (
          <div key={idx} className={`${KIND_STYLE[line.kind]} whitespace-pre-wrap break-all`}>
            {line.text}
            {idx === lines.length - 1 && (
              <span
                aria-hidden
                className="inline-block w-[7px] h-[13px] bg-[#5B72F2] align-middle ml-1"
                style={{ animation: 'cursor-blink 1.06s steps(1) infinite' }}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
