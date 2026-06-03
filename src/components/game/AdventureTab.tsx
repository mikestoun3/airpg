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
  goblin_warrens:    '/dungeons/goblin_warrens.mp4',
  forgotten_cellar:  '/dungeons/forgotten_cellar.mp4',
  ruined_watchtower: '/dungeons/ruined_watchtower.mp4',
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
  forgotten_cellar:  'Spatial Anomaly Zone',
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
  const [partyIds, setPartyIds] = useState<string[]>(() =>
    state.allCharacters.filter(c => c.status === 'idle').map(c => c.id)
  );

  const { character, equipment, activeRun, unlockedDungeons, savedFloors } = state;

  // If ANY roster member is on a run, show timer
  const onRun = activeRun ?? null;
  if (onRun) return <RunTimer run={onRun} onComplete={onRunComplete} />;

  // Party can only include idle characters
  const idleChars = state.allCharacters.filter(c => c.status === 'idle');
  const effectiveParty = partyIds.filter(id => idleChars.some(c => c.id === id));
  if (effectiveParty.length === 0 && idleChars.length > 0) {
    // Auto-select all idle
  }
  const activeParty = effectiveParty.length > 0 ? effectiveParty : idleChars.map(c => c.id);

  const allInjured = state.allCharacters.every(c => c.status === 'injured');
  const isIdle = idleChars.length > 0;
  const isInjured = !isIdle;

  const toggleMember = (id: string) => {
    setPartyIds(prev => {
      if (prev.includes(id)) {
        // Must keep at least 1
        if (prev.length <= 1) return prev;
        return prev.filter(p => p !== id);
      }
      return [...prev, id];
    });
  };

  const handleSend = async () => {
    if (!selectedDungeon || activeParty.length === 0) return;
    setLoading(true); setError(null);
    const res = await fetch('/api/run/start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dungeonId: selectedDungeon, floorsToAttempt, partyIds: activeParty }),
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
  const partyLabel = `Send Party (${activeParty.length})`;

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

  // Expected drops: for each floor, P(reach it) = product of all prior pass rates
  // P(not fail floor i) = min(1, max(0, (CR - DC_i + 70) / 100))
  const expectedDrops: Record<string, number> = {};
  if (selected) {
    let cumProb = 1;
    for (let i = 0; i < floorsToAttempt; i++) {
      const floor = startFloor + i;
      const dc = Math.round(selected.baseDC + (floor - 1) * selected.floorDCStep);
      const passProb = Math.min(1, Math.max(0, (cr - dc + 70) / 100));
      cumProb *= passProb;
      const drops = DUNGEON_RESOURCE_DROPS[selected.id] ?? [];
      for (const drop of drops) {
        const avgQty = (drop.minQty + drop.maxQty) / 2;
        expectedDrops[drop.resourceId] = (expectedDrops[drop.resourceId] ?? 0) + cumProb * drop.chance * avgQty;
      }
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
            {loading ? 'Sending...' : `${partyLabel} → ${floorsToAttempt} floor${floorsToAttempt > 1 ? 's' : ''}`}
          </button>
        </div>
      )}

      {/* ── LEFT: dungeon list ── */}
      <div className="flex-1 flex flex-col gap-3 md:overflow-y-auto md:pr-1 pb-36 md:pb-0">
        <p className="text-xs font-bold uppercase tracking-[0.25em] text-[#FC3154]"
          style={{ textShadow: '0 0 10px rgba(252,49,84,0.6), 0 0 20px rgba(252,49,84,0.3)' }}>
          Available Dungeons
        </p>

        {allInjured && character.injuredUntil ? (
          <div className="bg-[#16161f] border border-red-900/40 rounded-xl p-6 text-center">
            <span className="text-3xl">🩹</span>
            <p className="text-[#FC3154] font-semibold mt-3">Party is Injured</p>
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
                        imgSrc.endsWith('.mp4')
                          ? <video src={imgSrc} autoPlay loop muted playsInline
                              className="absolute inset-0 w-full h-full object-cover" />
                          : <img src={imgSrc} alt={dungeon.name}
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
                              <img key={drop.resourceId} src={res.sprite} alt={res.name}
                                className="w-5 h-5 object-contain" title={`${res.name} ${Math.round(drop.chance * 100)}%`} />
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

      {/* ── RIGHT: party + dungeon detail (desktop only) ── */}
      <div className="hidden md:flex w-full md:w-72 md:flex-shrink-0 flex-col gap-2.5 md:overflow-y-auto md:pb-2">

        {/* Party selector */}
        <div className="rounded-xl border border-[rgba(255,255,255,0.08)] bg-[#111118] overflow-hidden">
          <div className="px-3 pt-3 pb-2 flex items-center justify-between">
            <p className="text-[10px] text-[#505058] uppercase tracking-widest font-bold">Party</p>
            <p className="text-[10px] text-[#404048]">{activeParty.length} / {state.allCharacters.length} selected</p>
          </div>
          <div className="flex gap-2 px-3 pb-3">
            {state.allCharacters.map((c) => {
              const inParty = partyIds.includes(c.id) || (effectiveParty.length === 0);
              const isUnavailable = c.status !== 'idle';
              const classColor = c.charClass === 'assassin' ? '#a855f7' : c.charClass === 'mage' ? '#06b6d4' : '#ef4444';
              const portrait = c.charClass === 'assassin' ? '/icons/character_portrait_female.png'
                : c.charClass === 'mage' ? '/icons/character_portrait_mage.png'
                : '/icons/character_portrait.png';
              const statusDot = c.status === 'on_run' ? '#60a5fa' : c.status === 'injured' ? '#FC3154' : '#4ade80';
              return (
                <button key={c.id} onClick={() => !isUnavailable && toggleMember(c.id)}
                  disabled={isUnavailable}
                  title={`${c.name} · Lv.${c.level} · ${c.status}`}
                  className={`relative flex-1 rounded-xl overflow-hidden border-2 transition-all ${
                    isUnavailable ? 'opacity-30 cursor-not-allowed' :
                    (partyIds.includes(c.id) || effectiveParty.length === 0 && idleChars.includes(c))
                      ? 'shadow-md' : 'opacity-45 hover:opacity-65 border-[rgba(255,255,255,0.1)]'
                  }`}
                  style={(partyIds.includes(c.id) || effectiveParty.length === 0 && idleChars.includes(c)) && !isUnavailable
                    ? { borderColor: classColor } : {}}>
                  <img src={portrait} alt={c.charClass} className="w-full h-20 object-cover object-top" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/75 to-transparent" />
                  <div className="absolute top-1 right-1 w-2.5 h-2.5 rounded-full border border-black/50"
                    style={{ background: statusDot }} />
                  <div className="absolute bottom-1 left-0 right-0 text-center">
                    <p className="text-[9px] font-bold uppercase tracking-wider"
                      style={{ color: classColor }}>{c.charClass === 'warrior' ? 'War' : c.charClass === 'assassin' ? 'Sin' : 'Mag'}</p>
                    <p className="text-[8px] text-white/60 leading-none">Lv.{c.level}</p>
                  </div>
                  {/* Check mark */}
                  {(partyIds.includes(c.id) || effectiveParty.length === 0 && idleChars.includes(c)) && !isUnavailable && (
                    <div className="absolute top-1 left-1 w-4 h-4 rounded-full flex items-center justify-center"
                      style={{ background: classColor }}>
                      <span className="text-white text-[8px] font-black">✓</span>
                    </div>
                  )}
                </button>
              );
            })}
          </div>
          <div className="grid grid-cols-2 divide-x divide-[rgba(255,255,255,0.06)] border-t border-[rgba(255,255,255,0.06)]">
            <div className="px-3 py-2 text-center">
              <p className="text-[9px] text-[#505058] uppercase tracking-widest">Party GS</p>
              <p className="text-slate-100 font-black text-base mt-0.5">
                {state.allCharacters.filter(c => activeParty.includes(c.id)).reduce((s, c) => s + c.gearScore, 0)}
              </p>
            </div>
            <div className="px-3 py-2 text-center">
              <p className="text-[9px] text-[#505058] uppercase tracking-widest">Party CR</p>
              <p className="text-slate-100 font-black text-base mt-0.5">
                {state.allCharacters.filter(c => activeParty.includes(c.id)).reduce((s, c) => s + c.combatRating, 0)}
              </p>
            </div>
          </div>
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
              const firstDC = Math.round(selected.baseDC + (startFloor - 1) * selected.floorDCStep);
              const firstPassProb = Math.max(0, (cr - firstDC + 70) / 100);
              const tooHard = firstPassProb === 0;
              const minCR = firstDC - 70 + 1;
              return (
                <div className="bg-[#0e0e14] rounded-lg px-3 py-2.5">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-[9px] text-[#404048] uppercase tracking-widest">Possible Drops</p>
                    <p className="text-[9px] text-[#404048] uppercase tracking-widest">
                      {tooHard ? 'Per floor' : '~Expected'}
                    </p>
                  </div>
                  {tooHard && (
                    <p className="text-[10px] text-amber-400/70 mb-2">
                      ⚠ Floor {startFloor} needs CR {minCR} — showing base rates
                    </p>
                  )}
                  <div className="space-y-1.5">
                    {selDrops.map(drop => {
                      const res = getResource(drop.resourceId);
                      if (!res) return null;
                      const chance = Math.round(drop.chance * 100);
                      const chanceColor = chance >= 40 ? 'text-emerald-400' : chance >= 15 ? 'text-amber-400' : 'text-[#505060]';
                      const exp = expectedDrops[drop.resourceId] ?? 0;
                      const baseExp = drop.chance * (drop.minQty + drop.maxQty) / 2;
                      const displayVal = tooHard
                        ? `~${baseExp.toFixed(1)}`
                        : exp < 0.1 ? '<0.1' : `~${exp.toFixed(1)}`;
                      return (
                        <div key={drop.resourceId} className="flex items-center justify-between">
                          <div className="flex items-center gap-2 min-w-0">
                            <img src={res.sprite} alt={res.name} className="w-6 h-6 object-contain shrink-0" />
                            <span className="text-[11px] text-slate-300 truncate">{res.name}</span>
                            <span className="text-[10px] text-[#404048] shrink-0">{drop.minQty}–{drop.maxQty} · <span className={chanceColor}>{chance}%</span></span>
                          </div>
                          <span className={`text-[11px] font-bold shrink-0 ml-2 ${tooHard ? 'text-[#505060]' : 'text-slate-200'}`}>{displayVal}</span>
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

            <button onClick={handleSend} disabled={!isIdle || loading || activeParty.length === 0}
              className="w-full py-3 bg-gradient-to-r from-[#d4294a] to-[#d4294a] hover:from-[#FC3154] hover:to-[#e02a49] disabled:from-[#1a1a26] disabled:to-[#1a1a26] disabled:text-[#505058] text-white font-bold rounded-xl transition-all text-sm tracking-widest uppercase shadow-lg shadow-[#1a0510]/40">
              {loading ? 'Sending...' : `${partyLabel} →`}
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
