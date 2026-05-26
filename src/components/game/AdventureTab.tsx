'use client';
import { useState } from 'react';
import type { GameState, Difficulty } from '@/types/game';
import { DUNGEONS } from '@/lib/data/dungeons';
import { DIFFICULTY_LABELS } from '@/types/game';
import { RunTimer } from './RunTimer';

interface Props {
  state: GameState;
  onRunStart: (run: GameState['activeRun']) => void;
  onRunComplete: () => void;
  onRefresh: () => void;
}

const DC_BONUS: Record<Difficulty, number> = { normal: 0, hardened: 15, nightmare: 30 };

const TIER_COLORS = ['', 'from-slate-700 to-slate-600', 'from-indigo-800 to-blue-700', 'from-violet-800 to-purple-700', 'from-rose-900 to-red-800'];
const TIER_LABELS = ['', 'Tier I', 'Tier II', 'Tier III', 'Tier IV'];

export function AdventureTab({ state, onRunStart, onRunComplete, onRefresh }: Props) {
  const [selectedDungeon, setSelectedDungeon] = useState<string | null>(null);
  const [selectedDiff, setSelectedDiff] = useState<Difficulty>('normal');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { character, activeRun, unlockedDungeons } = state;
  const isIdle = character.status === 'idle';
  const isInjured = character.status === 'injured';

  const handleSend = async () => {
    if (!selectedDungeon) return;
    setLoading(true); setError(null);
    const res = await fetch('/api/run/start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dungeonId: selectedDungeon, difficulty: selectedDiff }),
    });
    const data = await res.json();
    if (data.ok) { onRunStart(data.run); }
    else { setError(data.error); }
    setLoading(false);
  };

  const handleCollect = async () => {
    const res = await fetch('/api/run/resolve', { method: 'POST' });
    const data = await res.json();
    if (data.ok) { onRunComplete(); onRefresh(); }
  };

  const dungeonList = DUNGEONS.filter(d => unlockedDungeons.includes(d.id));
  const lockedDungeons = DUNGEONS.filter(d => !unlockedDungeons.includes(d.id));
  const selected = selectedDungeon ? DUNGEONS.find(d => d.id === selectedDungeon) : null;
  const dc = selected ? selected.baseDC + DC_BONUS[selectedDiff] : 0;
  const cr = character.combatRating;
  const successOdds = selected ? Math.min(95, Math.max(5, Math.round(((cr - dc + 50) / 100) * 100))) : 0;

  return (
    <div className="flex gap-6 h-full">
      {/* LEFT: dungeon selection */}
      <div className="flex-1 flex flex-col gap-4 overflow-y-auto pr-1">
        <div>
          <p className="text-[11px] text-[#6060a0] uppercase tracking-widest mb-3 flex items-center gap-2">
            <span className="text-purple-500">◆</span> Available Dungeons
          </p>

          {activeRun ? (
            <RunTimer run={activeRun} onComplete={handleCollect} compact />
          ) : isInjured && character.injuredUntil ? (
            <div className="bg-[#14142a] border border-red-700/30 rounded-xl p-6 text-center">
              <span className="text-4xl">🩹</span>
              <p className="text-red-400 font-semibold mt-3">Hero is Injured</p>
              <p className="text-red-400/60 text-sm mt-1">
                Recovering — ~{Math.ceil(Math.max(0, character.injuredUntil - Math.floor(Date.now()/1000)) / 60)} min left
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {dungeonList.map((dungeon) => {
                const isSelected = selectedDungeon === dungeon.id;
                const tierDC = dungeon.baseDC + DC_BONUS[isSelected ? selectedDiff : 'normal'];
                const odds = Math.min(95, Math.max(5, Math.round(((cr - tierDC + 50) / 100) * 100)));
                return (
                  <button key={dungeon.id} onClick={() => setSelectedDungeon(dungeon.id)}
                    className={`w-full text-left rounded-xl border transition-all overflow-hidden ${
                      isSelected
                        ? 'border-violet-500/50 bg-[#1a1a35]'
                        : 'border-[rgba(120,110,200,0.15)] bg-[#14142a] hover:bg-[#1a1a30] hover:border-[rgba(120,110,200,0.25)]'
                    }`}>
                    <div className={`h-0.5 bg-gradient-to-r ${TIER_COLORS[dungeon.tier]}`} />
                    <div className="p-4 flex items-start gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-slate-100 font-semibold">{dungeon.name}</span>
                          <span className="text-[10px] text-[#6060a0] bg-[#0f0f22] px-1.5 py-0.5 rounded">
                            {TIER_LABELS[dungeon.tier]}
                          </span>
                        </div>
                        <p className="text-[12px] text-[#7070a0] truncate">{dungeon.lootFocus}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-[#8080a0] text-xs">{dungeon.durationMinutes}m</p>
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
      </div>

      {/* RIGHT: dungeon detail + controls */}
      <div className="w-80 flex-shrink-0 flex flex-col gap-4">
        {selected && !activeRun && !isInjured ? (
          <>
            <div className="bg-[#14142a] border border-[rgba(120,110,200,0.2)] rounded-xl overflow-hidden">
              <div className={`h-24 bg-gradient-to-br ${TIER_COLORS[selected.tier]} flex items-end p-4`}>
                <div>
                  <p className="text-white/60 text-xs">{TIER_LABELS[selected.tier]}</p>
                  <h3 className="text-white font-bold text-lg">{selected.name}</h3>
                </div>
              </div>
              <div className="p-4">
                <p className="text-[#8080b0] text-sm mb-4">{selected.description}</p>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="bg-[#0f0f22] rounded-lg p-2.5">
                    <p className="text-[#6060a0]">Duration</p>
                    <p className="text-slate-200 font-bold mt-0.5">{selected.durationMinutes} min</p>
                  </div>
                  <div className="bg-[#0f0f22] rounded-lg p-2.5">
                    <p className="text-[#6060a0]">Base DC</p>
                    <p className="text-slate-200 font-bold mt-0.5">{selected.baseDC}</p>
                  </div>
                  <div className="bg-[#0f0f22] rounded-lg p-2.5">
                    <p className="text-[#6060a0]">Success</p>
                    <p className={`font-bold mt-0.5 ${successOdds >= 70 ? 'text-emerald-400' : successOdds >= 45 ? 'text-amber-400' : 'text-red-400'}`}>
                      ~{successOdds}%
                    </p>
                  </div>
                  <div className="bg-[#0f0f22] rounded-lg p-2.5">
                    <p className="text-[#6060a0]">Your CR</p>
                    <p className="text-slate-200 font-bold mt-0.5">{cr}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Difficulty */}
            <div className="bg-[#14142a] border border-[rgba(120,110,200,0.2)] rounded-xl p-4">
              <p className="text-[11px] text-[#6060a0] uppercase tracking-widest mb-3">Difficulty</p>
              <div className="flex gap-2">
                {(['normal', 'hardened', 'nightmare'] as Difficulty[]).map((d) => (
                  <button key={d} onClick={() => setSelectedDiff(d)}
                    className={`flex-1 py-2 px-1 rounded-lg text-xs font-semibold border transition-all ${
                      selectedDiff === d
                        ? d === 'nightmare' ? 'border-red-500/50 bg-red-900/30 text-red-300'
                          : d === 'hardened' ? 'border-amber-500/50 bg-amber-900/20 text-amber-300'
                          : 'border-emerald-500/50 bg-emerald-900/20 text-emerald-300'
                        : 'border-[rgba(120,110,200,0.15)] bg-transparent text-[#7070a0] hover:border-[rgba(120,110,200,0.3)]'
                    }`}>
                    {DIFFICULTY_LABELS[d]}
                  </button>
                ))}
              </div>
              {selectedDiff !== 'normal' && (
                <p className="text-[11px] text-[#6060a0] mt-2.5 leading-relaxed">
                  {selectedDiff === 'hardened' && '+1 loot roll · +25% XP · DC +15'}
                  {selectedDiff === 'nightmare' && '+2 loot rolls · +75% XP · DC +30 · ×2 injury risk'}
                </p>
              )}
            </div>

            {error && (
              <div className="bg-red-950/30 border border-red-700/30 rounded-xl p-3 text-red-400 text-sm">
                {error}
              </div>
            )}

            <button onClick={handleSend} disabled={!isIdle || loading}
              className="w-full py-4 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 disabled:from-slate-700 disabled:to-slate-700 disabled:text-slate-500 text-white font-bold rounded-xl transition-all text-base tracking-wide shadow-lg shadow-purple-900/30">
              {loading ? 'Sending...' : `SEND HERO →`}
            </button>
          </>
        ) : (
          <div className="bg-[#14142a] border border-[rgba(120,110,200,0.15)] rounded-xl p-6 text-center text-[#5050a0]">
            {activeRun
              ? <p className="text-sm">Hero is on expedition</p>
              : isInjured
              ? <p className="text-sm">Hero is recovering</p>
              : <p className="text-sm">← Select a dungeon to begin</p>
            }
          </div>
        )}
      </div>
    </div>
  );
}
