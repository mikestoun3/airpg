'use client';
import { useState } from 'react';
import type { GameState, EquipmentSlot } from '@/types/game';
import { DUNGEONS } from '@/lib/data/dungeons';
import { RARITY_COLORS } from '@/types/game';
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
  bandit_stronghold: 'from-[#200808] via-[#160606] to-[#100404]',
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
  return o >= 70 ? 'text-emerald-400' : o >= 45 ? 'text-amber-400' : 'text-red-400';
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
  const firstFloorOdds = selected ? Math.min(95, Math.max(5, Math.round(((cr - firstFloorDC + 50) / 100) * 100))) : 0;
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

      {/* ── LEFT: dungeon list ── */}
      <div className="flex-1 flex flex-col gap-3 md:overflow-y-auto md:pr-1">
        <p className="text-[10px] text-[#7a5050] uppercase tracking-[0.2em] flex items-center gap-2">
          <span className="w-1 h-1 rounded-full bg-red-700 inline-block" />
          Available Dungeons
        </p>

        {isInjured && character.injuredUntil ? (
          <div className="bg-[#160c0c] border border-red-900/40 rounded-xl p-6 text-center">
            <span className="text-3xl">🩹</span>
            <p className="text-red-400 font-semibold mt-3">Hero is Injured</p>
            <p className="text-red-400/50 text-sm mt-1">
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
              const odds = Math.min(95, Math.max(5, Math.round(((cr - floorDC + 50) / 100) * 100)));
              const imgSrc = DUNGEON_IMG[dungeon.id];

              return (
                <div key={dungeon.id}
                  className={`rounded-xl border overflow-hidden transition-all ${
                    isSel
                      ? 'border-red-700/50 bg-[#1c0c0c]'
                      : 'border-[rgba(200,80,80,0.12)] bg-[#160c0c] hover:border-[rgba(200,80,80,0.25)] hover:bg-[#190e0e]'
                  }`}>
                  <div className="flex items-stretch">
                    {/* Thumbnail */}
                    <div className={`w-28 min-h-[96px] shrink-0 relative overflow-hidden bg-gradient-to-br ${DUNGEON_FALLBACK[dungeon.id] ?? 'from-[#1a0a0a] to-[#0d0606]'}`}>
                      {imgSrc && (
                        <img src={imgSrc} alt={dungeon.name}
                          className="absolute inset-0 w-full h-full object-cover opacity-80"
                          onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
                        />
                      )}
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent to-[#160c0c]/60" />
                      <div className="absolute bottom-1.5 left-1.5">
                        <span className={`text-[9px] font-bold uppercase tracking-wide drop-shadow ${TIER_BADGE[dungeon.tier]}`}>
                          {TIER_LABELS[dungeon.tier]}
                        </span>
                      </div>
                    </div>

                    {/* Content */}
                    <div className="flex-1 flex items-center gap-2 px-3 py-3 min-w-0">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-slate-100 font-semibold text-sm">{dungeon.name}</span>
                          {dungeonSavedFloor > 0 && (
                            <span className="text-[9px] text-red-400/70 border border-red-900/50 px-1 py-0.5 rounded">
                              Fl.{dungeonSavedFloor + 1}
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-[#6a4040] mt-0.5 truncate">
                          {DUNGEON_SUBTITLE[dungeon.id] ?? dungeon.lootFocus}
                        </p>
                      </div>

                      {/* Odds + duration */}
                      <div className="text-right shrink-0">
                        <p className={`text-sm font-bold ${oddsColor(odds)}`}>~{odds}%</p>
                        <p className="text-[10px] text-[#5a3535] mt-0.5">{dungeon.durationMinutes}m/fl</p>
                      </div>

                      {/* ENTER button */}
                      <button
                        onClick={() => { setSelectedDungeon(dungeon.id); setError(null); }}
                        disabled={!isIdle}
                        className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wide transition-all disabled:opacity-40 disabled:cursor-not-allowed ${
                          isSel
                            ? 'bg-red-700 text-white shadow-md shadow-red-950/50'
                            : 'bg-red-950/60 text-red-400 border border-red-800/40 hover:bg-red-900/70 hover:text-red-200'
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
                  className="rounded-xl border border-[rgba(200,80,80,0.07)] bg-[#110909] opacity-50 overflow-hidden">
                  <div className="flex items-stretch">
                    <div className={`w-28 min-h-[96px] shrink-0 bg-gradient-to-br ${DUNGEON_FALLBACK[dungeon.id] ?? 'from-[#140808] to-[#0a0505]'} opacity-40`} />
                    <div className="flex-1 flex items-center justify-between px-3 py-3">
                      <div>
                        <p className="text-[#5a3535] font-medium text-sm">🔒 {dungeon.name}</p>
                        <p className="text-[11px] text-[#3d2222] mt-0.5">{hint}</p>
                      </div>
                      <span className={`text-[10px] uppercase tracking-wide ${TIER_BADGE[dungeon.tier]} opacity-50`}>
                        {TIER_LABELS[dungeon.tier]}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── RIGHT: character panel ── */}
      <div className="w-full md:w-72 md:flex-shrink-0 flex flex-col gap-2.5">

        {/* Portrait */}
        <div className="rounded-xl border border-[rgba(200,80,80,0.18)] overflow-hidden">
          <div className="relative h-52 bg-gradient-to-br from-[#200a0a] via-[#160808] to-[#0e0505] overflow-hidden">
            <img src="/icons/character_portrait.png" alt="portrait"
              className="absolute inset-0 w-full h-full object-cover object-top" />
            <div className="absolute inset-0 bg-gradient-to-t from-[#140a0a] via-[#140a0a]/30 to-transparent" />
            {/* Level badge */}
            <div className="absolute top-2.5 right-2.5 bg-[#0d0808]/80 border border-[rgba(200,80,80,0.3)] rounded-lg px-2 py-1 backdrop-blur-sm">
              <span className="text-[10px] text-[#7a5050] uppercase tracking-wide">Lv.</span>
              <span className="text-slate-100 font-black text-sm ml-1">{character.level}</span>
            </div>
            {/* Name overlay */}
            <div className="absolute bottom-0 left-0 right-0 p-3">
              <div className="flex items-end justify-between">
                <div>
                  <p className="text-slate-100 font-black text-lg leading-tight tracking-wide">{character.name}</p>
                  <p className="text-[11px] text-[#7a5050] mt-0.5">Wanderer</p>
                </div>
                <span className={`text-xs font-bold px-2 py-1 rounded-lg border ${
                  character.status === 'on_run'
                    ? 'text-blue-400 border-blue-800/40 bg-blue-950/40'
                    : character.status === 'injured'
                    ? 'text-red-400 border-red-800/40 bg-red-950/40'
                    : 'text-emerald-400 border-emerald-800/40 bg-emerald-950/40'
                }`}>
                  {character.status === 'on_run' ? '● Away' :
                   character.status === 'injured' ? '✖ Hurt' : '● Idle'}
                </span>
              </div>
            </div>
          </div>

          {/* CR + GS */}
          <div className="grid grid-cols-2 divide-x divide-[rgba(200,80,80,0.10)] bg-[#140a0a] border-t border-[rgba(200,80,80,0.12)]">
            {([['Combat Rating', cr], ['Gear Score', character.gearScore]] as [string, number][]).map(([label, value]) => (
              <div key={label} className="px-3 py-2.5 text-center">
                <p className="text-[9px] text-[#5a3535] uppercase tracking-widest">{label}</p>
                <p className="text-slate-100 font-black text-lg leading-tight mt-0.5">{value}</p>
              </div>
            ))}
          </div>

          {/* Stats */}
          <div className="grid grid-cols-5 divide-x divide-[rgba(200,80,80,0.07)] bg-[#110808] border-t border-[rgba(200,80,80,0.08)]">
            {(['pwr', 'end', 'lck', 'spd', 'ins'] as const).map(stat => (
              <div key={stat} className="py-2 text-center">
                <p className="text-[9px] text-[#4a2a2a] uppercase tracking-wide">{STAT_LABEL[stat]}</p>
                <p className="text-slate-300 font-bold text-sm mt-0.5">{character[stat]}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Equipment */}
        <div className="rounded-xl border border-[rgba(200,80,80,0.14)] bg-[#120909] p-3">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs text-red-600 font-bold uppercase tracking-widest">Equipment</p>
            <p className="text-[9px] text-[#4a2a2a] uppercase tracking-widest">Set Bonus</p>
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
                    item ? 'bg-[#1c0e0e]' : 'bg-[#130808]'
                  }`}>
                  {/* Corner brackets */}
                  <span className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-red-700/60 rounded-tl" />
                  <span className="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 border-red-700/60 rounded-tr" />
                  <span className="absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2 border-red-700/60 rounded-bl" />
                  <span className="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 border-red-700/60 rounded-br" />
                  {/* Slot label */}
                  <span className="absolute top-1.5 left-2 text-[8px] text-[#5a3030] uppercase tracking-wide font-semibold leading-none">
                    {SLOT_LABEL[slot]}
                  </span>
                  {/* Item or ghost */}
                  {item ? (
                    <img src={`/icons/items/item_${slot}_${item.rarity}.png`} alt={item.name}
                      className="absolute inset-0 w-full h-full object-cover" />
                  ) : (
                    <img src={`/icons/items/slot_${slot}.png`} alt={slot}
                      className="w-9 h-9 object-contain opacity-10" />
                  )}
                  {/* Attunement / progress dots */}
                  <div className="absolute bottom-1.5 flex gap-1">
                    {Array.from({ length: dots }).map((_, i) => (
                      <span key={i} className={`w-1 h-1 rounded-full ${
                        i < filledDots ? 'bg-red-600' : 'bg-[#2a1010]'
                      }`} />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
          <button
            onClick={() => onNavigate?.('inventory')}
            className="w-full mt-3 py-2.5 rounded-lg bg-red-900/30 border border-red-800/40 hover:bg-red-900/50 hover:border-red-700/60 text-red-400 hover:text-red-200 text-xs font-bold uppercase tracking-widest transition-all">
            View Inventory
          </button>
        </div>

        {/* Floor picker + SEND */}
        {selected && !isInjured ? (
          <div className="rounded-xl border border-[rgba(200,80,80,0.2)] bg-[#160c0c] p-3 flex flex-col gap-3">
            <div>
              <p className="text-[10px] text-[#6a4040] uppercase tracking-[0.2em] mb-0.5">Selected</p>
              <p className="text-slate-200 font-semibold text-sm">{selected.name}</p>
              {savedFloor > 0 && (
                <p className="text-[11px] text-red-500/60 mt-0.5">Checkpoint: Floor {savedFloor}</p>
              )}
            </div>

            <div>
              <p className="text-[10px] text-[#6a4040] uppercase tracking-[0.2em] mb-2">Floor Depth</p>
              <div className="grid grid-cols-5 gap-1.5">
                {[1,2,3,4,5,6,7,8,9,10].map(n => (
                  <button key={n} onClick={() => setFloorsToAttempt(n)}
                    className={`aspect-square rounded-lg text-xs font-bold border transition-all ${
                      floorsToAttempt === n
                        ? 'border-red-600/60 bg-red-900/40 text-red-200'
                        : 'border-[rgba(200,80,80,0.12)] bg-transparent text-[#6a4040] hover:border-[rgba(200,80,80,0.3)] hover:text-slate-300'
                    }`}>
                    {n}
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-[#120909] rounded-lg px-3 py-2.5 space-y-1.5">
              <div className="flex justify-between text-[11px]">
                <span className="text-[#5a3535]">Floors</span>
                <span className="text-slate-300 font-semibold">{startFloor}{startFloor !== endFloor ? `–${endFloor}` : ''}</span>
              </div>
              <div className="flex justify-between text-[11px]">
                <span className="text-[#5a3535]">Duration</span>
                <span className="text-slate-300 font-semibold">~{estimatedDuration} min</span>
              </div>
              <div className="flex justify-between text-[11px]">
                <span className="text-[#5a3535]">Entry odds</span>
                <span className={`font-bold ${oddsColor(firstFloorOdds)}`}>~{firstFloorOdds}%</span>
              </div>
              {startFloor !== endFloor && (
                <div className="flex justify-between text-[11px]">
                  <span className="text-[#5a3535]">Last floor DC</span>
                  <span className="text-slate-400 font-semibold">{lastFloorDC}</span>
                </div>
              )}
              {bossFloors.length > 0 && (
                <div className="pt-1.5 border-t border-[rgba(200,80,80,0.08)]">
                  {bossFloors.map(f => (
                    <p key={f} className="text-amber-400/70 text-[10px]">⚠ Floor {f}: Boss</p>
                  ))}
                </div>
              )}
            </div>

            {error && (
              <p className="text-red-400 text-xs bg-red-950/30 border border-red-900/30 rounded-lg px-3 py-2">{error}</p>
            )}

            <button onClick={handleSend} disabled={!isIdle || loading}
              className="w-full py-3 bg-gradient-to-r from-red-700 to-rose-700 hover:from-red-600 hover:to-rose-600 disabled:from-[#2a1212] disabled:to-[#2a1212] disabled:text-[#5a3535] text-white font-bold rounded-xl transition-all text-sm tracking-widest uppercase shadow-lg shadow-red-950/40">
              {loading ? 'Sending...' : 'Send Hero →'}
            </button>
          </div>
        ) : !isInjured ? (
          <div className="rounded-xl border border-[rgba(200,80,80,0.08)] bg-[#120909] p-4 text-center">
            <p className="text-[#4a2a2a] text-sm">← Select a dungeon to begin</p>
          </div>
        ) : null}
      </div>
    </div>
  );
}
