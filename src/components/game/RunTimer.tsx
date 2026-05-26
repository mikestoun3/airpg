'use client';
import { useState, useEffect, useRef } from 'react';
import type { ActiveRun } from '@/types/game';
import { DIFFICULTY_LABELS } from '@/types/game';

interface Props {
  run: ActiveRun;
  onComplete: () => void;
}

// Per-dungeon flavour events, revealed at progress milestones
const DUNGEON_EVENTS: Record<string, string[]> = {
  goblin_warrens:    ['Sneaking into narrow tunnels...', 'Goblin patrol spotted — staying low.', 'First wave engaged!', 'Deeper in — goblins everywhere.', "Chieftain's chamber ahead!", 'Grabbing loot, retreating fast!'],
  forgotten_cellar:  ['Descending into the damp cellar...', 'Old bones. Something lives here.', 'Hidden room behind a false wall.', 'Stirred something in the dark.', 'Back corner cleared. Shelves looted.', 'Stuffing the sack, heading out.'],
  ruined_watchtower: ['Scaling the crumbling walls...', 'Bandits patrolling the courtyard.', 'First guard taken down silently.', 'Upper floors heavily defended!', "Reached the captain's quarters!", 'Fighting through the retreat!'],
  collapsed_mine:    ['Descending into the shafts...', 'Ceiling dust — structure unstable.', 'Ore veins found — digging fast.', 'Something moves in the deep tunnels.', 'Pushing past a partial collapse.', 'Load secured. Heading back up.'],
  cursed_catacombs:  ['Ancient wards resist entry...', 'The air turns cold. Very cold.', 'Undead rising from centuries of sleep.', 'Spectral guardian blocks the path!', 'Curse weakens — pressing deeper.', 'Catacombs shudder as you flee!'],
  bandit_stronghold: ['Scaling the stronghold walls...', 'Sentry spotted — moving fast!', 'Outer guards neutralised.', 'Vault room just ahead!', 'Stronghold alarm triggered!', 'Racing out with the stolen gold!'],
};

const GENERIC_EVENTS = [
  'Venturing into the unknown...', 'Signs of activity ahead.', 'Encountered resistance!',
  'Pressing through...', 'Almost there...', 'Making the escape!',
];

const PARTICLES = [
  { id: 1, left: '15%', delay: '0s',    dur: '3.2s', dx: '6px',  size: 3 },
  { id: 2, left: '35%', delay: '0.8s',  dur: '2.8s', dx: '-8px', size: 2 },
  { id: 3, left: '55%', delay: '1.5s',  dur: '3.6s', dx: '10px', size: 2 },
  { id: 4, left: '72%', delay: '0.4s',  dur: '3.0s', dx: '-5px', size: 3 },
  { id: 5, left: '88%', delay: '2.1s',  dur: '2.5s', dx: '7px',  size: 2 },
  { id: 6, left: '25%', delay: '1.2s',  dur: '4.0s', dx: '-4px', size: 1 },
];

export function RunTimer({ run, onComplete }: Props) {
  const total = run.endTime - run.startTime;

  const calcSecondsLeft = () => Math.max(0, run.endTime - Math.floor(Date.now() / 1000));
  const [secondsLeft, setSecondsLeft] = useState(calcSecondsLeft);
  const [completed, setCompleted] = useState(secondsLeft === 0);
  const [visibleEvents, setVisibleEvents] = useState<string[]>([]);
  const triggeredRef = useRef<Set<number>>(new Set());

  const progress = total > 0 ? Math.min(1, 1 - secondsLeft / total) : 1;

  const events = DUNGEON_EVENTS[run.dungeonId] ?? GENERIC_EVENTS;
  // Thresholds at which each event fires
  const thresholds = events.map((_, i) => (i + 1) / (events.length + 1));

  useEffect(() => {
    if (secondsLeft <= 0) { setCompleted(true); return; }
    const iv = setInterval(() => {
      const rem = calcSecondsLeft();
      setSecondsLeft(rem);
      if (rem === 0) { setCompleted(true); clearInterval(iv); }
    }, 1000);
    return () => clearInterval(iv);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [run.endTime]);

  // Fire events at milestones
  useEffect(() => {
    thresholds.forEach((threshold, i) => {
      if (progress >= threshold && !triggeredRef.current.has(i)) {
        triggeredRef.current.add(i);
        setVisibleEvents(prev => [events[i], ...prev].slice(0, 4));
      }
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [progress]);

  const fmt = (s: number) => {
    if (s <= 0) return '0:00';
    const m = Math.floor(s / 60), sec = s % 60;
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  const heroLeft = `${Math.min(88, progress * 90 + 2)}%`;

  return (
    <div className="flex flex-col h-full gap-4">
      {/* ── Main dungeon scene card ── */}
      <div className="relative bg-[#0d0d20] border border-[rgba(120,110,200,0.25)] rounded-2xl overflow-hidden flex-shrink-0"
        style={{ minHeight: 260 }}>

        {/* Atmospheric background */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#0a0a1e] via-[#0f0f28] to-[#12122e] pointer-events-none" />

        {/* Floating particles */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {PARTICLES.map(p => (
            <div key={p.id} className="absolute bottom-0 rounded-full bg-purple-400/50"
              style={{
                left: p.left, width: p.size, height: p.size,
                animation: `particle-float ${p.dur} ${p.delay} ease-in infinite`,
                '--dx': p.dx,
              } as React.CSSProperties} />
          ))}
        </div>

        {/* Torch glows */}
        <div className="absolute top-4 left-6 w-5 h-5 rounded-full bg-orange-500/60 pointer-events-none"
          style={{ animation: 'torch-pulse 1.8s ease-in-out infinite', filter: 'blur(4px)' }} />
        <div className="absolute top-4 right-6 w-5 h-5 rounded-full bg-orange-500/50 pointer-events-none"
          style={{ animation: 'torch-pulse 2.3s 0.7s ease-in-out infinite', filter: 'blur(4px)' }} />

        {/* Header */}
        <div className="relative z-10 flex items-start justify-between px-5 pt-4">
          <div>
            <p className="text-[10px] text-[#6060a0] uppercase tracking-widest">On Expedition</p>
            <h3 className="text-slate-100 font-bold text-lg mt-0.5">{run.dungeonName}</h3>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs px-2.5 py-1 rounded-full bg-[#1a1a38] text-[#9090c0] capitalize border border-[rgba(120,110,200,0.2)]">
              {DIFFICULTY_LABELS[run.difficulty]}
            </span>
            <span className="text-xl font-mono font-bold text-slate-100 tabular-nums w-14 text-right">
              {completed ? '—' : fmt(secondsLeft)}
            </span>
          </div>
        </div>

        {/* ── Hero path ── */}
        <div className="relative z-10 mx-5 mt-5 mb-2 h-14">
          {/* Ground line */}
          <div className="absolute top-8 left-4 right-4 h-px bg-gradient-to-r from-transparent via-[#3a3a70] to-transparent" />

          {/* Start icon */}
          <div className="absolute left-0 top-1/2 -translate-y-3 flex flex-col items-center gap-0.5">
            <span className="text-lg">🏰</span>
          </div>

          {/* End icon */}
          <div className={`absolute right-0 top-1/2 -translate-y-3 flex flex-col items-center gap-0.5 transition-all duration-500 ${
            completed ? 'opacity-100 scale-125' : 'opacity-40'
          }`}>
            <span className="text-lg">{completed ? '🏆' : '⚔'}</span>
          </div>

          {/* Trail */}
          <div className="absolute top-8 left-4 right-4 h-px overflow-hidden">
            <div className="h-full bg-gradient-to-r from-violet-500 to-purple-400 transition-all duration-1000 rounded-full"
              style={{ width: `${progress * 100}%` }} />
          </div>

          {/* Hero */}
          <div className="absolute top-1/2 -translate-y-1/2 transition-all duration-1000 z-20"
            style={{ left: heroLeft, animation: completed ? 'none' : 'hero-bob 1.2s ease-in-out infinite' }}>
            <div className={`text-2xl drop-shadow-lg transition-all ${completed ? 'scale-125' : ''}`}>
              {completed ? '🎉' : '⚔️'}
            </div>
          </div>
        </div>

        {/* Progress bar */}
        <div className="relative z-10 mx-5 mb-4">
          <div className="flex justify-between text-[10px] text-[#5050a0] mb-1">
            <span>{Math.round(progress * 100)}% complete</span>
            {!completed && <span>ETA {fmt(secondsLeft)}</span>}
          </div>
          <div className="h-2 bg-[#0a0a1f] rounded-full overflow-hidden border border-[rgba(120,110,200,0.15)]">
            <div
              className="h-full rounded-full transition-all duration-1000"
              style={{
                width: `${progress * 100}%`,
                background: completed
                  ? 'linear-gradient(90deg, #10b981, #34d399)'
                  : 'linear-gradient(90deg, #6d28d9, #7c3aed, #a855f7)',
                backgroundSize: completed ? 'auto' : '200% auto',
                animation: completed ? 'none' : 'shimmer 2s linear infinite',
              }}
            />
          </div>
        </div>
      </div>

      {/* ── Event log ── */}
      <div className="flex-1 bg-[#0d0d20] border border-[rgba(120,110,200,0.15)] rounded-xl p-4 overflow-hidden">
        <p className="text-[10px] text-[#5050a0] uppercase tracking-widest mb-3 flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-purple-500 animate-pulse inline-block" />
          Journey Log
        </p>

        {visibleEvents.length === 0 ? (
          <p className="text-[#4040a0] text-sm italic">Preparing to depart...</p>
        ) : (
          <div className="space-y-2">
            {visibleEvents.map((event, i) => (
              <div key={`${event}-${i}`}
                className={`flex items-start gap-2.5 transition-all ${i === 0 ? 'opacity-100' : i === 1 ? 'opacity-60' : 'opacity-30'}`}
                style={i === 0 ? { animation: 'event-slide-in 0.4s ease-out' } : {}}>
                <span className={`mt-0.5 text-xs shrink-0 ${i === 0 ? 'text-purple-400' : 'text-[#4040a0]'}`}>
                  {i === 0 ? '▸' : '·'}
                </span>
                <span className={`text-sm ${i === 0 ? 'text-slate-300' : 'text-[#5555a0]'}`}>{event}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Collect button (when done) ── */}
      {completed && (
        <button
          onClick={onComplete}
          className="w-full py-4 font-bold text-white rounded-xl text-base tracking-wide transition-all"
          style={{
            background: 'linear-gradient(135deg, #059669, #10b981)',
            animation: 'complete-pulse 1.5s ease-in-out infinite',
          }}>
          ⚔ Return &amp; Collect Loot
        </button>
      )}
    </div>
  );
}
