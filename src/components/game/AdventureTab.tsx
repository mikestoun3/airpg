'use client';
import { useState } from 'react';
import type { GameState, EquipmentSlot } from '@/types/game';
import { DUNGEONS } from '@/lib/data/dungeons';
import { RARITY_COLORS } from '@/types/game';
import { DUNGEON_RESOURCE_DROPS, getResource } from '@/lib/data/resources';
import { RunTimer } from './RunTimer';

interface Props {
  state: GameState;
  onRunStart: (run: GameState['activeRun']) => void;
  onRunComplete: () => void;
  onRefresh: () => void;
  onNavigate?: (tab: string) => void;
}

const TIER_LABELS = ['', 'Tier I', 'Tier II', 'Tier III', 'Tier IV'];
const TIER_BADGE: Record<number, string> = {
  1: 'text-slate-400',
  2: 'text-blue-400',
  3: 'text-violet-400',
  4: 'text-amber-400',
};

const DUNGEON_IMG: Record<string, string> = {
  goblin_warrens:    '/dungeons/goblin_warrens.png',
  forgotten_cellar:  '/dungeons/forgotten_cellar.png',
  ruined_watchtower: '/dungeons/ruined_watchtower.png',
  collapsed_mine:    '/dungeons/collapsed_mine.png',
  cursed_catacombs:  '/dungeons/cursed_catacombs.png',
  bandit_stronghold: '/dungeons/bandit_stronghold.png',
};

const DUNGEON_FALLBACK: Record<string, string> = {
  goblin_warrens:    'from-[#142208] via-[#0f1a06] to-[#0a1205]',
  forgotten_cellar:  'from-[#1a1610] via-[#120e0a] to-[#0e0c08]',
  ruined_watchtower: 'from-[#1e1606] via-[#16100a] to-[#100c06]',
  collapsed_mine:    'from-[#161616] via-[#101010] to-[#0c0c0c]',
  cursed_catacombs:  'from-[#18081e] via-[#100614] to-[#0c040e]',
  bandit_stronghold: 'from-[#121220] via-[#160606] to-[#100404]',
};

const DUNGEON_SUBTITLE: Record<string, string> = {
  goblin_warrens:    'Collapsed Transit Zone',
  forgotten_cellar:  'Abandoned Signal Relay',
  ruined_watchtower: 'Rogue Military Outpost',
  collapsed_mine:    'Energy Anomaly Site',
  cursed_catacombs:  'Corrupted Network Node',
  bandit_stronghold: 'Seized Power Facility',
};

const SLOTS: EquipmentSlot[] = ['weapon', 'helmet', 'chest', 'boots', 'ring', 'trinket'];
const STAT_LABEL = { pwr: 'PWR', end: 'END', lck: 'LCK', spd: 'SPD', ins: 'INS' } as const;
const SLOT_LABEL: Record<EquipmentSlot, string> = {
  weapon: 'Blade', helmet: 'Helmet', chest: 'Chest',
  boots: 'Boots', ring: 'Ring', trinket: 'Pendant',
};

function oddsColor(o: number) {
  return o >= 70 ? 'text-emerald-400' : o >= 45 ? 'text-amber-400' : 'text-[#FC3154]';
}

export function AdventureTab({ state, onRunStart, onRunComplete, onNavigate }: Props) {
  const [selectedDungeon, setSelectedDungeon] = useState<string | null>(null);
  const [floorsToAttempt, setFloorsToAttempt] = useState(3);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { character, equipment, activeRun, unlockedDungeons, savedFloors } = state;
  const isIdle = character.status === 'idle';
  const isInjured = character.status === 'injured';

  if (activeRun) return <RunTimer run={activeRun} onComplete={onRunComplete} />;

  const handleSend = async () => {
    if (!selectedDungeon) return;
    setLoading(true); setError(null);
    const res = await fetch('/api/run/start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dungeonId: selectedDungeon, floorsToAttempt }),
    });
    const data = await res.json();
    if (data.ok) onRunStart(data.run);
    else setError(data.error);
    setLoading(false);
  };

  const dungeonList = DUNGEONS.filter(d => unlockedDungeons.includes(d.id));
  const lockedDungeons = DUNGEONS.filter(d => !unlockedDungeons.includes(d.id));
  const selected = selectedDungeon ? DUNGEONS.find(d => d.id === selectedDungeon) : null;
  const cr = character.combatRating;

  const savedFloor = selected ? (savedFloors?.[selected.id] ?? 0) : 0;
  const startFloor = savedFloor + 1;
  const endFloor = startFloor + floorsToAttempt - 1;
  const firstFloorDC = selected ? Math.round(selected.baseDC + (startFloor - 1) * selected.floorDCStep) : 0;
  const lastFloorDC = selected ? Math.round(selected.baseDC + (endFloor - 1) * selected.floorDCStep) : 0;
  const firstFloorOdds = selected ? Math.min(95, Math.max(5, cr - firstFloorDC + 70)) : 0;
  const spdReduction = Math.min(character.spd * 0.02, 0.4);
  const estimatedDuration = Math.max(1, Math.round(floorsToAttempt * 2 * (1 - spdReduction)));

  const bossFloors: number[] = [];
  if (selected) {
    for (let f = startFloor; f <= endFloor; f++) {
      if (f % 10 === 0) bossFloors.push(f);
    }
  }

  return (
    <div className="flex flex-col md:flex-row gap-4 md:h-full">

      {/* ── Mobile sticky send panel ── */}
      {selected && !isInjured && (
        <div className="md:hidden fixed bottom-14 left-0 right-0 z-20 bg-[#16161f] border-t border-[rgba(200,80,80,0.35)] px-3 pt-3 pb-3 shadow-2xl">
          <div className="flex items-center gap-2 mb-2">
            <p className="text-slate-200 font-semibold text-sm flex-1 truncate">{selected.name}</p>
            {savedFloor > 0 && <p className="text-[10px] text-[#FC3154]/60 shrink-0">Fl.{savedFloor + 1}↑</p>}
            <button onClick={() => setSelectedDungeon(null)} className="text-[#505058] hover:text-slate-400 text-sm shrink-0">✕</button>
          </div>
          <div className="flex gap-1 mb-2.5">
            {[1,2,3,4,5,6,7,8,9,10].map(n => (
              <button key={n} onClick={() => setFloorsToAttempt(n)}
                className={`flex-1 py-1.5 rounded text-xs font-bold border transition-all ${
                  floorsToAttempt === n
                    ? 'border-[#FC3154]/60 bg-red-900/40 text-red-200'
                    : 'border-[rgba(255,255,255,0.07)] bg-transparent text-[#606068]'
                }`}>{n}</button>
            ))}
          </div>
          {error && <p className="text-[#FC3154] text-xs mb-2">{error}</p>}
          <button onClick={handleSend} disabled={!isIdle || loading}
            className="w-full py-2.5 bg-gradient-to-r from-[#d4294a] to-[#d4294a] hover:from-[#FC3154] disabled:from-[#1a1a26] disabled:to-[#1a1a26] disabled:text-[#505058] text-white font-bold rounded-xl text-sm tracking-widest uppercase transition-all">
            {loading ? 'Sending...' : `Send Hero → ${floorsToAttempt} floor${floorsToAttempt > 1 ? 's' : ''}`}
          </button>
        </div>
      )}

      {/* ── LEFT: dungeon list ── */}
      <div className="flex-1 flex flex-col gap-3 md:overflow-y-auto md:pr-1 pb-36 md:pb-0">
        <p className="text-xs font-bold uppercase tracking-[0.25em] text-[#FC3154]"
          style={{ textShadow: '0 0 10px rgba(252,49,84,0.6), 0 0 20px rgba(252,49,84,0.3)' }}>
          Available Dungeons
        </p>

        {isInjured && character.injuredUntil ? (
          <div className="bg-[#16161f] border border-red-900/40 rounded-xl p-6 text-center">
            <span className="text-3xl">🩹</span>
            <p className="text-[#FC3154] font-semibold mt-3">Hero is Injured</p>
            <p className="text-[#FC3154]/50 text-sm mt-1">
              Recovering — ~{Math.ceil(Math.max(0, character.injuredUntil - Math.floor(Date.now() / 1000)) / 60)} min left
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {dungeonList.map((dungeon) => {
              const isSel = selectedDungeon === dungeon.id;
              const dungeonSavedFloor = savedFloors?.[dungeon.id] ?? 0;
              const dungeonStartFloor = dungeonSavedFloor + 1;
              const floorDC = Math.round(dungeon.baseDC + (dungeonStartFloor - 1) * dungeon.floorDCStep);
              // P(not fail) = min(95, max(5, CR - DC + 70))
              const passRate = Math.min(95, Math.max(5, cr - floorDC + 70));
              const passColor = passRate >= 70 ? 'text-emerald-400' : passRate >= 45 ? 'text-amber-400' : 'text-[#FC3154]';
              const drops = DUNGEON_RESOURCE_DROPS[dungeon.id] ?? [];
              const imgSrc = DUNGEON_IMG[dungeon.id];

              return (
                <div key={dungeon.id}
                  className={`rounded-lg border overflow-hidden transition-all ${
                    isSel
                      ? 'border-[#FC3154]/50'
                      : 'border-[rgba(255,255,255,0.07)] hover:border-[rgba(255,255,255,0.13)]'
                  } bg-[#13131a]`}>
                  <div className="flex items-stretch h-[72px] sm:h-[88px]">

                    {/* Thumbnail */}
                    <div className={`w-20 sm:w-[260px] shrink-0 relative overflow-hidden bg-gradient-to-br ${DUNGEON_FALLBACK[dungeon.id] ?? 'from-[#1a1a26] to-[#0a0a12]'}`}>
                      {imgSrc && (
                        <img src={imgSrc} alt={dungeon.name}
                          className="absolute inset-0 w-full h-full object-cover"
                          onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
                        />
                      )}
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent to-[#13131a]/60" />
                    </div>

                    {/* Name + subtitle + drops */}
                    <div className="flex-1 flex flex-col justify-center px-4 min-w-0 gap-0.5">
                      <div className="flex items-center gap-2">
                        <p className="text-slate-100 font-bold text-[15px] uppercase tracking-wide leading-tight truncate">
                          {dungeon.name}
                        </p>
                        {dungeonSavedFloor > 0 && (
                          <span className="text-[9px] text-[#555565] border border-[rgba(255,255,255,0.08)] px-1.5 py-0.5 rounded shrink-0">
                            Fl.{dungeonSavedFloor + 1}
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-[#4a4a58] uppercase tracking-widest">
                        {DUNGEON_SUBTITLE[dungeon.id]}
                      </p>
                      {drops.length > 0 && (
                        <div className="flex items-center gap-1.5 mt-1">
                          {drops.map(drop => {
                            const res = getResource(drop.resourceId);
                            return res ? (
                              <span key={drop.resourceId} className="text-[11px]" title={`${res.name} ${Math.round(drop.chance * 100)}%`}>
                                {res.icon}
                              </span>
                            ) : null;
                          })}
                        </div>
                      )}
                    </div>

                    {/* Pass Rate — hidden on mobile */}
                    <div className="hidden sm:flex items-center gap-6 px-5 sm:px-7 shrink-0">
                      <div className="text-center">
                        <p className="text-[9px] text-[#3a3a48] uppercase tracking-widest whitespace-nowrap">Pass Rate</p>
                        <p className={`text-base font-bold mt-1 ${passColor}`}>{passRate}%</p>
                        <p className="text-[8px] text-[#30303a] mt-0.5">Fl.{dungeonStartFloor}</p>
                      </div>
                    </div>

                    {/* ENTER button */}
                    <div className="flex items-center px-3 sm:px-4 shrink-0">
                      <button
                        onClick={() => { setSelectedDungeon(dungeon.id); setError(null); }}
                        disabled={!isIdle}
                        className={`px-4 sm:px-5 py-3 rounded-lg font-bold text-sm uppercase tracking-widest transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
                          isSel ? 'bg-[#FC3154] text-white' : 'bg-[#FC3154] hover:bg-[#FC3154] text-white'
                        }`}>
                        {isSel ? '✓' : 'Enter'}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}

            {lockedDungeons.map((dungeon) => {
              const c = dungeon.unlockCondition;
              const hint = c.minTier1Clears ? `${state.tier1Clears}/${c.minTier1Clears} tier 1 runs`
                : c.minGearScore ? `GS ${character.gearScore}/${c.minGearScore}`
                : c.minLevel ? `Lv. ${character.level}/${c.minLevel}` : '';
              return (
                <div key={dungeon.id}
                  className="rounded-xl border border-[rgba(255,255,255,0.04)] bg-[#111118] opacity-40 overflow-hidden">
                  <div className="flex items-stretch">
                    <div className={`w-32 shrink-0 bg-gradient-to-br ${DUNGEON_FALLBACK[dungeon.id] ?? 'from-[#1a1a26] to-[#0a0a12]'} opacity-30 min-h-[90px]`} />
                    <div className="flex-1 flex flex-col justify-center gap-1 px-4 py-3">
                      <p className="text-[#505060] font-bold text-base uppercase tracking-wide">🔒 {dungeon.name}</p>
                      <p className="text-[11px] text-[#383840] uppercase tracking-wide">{DUNGEON_SUBTITLE[dungeon.id]}</p>
                      <p className="text-[10px] text-[#404048] mt-0.5">{hint}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── RIGHT: character panel (desktop only) ── */}
      <div className="hidden md:flex w-full md:w-72 md:flex-shrink-0 flex-col gap-2.5">

        {/* Portrait */}
        <div className="rounded-xl border border-[rgba(255,255,255,0.08)] overflow-hidden">
          <div className="relative h-52 bg-gradient-to-br from-[#1a1a26] via-[#12121e] to-[#0b0b0f] overflow-hidden">
            <img src="/icons/character_portrait.png" alt="portrait"
              className="absolute inset-0 w-full h-full object-cover object-top" />
            <div className="absolute inset-0 bg-gradient-to-t from-[#111118] via-[#111118]/30 to-transparent" />
            {/* Level badge */}
            <div className="absolute top-2.5 right-2.5 bg-[#0b0b0f]/80 border border-[rgba(200,80,80,0.3)] rounded-lg px-2 py-1 backdrop-blur-sm">
              <span className="text-[10px] text-[#78788a] uppercase tracking-wide">Lv.</span>
              <span className="text-slate-100 font-black text-sm ml-1">{character.level}</span>
            </div>
            {/* Name overlay */}
            <div className="absolute bottom-0 left-0 right-0 p-3">
              <div className="flex items-end justify-between">
                <div>
                  <p className="text-slate-100 font-black text-lg leading-tight tracking-wide">{character.name}</p>
                  <p className="text-[11px] text-[#78788a] mt-0.5">Wanderer</p>
                </div>
                <span className={`text-xs font-bold px-2 py-1 rounded-lg border ${
                  character.status === 'on_run'
                    ? 'text-blue-400 border-blue-800/40 bg-blue-950/40'
                    : character.status === 'injured'
                    ? 'text-[#FC3154] border-red-800/40 bg-red-950/40'
                    : 'text-emerald-400 border-emerald-800/40 bg-emerald-950/40'
                }`}>
                  {character.status === 'on_run' ? '● Away' :
                   character.status === 'injured' ? '✖ Hurt' : '● Idle'}
                </span>
              </div>
            </div>
          </div>

          {/* CR + GS */}
          <div className="grid grid-cols-2 divide-x divide-[rgba(255,255,255,0.06)] bg-[#111118] border-t border-[rgba(255,255,255,0.07)]">
            {([['Combat Rating', cr], ['Gear Score', character.gearScore]] as [string, number][]).map(([label, value]) => (
              <div key={label} className="px-3 py-2.5 text-center">
                <p className="text-[9px] text-[#505058] uppercase tracking-widest">{label}</p>
                <p className="text-slate-100 font-black text-lg leading-tight mt-0.5">{value}</p>
              </div>
            ))}
          </div>

          {/* Stats */}
          <div className="grid grid-cols-5 divide-x divide-[rgba(255,255,255,0.04)] bg-[#110808] border-t border-[rgba(255,255,255,0.05)]">
            {(['pwr', 'end', 'lck', 'spd', 'ins'] as const).map(stat => (
              <div key={stat} className="py-2 text-center">
                <p className="text-[9px] text-[#404048] uppercase tracking-wide">{STAT_LABEL[stat]}</p>
                <p className="text-slate-300 font-bold text-sm mt-0.5">{character[stat]}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Equipment */}
        <div className="rounded-xl border border-[rgba(255,255,255,0.07)] bg-[#0e0e14] p-3">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs text-[#d4294a] font-bold uppercase tracking-widest">Equipment</p>
            <p className="text-[9px] text-[#404048] uppercase tracking-widest">Set Bonus</p>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {SLOTS.map(slot => {
              const item = equipment[slot];
              const attRuns = item?.attunementRuns ?? 0;
              const attNeeded = item?.gearTier && item.gearTier < 4 ? [5,10,15][item.gearTier - 1] : 3;
              const dots = 3;
              const filledDots = item ? Math.min(dots, Math.floor((attRuns / attNeeded) * dots)) : 0;
              return (
                <div key={slot}
                  className={`relative h-24 rounded-lg flex flex-col items-center justify-center overflow-hidden ${
                    item ? 'bg-[#1a1a26]' : 'bg-[#130808]'
                  }`}>
                  {/* Corner brackets */}
                  <span className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-[#d4294a]/60 rounded-tl" />
                  <span className="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 border-[#d4294a]/60 rounded-tr" />
                  <span className="absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2 border-[#d4294a]/60 rounded-bl" />
                  <span className="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 border-[#d4294a]/60 rounded-br" />
                  {/* Slot label */}
                  <span className="absolute top-1.5 left-2 text-[8px] text-[#4e4e58] uppercase tracking-wide font-semibold leading-none">
                    {SLOT_LABEL[slot]}
                  </span>
                  {/* Item or ghost */}
                  {item ? (
                    <img src={`/icons/items/item_${slot}_${item.rarity}.png`} alt={item.name}
                      className="absolute inset-0 w-full h-full object-cover scale-95" />
                  ) : (
                    <img src={`/icons/items/slot_${slot}.png`} alt={slot}
                      className="w-9 h-9 object-contain opacity-10" />
                  )}
                  {/* Attunement / progress dots */}
                  <div className="absolute bottom-1.5 flex gap-1">
                    {Array.from({ length: dots }).map((_, i) => (
                      <span key={i} className={`w-1 h-1 rounded-full ${
                        i < filledDots ? 'bg-[#FC3154]' : 'bg-[#1e1e28]'
                      }`} />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
          <button
            onClick={() => onNavigate?.('inventory')}
            className="w-full mt-3 py-2.5 rounded-lg bg-red-900/30 border border-red-800/40 hover:bg-red-900/50 hover:border-[#d4294a]/60 text-[#FC3154] hover:text-red-200 text-xs font-bold uppercase tracking-widest transition-all">
            View Inventory
          </button>
        </div>

        {/* Floor picker + SEND */}
        {selected && !isInjured ? (
          <div className="rounded-xl border border-[rgba(200,80,80,0.2)] bg-[#16161f] p-3 flex flex-col gap-3">
            <div>
              <p className="text-[10px] text-[#606068] uppercase tracking-[0.2em] mb-0.5">Selected</p>
              <p className="text-slate-200 font-semibold text-sm">{selected.name}</p>
              {savedFloor > 0 && (
                <p className="text-[11px] text-[#FC3154]/60 mt-0.5">Checkpoint: Floor {savedFloor}</p>
              )}
            </div>

            <div>
              <p className="text-[10px] text-[#606068] uppercase tracking-[0.2em] mb-2">Floor Depth</p>
              <div className="grid grid-cols-5 gap-1.5">
                {[1,2,3,4,5,6,7,8,9,10].map(n => (
                  <button key={n} onClick={() => setFloorsToAttempt(n)}
                    className={`aspect-square rounded-lg text-xs font-bold border transition-all ${
                      floorsToAttempt === n
                        ? 'border-[#FC3154]/60 bg-red-900/40 text-red-200'
                        : 'border-[rgba(255,255,255,0.07)] bg-transparent text-[#606068] hover:border-[rgba(200,80,80,0.3)] hover:text-slate-300'
                    }`}>
                    {n}
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-[#0e0e14] rounded-lg px-3 py-2.5 space-y-1.5">
              <div className="flex justify-between text-[11px]">
                <span className="text-[#505058]">Floors</span>
                <span className="text-slate-300 font-semibold">{startFloor}{startFloor !== endFloor ? `–${endFloor}` : ''}</span>
              </div>
              <div className="flex justify-between text-[11px]">
                <span className="text-[#505058]">Duration</span>
                <span className="text-slate-300 font-semibold">~{estimatedDuration} min</span>
              </div>
              <div className="flex justify-between text-[11px]">
                <span className="text-[#505058]">Pass rate</span>
                <span className={`font-bold ${oddsColor(firstFloorOdds)}`}>~{firstFloorOdds}%</span>
              </div>
              {startFloor !== endFloor && (
                <div className="flex justify-between text-[11px]">
                  <span className="text-[#505058]">Last floor DC</span>
                  <span className="text-slate-400 font-semibold">{lastFloorDC}</span>
                </div>
              )}
              {bossFloors.length > 0 && (
                <div className="pt-1.5 border-t border-[rgba(255,255,255,0.05)]">
                  {bossFloors.map(f => (
                    <p key={f} className="text-amber-400/70 text-[10px]">⚠ Floor {f}: Boss</p>
                  ))}
                </div>
              )}
            </div>

            {/* Resource drops */}
            {(() => {
              const selDrops = DUNGEON_RESOURCE_DROPS[selected.id] ?? [];
              if (selDrops.length === 0) return null;
              return (
                <div className="bg-[#0e0e14] rounded-lg px-3 py-2.5">
                  <p className="text-[9px] text-[#404048] uppercase tracking-widest mb-2">Possible Drops</p>
                  <div className="space-y-1.5">
                    {selDrops.map(drop => {
                      const res = getResource(drop.resourceId);
                      if (!res) return null;
                      const chance = Math.round(drop.chance * 100);
                      const chanceColor = chance >= 40 ? 'text-emerald-400' : chance >= 15 ? 'text-amber-400' : 'text-[#505060]';
                      return (
                        <div key={drop.resourceId} className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-sm">{res.icon}</span>
                            <span className="text-[11px] text-slate-300">{res.name}</span>
                          </div>
                          <div className="flex items-center gap-2 text-[11px]">
                            <span className="text-[#404048]">{drop.minQty}–{drop.maxQty}</span>
                            <span className={`font-bold ${chanceColor}`}>{chance}%</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })()}

            {error && (
              <p className="text-[#FC3154] text-xs bg-red-950/30 border border-red-900/30 rounded-lg px-3 py-2">{error}</p>
            )}

            <button onClick={handleSend} disabled={!isIdle || loading}
              className="w-full py-3 bg-gradient-to-r from-[#d4294a] to-[#d4294a] hover:from-[#FC3154] hover:to-[#e02a49] disabled:from-[#1a1a26] disabled:to-[#1a1a26] disabled:text-[#505058] text-white font-bold rounded-xl transition-all text-sm tracking-widest uppercase shadow-lg shadow-[#1a0510]/40">
              {loading ? 'Sending...' : 'Send Hero →'}
            </button>
          </div>
        ) : !isInjured ? (
          <div className="rounded-xl border border-[rgba(255,255,255,0.05)] bg-[#0e0e14] p-4 text-center">
            <p className="text-[#404048] text-sm">← Select a dungeon to begin</p>
          </div>
        ) : null}
      </div>
    </div>
  );
}
