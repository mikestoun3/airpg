'use client';
import { useState, useEffect, useRef } from 'react';
import type { ActiveRun, RunPreviewEvent } from '@/types/game';
import { RARITY_COLORS } from '@/types/game';
import { ResIcon } from '@/components/ui/ResIcon';

interface Props {
  run: ActiveRun;
  onComplete: () => void;
}

const DUNGEON_EVENTS: Record<string, string[][]> = {
  goblin_warrens: [
    ['Sneaking into narrow tunnels...', 'First goblin spotted!'],
    ['Goblin patrol engaged!', 'Pushing deeper...'],
    ['Goblin shaman casts a curse!', 'Pressing through...'],
    ['Hobgoblins block the path!', 'Fighting hard...'],
    ["Chieftain's chamber ahead!", 'Almost there...'],
    ['Grabbing loot, retreating fast!', 'Making the escape!'],
    ['Deep in the warrens...', 'Enemies closing in!'],
    ['Ancient goblin tunnels...', 'Searching for treasure...'],
    ['The warrens grow darker...', 'Something stirs...'],
    ['Boss chamber found!', 'Preparing for battle!'],
  ],
  forgotten_cellar: [
    ['Descending into the damp cellar...', 'Old bones crunch underfoot.'],
    ['Something lives here.', 'Hidden room behind a false wall.'],
    ['Stirred something in the dark.', 'Skeleton warriors rise!'],
    ['Back corner cleared.', 'Shelves looted.'],
    ['A wraith blocks the passage!', 'Fighting through shadows...'],
    ['Deeper than expected...', 'The air is freezing cold.'],
    ['Ancient burial chambers...', 'Undead everywhere!'],
    ['A banshee wails!', 'Ears ringing...'],
    ['Near the crypt lord\'s lair...', 'Heart pounding.'],
    ['Crypt Lord awakens!', 'Final battle!'],
  ],
  ruined_watchtower: [
    ['Scaling the crumbling walls...', 'Bandits patrolling.'],
    ['First guard taken down silently.', 'Moving carefully...'],
    ['Upper floors heavily defended!', 'Fighting up the stairs.'],
    ['Reached the captain\'s quarters!', 'Searching for valuables...'],
    ['Stronghold alarm triggered!', 'Racing to escape!'],
    ['More bandits pour in!', 'Fighting through...'],
    ['Tower shaking!', 'Structure unstable...'],
    ['Bandit elite guards!', 'Tough resistance...'],
    ['Nearly at the top!', 'Final push...'],
    ['Bandit Captain emerges!', 'Final battle!'],
  ],
  collapsed_mine: [
    ['Descending into the shafts...', 'Ceiling dust — structure unstable.'],
    ['Ore veins found — digging fast.', 'Something moves in the deep.'],
    ['Pushing past a partial collapse.', 'Tunnel is narrowing...'],
    ['Load secured.', 'Heading back up slowly.'],
    ['Deep tunnel shafts...', 'Strange sounds ahead.'],
    ['Vein of rare ore spotted!', 'Digging carefully...'],
    ['Tunnel cave-in blocked the path!', 'Finding another route...'],
    ['Rock golem patrol!', 'Heavy fighting...'],
    ['The deepest tunnels...', 'Air getting thin.'],
    ['Mine Colossus blocks the exit!', 'Final battle!'],
  ],
  cursed_catacombs: [
    ['Ancient wards resist entry...', 'The air turns cold.'],
    ['Undead rising from centuries of sleep.', 'Dispelling the curse...'],
    ['Spectral guardian blocks the path!', 'Fighting through shadows...'],
    ['Curse weakens — pressing deeper.', 'Catacombs shudder!'],
    ['Deeper into the curse...', 'Reality warps...'],
    ['Ancient phylactery found!', 'Destroying it...'],
    ['Waves of undead!', 'Barely holding on...'],
    ['The curse intensifies!', 'Willpower tested...'],
    ['Lich lord\'s antechamber...', 'Power radiates from ahead.'],
    ['Lich Lord rises!', 'Final battle!'],
  ],
  bandit_stronghold: [
    ['Scaling the stronghold walls...', 'Sentry spotted — moving fast!'],
    ['Outer guards neutralised.', 'Vault room just ahead!'],
    ['Stronghold alarm triggered!', 'Racing out with the stolen gold!'],
    ['Elite guards deployed!', 'Heavy fighting...'],
    ['Inner courtyard — heavily defended.', 'Flanking the guards...'],
    ['Vault is just ahead!', 'Almost there...'],
    ['Stronghold commander!', 'Dangerous opponent...'],
    ['Secondary vault found!', 'Extra loot!'],
    ['Escape route blocked!', 'Fighting through!'],
    ['Stronghold Warlord!', 'Final battle!'],
  ],
};

const GENERIC_EVENTS = Array.from({ length: 10 }, (_, i) => [
  `Venturing deeper — floor ${i + 1}...`,
  `Resistance on floor ${i + 1}!`,
]);

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
  const floorsAttempted = run.floorsAttempted ?? 1;
  const startFloor = run.startFloor ?? 1;

  const calcSecondsLeft = () => Math.max(0, run.endTime - Math.floor(Date.now() / 1000));
  const [secondsLeft, setSecondsLeft] = useState(calcSecondsLeft);
  const [completed, setCompleted] = useState(secondsLeft === 0);
  const [visibleEvents, setVisibleEvents] = useState<{ text: string; preview?: RunPreviewEvent; isFloor?: boolean }[]>([]);
  const triggeredRef = useRef<Set<string>>(new Set());

  const progress = total > 0 ? Math.min(1, 1 - secondsLeft / total) : 1;

  // Which floor we're on right now
  const currentFloorIdx = completed
    ? floorsAttempted - 1
    : Math.min(floorsAttempted - 1, Math.floor(progress * floorsAttempted));
  const currentFloor = startFloor + currentFloorIdx;
  // Progress within the current floor (0–1)
  const floorLocalProgress = completed ? 1 : (progress * floorsAttempted) - currentFloorIdx;

  // Dungeon flavour events — 2 per floor
  const dungeonEventsByFloor = DUNGEON_EVENTS[run.dungeonId] ?? GENERIC_EVENTS;

  // Build combined event stream: floor flavour + preview events
  type CombinedEvent = { revealAt: number; text: string; preview?: RunPreviewEvent; isFloor?: boolean };
  const allEvents: CombinedEvent[] = [];

  for (let f = 0; f < floorsAttempted; f++) {
    const floorEvents = dungeonEventsByFloor[f] ?? [`Floor ${startFloor + f}...`, 'Pushing through...'];
    // Two flavour events at 25% and 75% of each floor's time window
    const floorStart = f / floorsAttempted;
    const floorEnd = (f + 1) / floorsAttempted;
    const floorSpan = floorEnd - floorStart;
    allEvents.push({ revealAt: floorStart + floorSpan * 0.25, text: floorEvents[0] });
    allEvents.push({ revealAt: floorStart + floorSpan * 0.75, text: floorEvents[1] });
    // Floor cleared announcement at 98% of the floor
    if (f < floorsAttempted - 1) {
      allEvents.push({ revealAt: floorStart + floorSpan * 0.98, text: `Floor ${startFloor + f} cleared!`, isFloor: true });
    }
  }

  // Preview loot/resource events
  for (const e of (run.previewEvents ?? [])) {
    allEvents.push({ revealAt: e.revealAt, text: e.label, preview: e });
  }

  allEvents.sort((a, b) => a.revealAt - b.revealAt);

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

  useEffect(() => {
    allEvents.forEach((ev, i) => {
      const key = `${i}-${ev.revealAt}`;
      if (progress >= ev.revealAt && !triggeredRef.current.has(key)) {
        triggeredRef.current.add(key);
        setVisibleEvents((prev) => [{ text: ev.text, preview: ev.preview, isFloor: ev.isFloor }, ...prev].slice(0, 6));
      }
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [progress]);

  const fmt = (s: number) => {
    if (s <= 0) return '0:00';
    const m = Math.floor(s / 60), sec = s % 60;
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  // Time remaining for the current floor only
  const floorDuration = total / floorsAttempted;
  const floorSecondsLeft = completed ? 0
    : Math.max(0, Math.round(floorDuration * (currentFloorIdx + 1) - (total - secondsLeft)));

  return (
    <div className="flex flex-col h-full gap-4">
      {/* ── Main dungeon scene card ── */}
      <div className="relative bg-[#120808] border border-[rgba(200,70,70,0.25)] rounded-2xl overflow-hidden flex-shrink-0">

        {/* Atmospheric background */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#0a0a1e] to-[#130909] pointer-events-none" />

        {/* Header */}
        <div className="relative z-10 flex items-center justify-between px-5 py-3">
          <div>
            <p className="text-[10px] text-[#5a3535] uppercase tracking-widest">On Expedition</p>
            <h3 className="text-slate-100 font-bold text-base mt-0.5">{run.dungeonName}</h3>
          </div>
          <div className="text-right">
            <p className="text-[10px] text-[#5a3535] uppercase tracking-widest">
              {completed ? 'Completed' : 'Current Floor'}
            </p>
            <div className="flex items-baseline gap-2 justify-end mt-0.5">
              <span className="text-2xl font-bold text-red-300 tabular-nums leading-none">
                {completed ? '🏆' : currentFloor}
                {!completed && floorsAttempted > 1 && (
                  <span className="text-sm text-[#5a3535] font-normal ml-1">/ {startFloor + floorsAttempted - 1}</span>
                )}
              </span>
              {!completed && (
                <span className="text-base font-mono font-bold text-slate-200 tabular-nums">
                  {fmt(floorSecondsLeft)}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* ── Segmented floor progress bar ── */}
        <div className="relative z-10 px-5 pb-3">
          {/* Floor labels */}
          <div className="flex mb-1">
            {Array.from({ length: floorsAttempted }, (_, i) => {
              const floorNum = startFloor + i;
              const isCurrent = i === currentFloorIdx && !completed;
              const isCleared = completed || i < currentFloorIdx;
              return (
                <div key={i} className="flex-1 text-center">
                  <span className={`text-[9px] transition-all ${
                    isCurrent ? 'text-red-300 font-bold' : isCleared ? 'text-[#5a3535]' : 'text-[#3a3a60]'
                  }`}>
                    {floorsAttempted <= 5 ? `F${floorNum}` : (isCurrent ? `F${floorNum}` : '')}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Segmented bar */}
          <div className="flex gap-0.5 h-2">
            {Array.from({ length: floorsAttempted }, (_, i) => {
              const isCurrent = i === currentFloorIdx && !completed;
              const isCleared = completed || i < currentFloorIdx;
              const segWidth = isCurrent ? floorLocalProgress : (isCleared ? 1 : 0);
              return (
                <div key={i} className="flex-1 bg-[#0a0a1f] rounded-sm overflow-hidden border border-[rgba(200,70,70,0.12)]">
                  <div
                    className="h-full rounded-sm transition-all duration-1000"
                    style={{
                      width: `${segWidth * 100}%`,
                      background: isCleared && !isCurrent
                        ? 'linear-gradient(90deg, #5b21b6, #7c3aed)'
                        : isCurrent
                          ? completed
                            ? 'linear-gradient(90deg, #10b981, #34d399)'
                            : 'linear-gradient(90deg, #6d28d9, #7c3aed, #a855f7)'
                          : 'transparent',
                      backgroundSize: isCurrent && !completed ? '200% auto' : 'auto',
                      animation: isCurrent && !completed ? 'shimmer 2s linear infinite' : 'none',
                    }}
                  />
                </div>
              );
            })}
          </div>

          {/* Progress text — floor progress left, total time right */}
          <div className="flex justify-between text-[10px] text-[#6a4040] mt-1">
            <span>
              {completed
                ? `All ${floorsAttempted} floor${floorsAttempted > 1 ? 's' : ''} done`
                : `Floor ${currentFloor} · ${Math.round(floorLocalProgress * 100)}%`}
            </span>
            {!completed && <span>Total {fmt(secondsLeft)}</span>}
          </div>
        </div>
      </div>

      {/* ── Event log ── */}
      <div className="flex-1 bg-[#120808] border border-[rgba(200,70,70,0.15)] rounded-xl p-4 overflow-hidden">
        <p className="text-[10px] text-[#6a4040] uppercase tracking-widest mb-3 flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-red-600 animate-pulse inline-block" />
          Journey Log
        </p>

        {visibleEvents.length === 0 ? (
          <p className="text-[#4a3030] text-sm italic">Preparing to depart...</p>
        ) : (
          <div className="space-y-2">
            {visibleEvents.map((ev, i) => {
              const isLoot = ev.preview?.type === 'item';
              const isResource = ev.preview?.type === 'resource';
              const isEssence = ev.preview?.type === 'essence';
              const isFloorClear = ev.isFloor;
              const rarityColor = isLoot && ev.preview?.rarity ? RARITY_COLORS[ev.preview.rarity] : null;
              return (
                <div key={`${ev.text}-${i}`}
                  className={`flex items-start gap-2.5 transition-all ${i === 0 ? 'opacity-100' : i === 1 ? 'opacity-65' : i === 2 ? 'opacity-35' : 'opacity-20'}`}
                  style={i === 0 ? { animation: 'event-slide-in 0.4s ease-out' } : {}}>
                  <span className={`mt-0.5 text-xs shrink-0 ${
                    i === 0
                      ? isFloorClear ? 'text-red-400'
                        : isLoot ? ''
                        : isResource ? 'text-emerald-400'
                        : isEssence ? 'text-rose-400'
                        : 'text-rose-400'
                      : 'text-[#4a3030]'
                  }`}
                    style={i === 0 && rarityColor ? { color: rarityColor } : undefined}>
                    {i === 0 ? (isFloorClear ? '✓' : isLoot ? '◆' : isResource ? '⬡' : '▸') : '·'}
                  </span>
                  <span className="text-sm" style={i === 0 && rarityColor ? { color: rarityColor } : undefined}>
                    <span className={
                      i > 0 ? 'text-[#5555a0]'
                        : isFloorClear ? 'text-red-300 font-semibold'
                        : isResource ? 'text-emerald-300'
                        : isEssence ? 'text-rose-300'
                        : 'text-slate-300'
                    }>
                      {ev.preview?.type === 'resource' && ev.preview.resourceId && (
                        <span className="mr-1 inline-flex align-middle">
                          <ResIcon resourceId={ev.preview.resourceId} fallback={ev.preview.icon ?? '?'} size={14} />
                        </span>
                      )}
                      {ev.preview?.type === 'resource' && !ev.preview.resourceId && ev.preview.icon && (
                        <span className="mr-1">{ev.preview.icon}</span>
                      )}
                      {ev.preview?.type !== 'resource' && ev.preview?.icon && (
                        <span className="mr-1">{ev.preview.icon}</span>
                      )}
                      {ev.text}
                    </span>
                  </span>
                </div>
              );
            })}
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
