'use client';
import { useState } from 'react';
import type { GameState } from '@/types/game';
import { DUNGEONS } from '@/lib/data/dungeons';
import { RunTimer } from './RunTimer';

interface Props {
  state: GameState;
  onRunStart: (run: GameState['activeRun']) => void;
  onRunComplete: () => void;
  onRefresh: () => void;
}

const TIER_COLORS = ['', 'from-slate-700 to-slate-600', 'from-indigo-800 to-blue-700', 'from-violet-800 to-purple-700', 'from-rose-900 to-red-800'];
const TIER_LABELS = ['', 'Tier I', 'Tier II', 'Tier III', 'Tier IV'];

export function AdventureTab({ state, onRunStart, onRunComplete }: Props) {
  const [selectedDungeon, setSelectedDungeon] = useState<string | null>(null);
  const [floorsToAttempt, setFloorsToAttempt] = useState<number>(3);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { character, activeRun, unlockedDungeons, savedFloors } = state;
  const isIdle = character.status === 'idle';
  const isInjured = character.status === 'injured';

  // ── Active run: show full-screen animated timer ──
  if (activeRun) {
    return <RunTimer run={activeRun} onComplete={onRunComplete} />;
  }

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

  // Floor-based computations
  const savedFloor = selected ? (savedFloors?.[selected.id] ?? 0) : 0;
  const startFloor = savedFloor + 1;
  const endFloor = startFloor + floorsToAttempt - 1;

  // DC for the first floor of this run
  const firstFloorDC = selected ? Math.round(selected.baseDC + (startFloor - 1) * selected.floorDCStep) : 0;
  const lastFloorDC = selected ? Math.round(selected.baseDC + (endFloor - 1) * selected.floorDCStep) : 0;
  const successAt = firstFloorDC + 51;
  const firstFloorOdds = selected ? Math.min(95, Math.max(5, Math.round(((cr - firstFloorDC + 50) / 100) * 100))) : 0;

  // Duration estimate
  const spdReduction = Math.min(character.spd * 0.02, 0.4);
  const estimatedDuration = Math.max(1, Math.round(floorsToAttempt * 2 * (1 - spdReduction)));

  // Check if any floor in the range is a boss (multiple of 10)
  const bossFloors: number[] = [];
  for (let f = startFloor; f <= endFloor; f++) {
    if (f % 10 === 0) bossFloors.push(f);
  }

  return (
    <div className="flex gap-6 h-full">
      {/* LEFT: dungeon list */}
      <div className="flex-1 flex flex-col gap-4 overflow-y-auto pr-1">
        <p className="text-[11px] text-[#6060a0] uppercase tracking-widest flex items-center gap-2">
          <span className="text-purple-500">◆</span> Available Dungeons
        </p>

        {isInjured && character.injuredUntil ? (
          <div className="bg-[#14142a] border border-red-700/30 rounded-xl p-6 text-center">
            <span className="text-4xl">🩹</span>
            <p className="text-red-400 font-semibold mt-3">Hero is Injured</p>
            <p className="text-red-400/60 text-sm mt-1">
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
              return (
                <button key={dungeon.id} onClick={() => setSelectedDungeon(dungeon.id)}
                  className={`w-full text-left rounded-xl border transition-all overflow-hidden ${
                    isSel ? 'border-violet-500/50 bg-[#1a1a35]'
                      : 'border-[rgba(120,110,200,0.15)] bg-[#14142a] hover:bg-[#1a1a30] hover:border-[rgba(120,110,200,0.25)]'
                  }`}>
                  <div className={`h-0.5 bg-gradient-to-r ${TIER_COLORS[dungeon.tier]}`} />
                  <div className="p-4 flex items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-slate-100 font-semibold">{dungeon.name}</span>
                        <span className="text-[10px] text-[#6060a0] bg-[#0f0f22] px-1.5 py-0.5 rounded">{TIER_LABELS[dungeon.tier]}</span>
                        {dungeonSavedFloor > 0 && (
                          <span className="text-[10px] text-violet-400 bg-violet-900/30 border border-violet-700/30 px-1.5 py-0.5 rounded">
                            Fl.{dungeonSavedFloor + 1}
                          </span>
                        )}
                      </div>
                      <p className="text-[12px] text-[#7070a0] truncate">{dungeon.lootFocus}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-[#8080a0] text-xs">Fl.{dungeonStartFloor}</p>
                      <p className={`text-sm font-bold ${odds >= 70 ? 'text-emerald-400' : odds >= 45 ? 'text-amber-400' : 'text-red-400'}`}>
                        ~{odds}%
                      </p>
                    </div>
                  </div>
                </button>
              );
            })}

            {lockedDungeons.map((dungeon) => {
              const c = dungeon.unlockCondition;
              const hint = c.minTier1Clears ? `${state.tier1Clears}/${c.minTier1Clears} tier 1 runs`
                : c.minGearScore ? `GS ${character.gearScore}/${c.minGearScore}`
                : c.minLevel ? `Level ${character.level}/${c.minLevel}` : '';
              return (
                <div key={dungeon.id}
                  className="rounded-xl border border-[rgba(120,110,200,0.08)] bg-[#0f0f1e] opacity-50 overflow-hidden">
                  <div className={`h-0.5 bg-gradient-to-r ${TIER_COLORS[dungeon.tier]} opacity-40`} />
                  <div className="p-4 flex items-center justify-between">
                    <div>
                      <span className="text-[#6060a0] font-medium">🔒 {dungeon.name}</span>
                      <p className="text-[11px] text-[#4040a0] mt-0.5">{hint}</p>
                    </div>
                    <span className="text-[#4040a0] text-xs">{TIER_LABELS[dungeon.tier]}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* RIGHT: dungeon detail + send */}
      <div className="w-80 flex-shrink-0 flex flex-col gap-4">
        {selected && !isInjured ? (
          <>
            <div className="bg-[#14142a] border border-[rgba(120,110,200,0.2)] rounded-xl overflow-hidden">
              <div className={`h-24 bg-gradient-to-br ${TIER_COLORS[selected.tier]} flex items-end p-4`}>
                <div>
                  <p className="text-white/60 text-xs">{TIER_LABELS[selected.tier]}</p>
                  <h3 className="text-white font-bold text-lg">{selected.name}</h3>
                  {savedFloor > 0 && (
                    <p className="text-white/50 text-xs mt-0.5">Checkpoint: Floor {savedFloor}</p>
                  )}
                </div>
              </div>
              <div className="p-4">
                <p className="text-[#8080b0] text-sm mb-4">{selected.description}</p>

                {/* Floor range info */}
                <div className="bg-[#0f0f22] rounded-lg p-3 mb-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[#6060a0] text-xs">Floor Range</span>
                    <span className="text-slate-200 font-bold text-sm">
                      {startFloor === endFloor ? `Floor ${startFloor}` : `Floors ${startFloor}–${endFloor}`}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[#6060a0] text-xs">DC Range</span>
                    <span className="text-slate-300 text-xs">
                      {startFloor === endFloor ? firstFloorDC : `${firstFloorDC}–${lastFloorDC}`}
                    </span>
                  </div>
                  {savedFloor > 0 ? (
                    <p className="text-violet-400/70 text-[11px] mt-1.5">Starting from saved floor {startFloor}</p>
                  ) : (
                    <p className="text-[#5050a0] text-[11px] mt-1.5">Starting from Floor 1</p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  {[
                    { label: 'Duration', value: `~${estimatedDuration} min` },
                    { label: 'Your CR', value: String(cr) },
                    { label: 'Floor 1 Odds', value: `~${firstFloorOdds}%`, color: firstFloorOdds >= 70 ? 'text-emerald-400' : firstFloorOdds >= 45 ? 'text-amber-400' : 'text-red-400' },
                    { label: 'Entry DC', value: String(firstFloorDC) },
                  ].map(({ label, value, color }) => (
                    <div key={label} className="bg-[#0f0f22] rounded-lg p-2.5">
                      <p className="text-[#6060a0]">{label}</p>
                      <p className={`font-bold mt-0.5 ${color ?? 'text-slate-200'}`}>{value}</p>
                    </div>
                  ))}
                </div>

                {bossFloors.length > 0 && (
                  <div className="mt-3 bg-amber-900/20 border border-amber-700/30 rounded-lg p-2.5">
                    {bossFloors.map(f => (
                      <p key={f} className="text-amber-400 text-[11px] font-semibold">
                        ⚠ Floor {f}: {selected.bossTitle} (Boss)
                      </p>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Floor depth selector */}
            <div className="bg-[#14142a] border border-[rgba(120,110,200,0.2)] rounded-xl p-4">
              <p className="text-[11px] text-[#6060a0] uppercase tracking-widest mb-3">Floor Depth</p>
              <div className="grid grid-cols-5 gap-1.5 mb-2">
                {[1,2,3,4,5,6,7,8,9,10].map((n) => (
                  <button
                    key={n}
                    onClick={() => setFloorsToAttempt(n)}
                    className={`aspect-square rounded-lg text-xs font-bold border transition-all ${
                      floorsToAttempt === n
                        ? 'border-violet-500/60 bg-violet-900/40 text-violet-200'
                        : 'border-[rgba(120,110,200,0.15)] bg-transparent text-[#7070a0] hover:border-[rgba(120,110,200,0.35)] hover:text-slate-300'
                    }`}>
                    {n}
                  </button>
                ))}
              </div>
              <p className="text-[11px] text-[#6060a0] leading-relaxed">
                {floorsToAttempt} floor{floorsToAttempt > 1 ? 's' : ''} · ~{estimatedDuration} min · deeper floors get harder
                {endFloor > startFloor && (
                  <span className="text-amber-400/70"> · last floor DC {lastFloorDC}</span>
                )}
              </p>
            </div>

            {error && (
              <div className="bg-red-950/30 border border-red-700/30 rounded-xl p-3 text-red-400 text-sm">{error}</div>
            )}

            <button onClick={handleSend} disabled={!isIdle || loading}
              className="w-full py-4 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 disabled:from-slate-700 disabled:to-slate-700 disabled:text-slate-500 text-white font-bold rounded-xl transition-all text-base tracking-wide shadow-lg shadow-purple-900/30">
              {loading ? 'Sending...' : 'SEND HERO →'}
            </button>
          </>
        ) : (
          <div className="bg-[#14142a] border border-[rgba(120,110,200,0.15)] rounded-xl p-6 text-center text-[#5050a0]">
            <p className="text-sm">
              {isInjured ? 'Hero is recovering' : '← Select a dungeon to begin'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
