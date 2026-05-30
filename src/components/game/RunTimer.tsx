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
    ['Sneaking into narrow tunnels...', 'First scavenger spotted!'],
    ['Scav patrol engaged!', 'Pushing deeper...'],
    ['Iron Shaman casts interference!', 'Pressing through...'],
    ['Hollow Guards block the path!', 'Fighting hard...'],
    ["Warchief's chamber ahead!", 'Almost there...'],
    ['Grabbing loot, retreating fast!', 'Making the escape!'],
    ['Deep in the hollows...', 'Enemies closing in!'],
    ['Ancient transit shafts...', 'Searching for salvage...'],
    ['The hollows grow darker...', 'Something stirs...'],
    ['Boss chamber found!', 'Preparing for battle!'],
  ],
  forgotten_cellar: [
    ['Descending into the relay station...', 'Static fills the air.'],
    ['Echo signatures detected.', 'Hidden access panel found.'],
    ['Stirred a ghost in the grid.', 'Static Drones activate!'],
    ['Back sector cleared.', 'Signal cache looted.'],
    ['A Void Crawler blocks the node!', 'Fighting through interference...'],
    ['Deeper than expected...', 'The air hums with energy.'],
    ['Ancient signal chambers...', 'Specters everywhere!'],
    ['Echo Wraith wails!', 'Signal jamming...'],
    ["Near the Core Overseer's node...", 'Power surging.'],
    ['Core Overseer awakens!', 'Final battle!'],
  ],
  ruined_watchtower: [
    ['Scaling the rusted walls...', 'Rogue operators patrolling.'],
    ['First sentinel neutralized.', 'Moving carefully...'],
    ['Upper floors heavily defended!', 'Fighting through debris.'],
    ["Reached the commander's quarters!", 'Searching for intel...'],
    ['Stronghold alarm triggered!', 'Racing to escape!'],
    ['More mercs pour in!', 'Fighting through...'],
    ['Structure shaking!', 'Unstable zone...'],
    ['Elite war engineers!', 'Tough resistance...'],
    ['Nearly at the core!', 'Final push...'],
    ['Warzone Commander emerges!', 'Final battle!'],
  ],
  collapsed_mine: [
    ['Descending into the spire shafts...', 'Anomaly readings — unstable.'],
    ['Void ore vein found — extracting fast.', 'Something moves in the rift.'],
    ['Phase Crawlers emerge!', 'Anomaly field intensifies...'],
    ['Shard load secured.', 'Heading back through the rift.'],
    ['Deep void shafts...', 'Reality distorting.'],
    ['Rare void crystal spotted!', 'Extracting carefully...'],
    ['Rift collapse blocked the path!', 'Finding another route...'],
    ['Shard Golem patrol!', 'Heavy resistance...'],
    ['The deepest anomaly zone...', 'Energy critical.'],
    ['Spire Colossus materializes!', 'Final battle!'],
  ],
  cursed_catacombs: [
    ['Nexus firewall resists entry...', 'Corrupted data streams.'],
    ['Neural Knights rising from standby.', 'Bypassing security...'],
    ['Sync Reaper blocks the node!', 'Fighting through corruption...'],
    ['Sector cleared — pushing deeper.', 'Network shudders!'],
    ['Deeper into the corruption...', 'Data warps...'],
    ['Ancient data core found!', 'Extracting...'],
    ['Waves of corrupted drones!', 'Barely holding on...'],
    ['Corruption intensifies!', 'Firewall tested...'],
    ["Nexus Archon's antechamber...", 'Power radiates from ahead.'],
    ['Nexus Archon awakens!', 'Final battle!'],
  ],
  bandit_stronghold: [
    ['Infiltrating the solar facility...', 'Core guard spotted!'],
    ['Outer perimeter neutralized.', 'Reactor room just ahead!'],
    ['Facility alarm triggered!', 'Racing out with the energy cores!'],
    ['Elite plasma mercs deployed!', 'Heavy fighting...'],
    ['Inner reactor — heavily defended.', 'Flanking the guards...'],
    ['Vault is just ahead!', 'Almost there...'],
    ['Fusion Commander blocks the way!', 'Dangerous opponent...'],
    ['Secondary storage found!', 'Extra loot!'],
    ['Escape route sealed!', 'Fighting through!'],
    ['Reactor Warlord activates!', 'Final battle!'],
  ],
};

const DUNGEON_IMG: Record<string, string> = {
  goblin_warrens:    '/dungeons/goblin_warrens.mp4',
  forgotten_cellar:  '/dungeons/forgotten_cellar.mp4',
  ruined_watchtower: '/dungeons/ruined_watchtower.mp4',
  collapsed_mine:    '/dungeons/collapsed_mine.png',
  cursed_catacombs:  '/dungeons/cursed_catacombs.png',
  bandit_stronghold: '/dungeons/bandit_stronghold.png',
};

const GENERIC_EVENTS = Array.from({ length: 10 }, (_, i) => [
  `Venturing deeper — floor ${i + 1}...`,
  `Resistance on floor ${i + 1}!`,
]);

export function RunTimer({ run, onComplete }: Props) {
  const total = run.endTime - run.startTime;
  const floorsAttempted = run.floorsAttempted ?? 1;
  const startFloor = run.startFloor ?? 1;

  const calcSecondsLeft = () => Math.max(0, run.endTime - Math.floor(Date.now() / 1000));
  const [secondsLeft, setSecondsLeft] = useState(calcSecondsLeft);
  const [completed, setCompleted] = useState(secondsLeft === 0);
  const [visibleEvents, setVisibleEvents] = useState<{ text: string; preview?: RunPreviewEvent; isFloor?: boolean }[]>([]);
  const [lootLog, setLootLog] = useState<RunPreviewEvent[]>([]);
  const triggeredRef = useRef<Set<string>>(new Set());

  const progress = total > 0 ? Math.min(1, 1 - secondsLeft / total) : 1;
  const currentFloorIdx = completed
    ? floorsAttempted - 1
    : Math.min(floorsAttempted - 1, Math.floor(progress * floorsAttempted));
  const currentFloor = startFloor + currentFloorIdx;
  const floorLocalProgress = completed ? 1 : (progress * floorsAttempted) - currentFloorIdx;

  const dungeonEventsByFloor = DUNGEON_EVENTS[run.dungeonId] ?? GENERIC_EVENTS;

  type CombinedEvent = { revealAt: number; text: string; preview?: RunPreviewEvent; isFloor?: boolean };
  const allEvents: CombinedEvent[] = [];
  for (let f = 0; f < floorsAttempted; f++) {
    const floorEvents = dungeonEventsByFloor[f] ?? [`Floor ${startFloor + f}...`, 'Pushing through...'];
    const floorStart = f / floorsAttempted;
    const floorEnd = (f + 1) / floorsAttempted;
    const floorSpan = floorEnd - floorStart;
    allEvents.push({ revealAt: floorStart + floorSpan * 0.25, text: floorEvents[0] });
    allEvents.push({ revealAt: floorStart + floorSpan * 0.75, text: floorEvents[1] });
    if (f < floorsAttempted - 1) {
      allEvents.push({ revealAt: floorStart + floorSpan * 0.98, text: `Floor ${startFloor + f} cleared!`, isFloor: true });
    }
  }
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
        // Only add actual loot (items with rarity, resources, essence) — not floor combat events
        if (ev.preview && (
          ev.preview.type === 'resource' ||
          ev.preview.type === 'essence' ||
          (ev.preview.type === 'item' && ev.preview.rarity)
        )) {
          setLootLog((prev) => [...prev, ev.preview!]);
        }
      }
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [progress]);

  const fmt = (s: number) => {
    if (s <= 0) return '0:00';
    const m = Math.floor(s / 60), sec = s % 60;
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  const floorDuration = total / floorsAttempted;
  const floorSecondsLeft = completed ? 0
    : Math.max(0, Math.round(floorDuration * (currentFloorIdx + 1) - (total - secondsLeft)));

  // Group loot for summary display
  const lootItems = lootLog.filter(e => e.type === 'item');
  const lootResources = lootLog.filter(e => e.type === 'resource');
  const lootEssence = lootLog.filter(e => e.type === 'essence');

  return (
    <div className="flex flex-col h-full gap-3">

      {/* ── Main dungeon card ── */}
      <div className="relative bg-[#13131a] border border-[rgba(255,255,255,0.08)] rounded-xl overflow-hidden flex-shrink-0">
        {/* Dungeon artwork background */}
        {DUNGEON_IMG[run.dungeonId] && (
          DUNGEON_IMG[run.dungeonId].endsWith('.mp4')
            ? <video src={DUNGEON_IMG[run.dungeonId]} autoPlay loop muted playsInline
                className="absolute inset-0 w-full h-full object-cover opacity-20 pointer-events-none select-none" />
            : <img src={DUNGEON_IMG[run.dungeonId]} alt=""
                className="absolute inset-0 w-full h-full object-cover opacity-20 pointer-events-none select-none" />
        )}
        <div className="absolute inset-0 bg-gradient-to-r from-[#0e0e18]/95 via-[#0e0e18]/70 to-[#0e0e18]/50 pointer-events-none" />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-[#13131a] pointer-events-none" />

        {/* Header */}
        <div className="relative z-10 flex items-center justify-between px-5 py-3">
          <div>
            <p className="text-[10px] text-[#505058] uppercase tracking-widest">On Expedition</p>
            <h3 className="text-slate-100 font-bold text-base mt-0.5">{run.dungeonName}</h3>
          </div>
          <div className="text-right">
            <p className="text-[10px] text-[#505058] uppercase tracking-widest">
              {completed ? 'Completed' : 'Current Floor'}
            </p>
            <div className="flex items-baseline gap-2 justify-end mt-0.5">
              <span className="text-2xl font-bold tabular-nums leading-none" style={{ color: '#FC3154' }}>
                {completed ? '🏆' : currentFloor}
                {!completed && floorsAttempted > 1 && (
                  <span className="text-sm text-[#505058] font-normal ml-1">/ {startFloor + floorsAttempted - 1}</span>
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

        {/* Segmented progress bar */}
        <div className="relative z-10 px-5 pb-3">
          <div className="flex mb-1">
            {Array.from({ length: floorsAttempted }, (_, i) => {
              const floorNum = startFloor + i;
              const isCurrent = i === currentFloorIdx && !completed;
              const isCleared = completed || i < currentFloorIdx;
              return (
                <div key={i} className="flex-1 text-center">
                  <span className={`text-[9px] transition-all ${
                    isCurrent ? 'font-bold' : isCleared ? 'text-[#505058]' : 'text-[#303038]'
                  }`} style={isCurrent ? { color: '#FC3154' } : undefined}>
                    {floorsAttempted <= 5 ? `F${floorNum}` : (isCurrent ? `F${floorNum}` : '')}
                  </span>
                </div>
              );
            })}
          </div>

          <div className="flex gap-0.5 h-2">
            {Array.from({ length: floorsAttempted }, (_, i) => {
              const isCurrent = i === currentFloorIdx && !completed;
              const isCleared = completed || i < currentFloorIdx;
              const segWidth = isCurrent ? floorLocalProgress : (isCleared ? 1 : 0);
              return (
                <div key={i} className="flex-1 bg-[#0c0c12] rounded-sm overflow-hidden border border-[rgba(255,255,255,0.06)]">
                  <div
                    className="h-full rounded-sm transition-all duration-1000"
                    style={{
                      width: `${segWidth * 100}%`,
                      background: isCleared && !isCurrent
                        ? 'linear-gradient(90deg, #a02038, #FC3154)'
                        : isCurrent
                          ? completed
                            ? 'linear-gradient(90deg, #10b981, #34d399)'
                            : 'linear-gradient(90deg, #d4294a, #FC3154, #ff6080)'
                          : 'transparent',
                      backgroundSize: isCurrent && !completed ? '200% auto' : 'auto',
                      animation: isCurrent && !completed ? 'shimmer 2s linear infinite' : 'none',
                    }}
                  />
                </div>
              );
            })}
          </div>

          <div className="flex justify-between text-[10px] text-[#505058] mt-1">
            <span>
              {completed
                ? `All ${floorsAttempted} floor${floorsAttempted > 1 ? 's' : ''} done`
                : `Floor ${currentFloor} · ${Math.round(floorLocalProgress * 100)}%`}
            </span>
            {!completed && <span>Total {fmt(secondsLeft)}</span>}
          </div>
        </div>

        {/* Run stats strip */}
        <div className="relative z-10 grid grid-cols-4 divide-x divide-[rgba(255,255,255,0.06)] border-t border-[rgba(255,255,255,0.06)]">
          {[
            { label: 'Dungeon', value: run.dungeonName },
            { label: 'Floors', value: `${completed ? floorsAttempted : currentFloorIdx} / ${floorsAttempted}` },
            { label: 'Items', value: String(lootItems.length) },
            { label: 'Resources', value: String(lootResources.length + lootEssence.length) },
          ].map(({ label, value }) => (
            <div key={label} className="px-4 py-2 text-center">
              <p className="text-[9px] text-[#404048] uppercase tracking-widest">{label}</p>
              <p className="text-slate-300 font-semibold text-xs mt-0.5 truncate">{value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Main content row: log + loot ── */}
      <div className="flex-1 flex gap-3 min-h-0">

        {/* Journey log */}
        <div className="flex-1 bg-[#13131a] border border-[rgba(255,255,255,0.07)] rounded-xl p-4 overflow-hidden">
          <p className="text-[10px] text-[#505058] uppercase tracking-widest mb-3 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full animate-pulse inline-block" style={{ backgroundColor: '#FC3154' }} />
            Journey Log
          </p>
          {visibleEvents.length === 0 ? (
            <p className="text-[#404048] text-sm italic">Preparing to depart...</p>
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
                    className={`flex items-start gap-2.5 transition-all ${i === 0 ? 'opacity-100' : i === 1 ? 'opacity-60' : i === 2 ? 'opacity-35' : 'opacity-15'}`}
                    style={i === 0 ? { animation: 'event-slide-in 0.4s ease-out' } : {}}>
                    <span className="mt-0.5 text-xs shrink-0"
                      style={{ color: i === 0 ? (rarityColor ?? (isFloorClear ? '#FC3154' : isResource ? '#34d399' : '#FC3154')) : '#333340' }}>
                      {i === 0 ? (isFloorClear ? '✓' : isLoot ? '◆' : isResource ? '⬡' : '▸') : '·'}
                    </span>
                    <span className="text-sm">
                      <span style={{ color: i > 0 ? '#404048' : (rarityColor ?? (isFloorClear ? '#FC3154' : isResource ? '#86efac' : isEssence ? '#FC3154' : '#cbd5e1')) }}>
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

        {/* Loot summary */}
        <div className="w-60 bg-[#13131a] border border-[rgba(255,255,255,0.07)] rounded-xl p-3 flex flex-col">
          <p className="text-[10px] text-[#505058] uppercase tracking-widest mb-2.5 flex items-center gap-1.5">
            <span>⬡</span> Loot
          </p>

          {lootLog.length === 0 ? (
            <p className="text-[#303038] text-xs italic flex-1 flex items-center justify-center text-center">
              Nothing yet...
            </p>
          ) : (
            <div className="space-y-1 overflow-y-auto flex-1">
              {/* Items */}
              {lootItems.length > 0 && (
                <div className="space-y-1 mb-1">
                  {lootItems.map((e, i) => (
                    <div key={i} className="flex items-center gap-1.5 py-0.5">
                      {e.rarity && (
                        <div className="w-7 h-7 shrink-0 rounded border border-[rgba(255,255,255,0.08)] bg-[#0e0e14] flex items-center justify-center overflow-hidden">
                          <img
                            src={`/icons/items/item_${e.label.toLowerCase().includes('blade') || e.label.toLowerCase().includes('sword') ? 'weapon' : 'chest'}_${e.rarity}.png`}
                            className="w-full h-full object-cover"
                            onError={e2 => { (e2.target as HTMLImageElement).style.display = 'none'; }}
                            alt=""
                          />
                        </div>
                      )}
                      <span className="text-[11px] leading-tight truncate" style={{ color: e.rarity ? RARITY_COLORS[e.rarity] : '#94a3b8' }}>
                        {e.label}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {/* Resources */}
              {lootResources.length > 0 && (
                <div className="space-y-1 pt-1 border-t border-[rgba(255,255,255,0.05)]">
                  {lootResources.map((e, i) => (
                    <div key={i} className="flex items-center gap-1.5">
                      {e.resourceId ? (
                        <ResIcon resourceId={e.resourceId} fallback={e.icon ?? '?'} size={14} />
                      ) : (
                        <span className="text-xs">{e.icon ?? '⬡'}</span>
                      )}
                      <span className="text-[11px] text-emerald-300 truncate">{e.label}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Essence */}
              {lootEssence.length > 0 && (
                <div className="space-y-1 pt-1 border-t border-[rgba(255,255,255,0.05)]">
                  {lootEssence.map((e, i) => (
                    <div key={i} className="flex items-center gap-1.5">
                      <span className="text-xs">🔮</span>
                      <span className="text-[11px] text-[#FC3154] truncate">{e.label}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Collect button */}
      {completed && (
        <button onClick={onComplete}
          className="w-full py-4 font-bold text-white rounded-xl text-base tracking-wide transition-all flex-shrink-0"
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
