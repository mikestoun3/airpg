'use client';
import { useState, useEffect } from 'react';
import type { ActiveRun } from '@/types/game';
import { DIFFICULTY_LABELS } from '@/types/game';

interface RunTimerProps {
  run: ActiveRun;
  onComplete: () => void;
  compact?: boolean;
}

export function RunTimer({ run, onComplete, compact = false }: RunTimerProps) {
  const [secondsLeft, setSecondsLeft] = useState(() => {
    return Math.max(0, run.endTime - Math.floor(Date.now() / 1000));
  });
  const [completed, setCompleted] = useState(secondsLeft === 0);

  useEffect(() => {
    if (secondsLeft <= 0) { setCompleted(true); return; }
    const iv = setInterval(() => {
      const rem = Math.max(0, run.endTime - Math.floor(Date.now() / 1000));
      setSecondsLeft(rem);
      if (rem === 0) { setCompleted(true); clearInterval(iv); }
    }, 1000);
    return () => clearInterval(iv);
  }, [run.endTime, secondsLeft]);

  const total = run.endTime - run.startTime;
  const elapsed = total - secondsLeft;
  const progress = total > 0 ? Math.min(1, elapsed / total) : 1;

  const fmt = (s: number) => {
    if (s <= 0) return '0:00';
    const m = Math.floor(s / 60), sec = s % 60;
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  if (compact) {
    return (
      <div className="bg-[#14142a] border border-[rgba(120,110,200,0.2)] rounded-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-[11px] text-[#7070b0] uppercase tracking-widest">On Expedition</p>
            <p className="text-slate-100 font-bold mt-0.5">{run.dungeonName}</p>
          </div>
          <span className="text-xs px-2.5 py-1 rounded-full bg-[#1e1e3d] text-[#9090c0] capitalize">
            {DIFFICULTY_LABELS[run.difficulty]}
          </span>
        </div>
        <div className="h-1.5 bg-[#0f0f25] rounded-full overflow-hidden mb-3">
          <div className="h-full bg-gradient-to-r from-violet-600 to-purple-500 rounded-full transition-all duration-1000"
            style={{ width: `${progress * 100}%` }} />
        </div>
        {completed ? (
          <button onClick={onComplete}
            className="w-full py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold rounded-xl transition-all text-sm">
            ⚔ Collect Loot
          </button>
        ) : (
          <div className="text-center text-2xl font-mono font-bold text-slate-100">{fmt(secondsLeft)}</div>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center py-16">
      <div className="relative">
        <div className="w-44 h-44 rounded-full border-4 border-[#252545] flex items-center justify-center"
          style={{ background: `conic-gradient(#7c5ff0 ${progress * 360}deg, #14142a 0deg)` }}>
          <div className="w-36 h-36 rounded-full bg-[#09091a] flex flex-col items-center justify-center">
            {completed ? (
              <span className="text-3xl">⚔</span>
            ) : (
              <>
                <span className="text-3xl font-mono font-bold text-slate-100">{fmt(secondsLeft)}</span>
                <span className="text-[11px] text-[#7070b0] mt-1">remaining</span>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="mt-8 text-center">
        <p className="text-[12px] text-[#7070b0] uppercase tracking-widest mb-1">On Expedition</p>
        <h2 className="text-2xl font-bold text-slate-100">{run.dungeonName}</h2>
        <span className="inline-block mt-2 text-xs px-3 py-1 rounded-full bg-[#1a1a35] text-[#9090c0] capitalize">
          {DIFFICULTY_LABELS[run.difficulty]}
        </span>
      </div>

      {completed && (
        <button onClick={onComplete}
          className="mt-8 px-12 py-4 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 text-white font-bold rounded-2xl text-lg transition-all shadow-lg shadow-purple-900/40">
          ⚔ Return &amp; Collect Loot
        </button>
      )}

      {!completed && (
        <p className="mt-6 text-[#5050a0] text-sm">Your hero is away. Check back soon.</p>
      )}
    </div>
  );
}
