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
  { kind: 'cmd', text: '$ make the vehicle shop give 20% cash back on weekends' },
  { kind: 'wait', text: 'reading resources…' },
  { kind: 'sys', text: '→ scan complete · 143 resources indexed' },
  { kind: 'file', text: 'READ resources/[shops]/qb-vehicleshop/client/main.lua' },
  { kind: 'sys', text: 'proposed change — 1 file (+6 −1)' },
  { kind: 'diff-del', text: '- local discount = 0' },
  { kind: 'diff-add', text: '+ local function weekendBonus()' },
  { kind: 'diff-add', text: '+   return os.date("%A"):match("Saturday|Sunday") and 0.2 or 0' },
  { kind: 'diff-add', text: '+ end' },
  { kind: 'diff-add', text: '+ local discount = weekendBonus()' },
  { kind: 'wait', text: 'awaiting your approval…' },
  { kind: 'ok', text: 'APPROVED ✓ git checkpoint c8a41f2 created' },
  { kind: 'ok', text: 'applied to qb-vehicleshop/client/main.lua · rollback available' },
];

const KIND_STYLE: Record<Line['kind'], string> = {
  cmd: 'text-white',
  sys: 'text-white/40',
  file: 'text-white/70',
  'diff-add': 'text-[#3DFFA2]',
  'diff-del': 'text-white/30 line-through decoration-white/30',
  ok: 'text-[#3DFFA2]',
  wait: 'text-white/30',
};

export default function TerminalDemo() {
  const [lines, setLines] = useState<Line[]>([]);
  const [started, setStarted] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => e.isIntersecting && setStarted(true),
      { threshold: 0.35 },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    if (!started) return;
    let i = 0;
    let timer: ReturnType<typeof setTimeout>;

    const step = () => {
      if (i >= SCRIPT.length) {
        // hold the completed transcript, then restart the loop
        timer = setTimeout(() => {
          setLines([]);
          i = 0;
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
    step();

    return () => clearTimeout(timer);
  }, [started]);

  return (
    <div ref={ref} className="noxes-card !p-0 overflow-hidden">
      {/* Title bar */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-white/8 bg-[#0F0F14]">
        <span className="w-2 h-2 bg-white/15" />
        <span className="w-2 h-2 bg-white/15" />
        <span className="w-2 h-2 bg-[#3DFFA2]/60" />
        <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-white/30 ml-2">
          noxes — live session
        </span>
      </div>

      <div className="p-5 font-mono text-xs md:text-[13px] leading-[1.9] min-h-[380px]">
        {lines.map((line, idx) => (
          <div key={idx} className={`${KIND_STYLE[line.kind]} whitespace-pre-wrap break-all`}>
            {line.text}
            {idx === lines.length - 1 && (
              <span
                aria-hidden
                className="inline-block w-[7px] h-[13px] bg-[#3DFFA2] align-middle ml-1"
                style={{ animation: 'cursor-blink 1.06s steps(1) infinite' }}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
