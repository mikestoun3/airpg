'use client';
import { useState } from 'react';
import type { GameState, StatKey } from '@/types/game';
import { STAT_LABELS, SLOT_LABELS } from '@/types/game';
import { RarityText } from '../ui/RarityBadge';

interface Props {
  state: GameState;
  onRefresh: () => void;
}

const STAT_ICONS: Record<StatKey, string> = {
  pwr: '⚔', end: '🛡', lck: '✦', spd: '💨', ins: '👁',
};

function itemSprite(slot: string, rarity?: string): string {
  if (!rarity) return `/icons/items/slot_${slot}.png`;
  return `/icons/items/item_${slot}_${rarity}.png`;
}

const STAT_DESC: Record<StatKey, string> = {
  pwr: 'Increases success chance & loot quality',
  end: 'Reduces failure & injury chance',
  lck: 'Shifts drops toward higher rarities',
  spd: 'Reduces run duration (-2% per point)',
  ins: 'Increases XP gained from runs',
};

export function CharacterTab({ state, onRefresh }: Props) {
  const { character, equipment, activeRun } = state;
  const onRun = !!activeRun;
  const [spending, setSpending] = useState(false);
  const [tooltip, setTooltip] = useState<StatKey | null>(null);

  const slots = ['weapon', 'helmet', 'chest', 'boots', 'ring', 'trinket'] as const;
  const xpPct = Math.min(100, Math.round((character.xp / character.xpToNext) * 100));

  const handleSpendStat = async (stat: StatKey) => {
    if (character.statPoints <= 0 || spending) return;
    setSpending(true);
    await fetch('/api/inventory', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'spend_stat', stat }),
    });
    await onRefresh();
    setSpending(false);
  };

  const handleUnequip = async (slot: typeof slots[number]) => {
    await fetch('/api/inventory', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'unequip', slot }),
    });
    onRefresh();
  };

  return (
    <div className="flex flex-col md:flex-row gap-4 md:gap-6 md:h-full">

      {/* LEFT: portrait + equipment */}
      <div className="w-full md:w-72 md:flex-shrink-0 flex flex-col gap-4 md:overflow-y-auto md:pb-2">
        {/* Portrait card */}
        <div className="flex-shrink-0 bg-[#180c0c] border border-[rgba(200,70,70,0.2)] rounded-xl overflow-hidden">
          {/* Avatar — fixed height, just the circle */}
          <div className="bg-gradient-to-b from-[#1e1010] to-[#130909] h-28 md:h-32 flex items-center justify-center">
            <div className="w-20 h-20 md:w-24 md:h-24 rounded-full bg-gradient-to-br from-red-700 to-rose-900 flex items-center justify-center text-4xl border-2 border-red-600/40 shadow-lg shadow-red-950/40">
              ⚔
            </div>
          </div>
          <div className="px-4 pt-3 pb-4">
            {/* Name + badges */}
            <div className="text-center mb-3">
              <h2 className="text-slate-100 font-black text-lg leading-tight truncate">{character.name}</h2>
              <div className="flex items-center justify-center gap-1.5 mt-1.5">
                <span className="text-[10px] font-bold text-red-300 bg-red-900/50 border border-red-700/40 px-2 py-0.5 rounded-full tracking-wide">
                  LVL {character.level}
                </span>
                <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${
                  character.status === 'on_run'  ? 'text-red-300 bg-indigo-900/40 border-red-700/40' :
                  character.status === 'injured' ? 'text-red-300 bg-red-900/40 border-red-700/40' :
                                                   'text-emerald-300 bg-emerald-900/40 border-emerald-700/40'
                }`}>
                  {character.status === 'on_run' ? '⚔ In Dungeon' : character.status === 'injured' ? '✖ Injured' : '● Idle'}
                </span>
              </div>
            </div>
            <div className="mb-1 flex justify-between text-[11px] text-[#5a3535]">
              <span>XP</span>
              <span>{character.xp} / {character.xpToNext}</span>
            </div>
            <div className="h-1.5 bg-[#130909] rounded-full overflow-hidden mb-4">
              <div className="h-full bg-gradient-to-r from-amber-500 to-yellow-400 rounded-full transition-all" style={{ width: `${xpPct}%` }} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: 'Gear Score', value: character.gearScore, color: 'text-rose-400' },
                { label: 'Combat Rating', value: character.combatRating, color: 'text-blue-400' },
                { label: 'Gold', value: character.gold, color: 'text-amber-400' },
                { label: 'Essence', value: character.essence, color: 'text-rose-300' },
              ].map(({ label, value, color }) => (
                <div key={label} className="bg-[#130909] rounded-lg p-2.5 text-center">
                  <p className={`font-bold text-base ${color}`}>{value}</p>
                  <p className="text-[#6a4040] text-[10px] mt-0.5">{label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Equipment */}
        <div className="bg-[#180c0c] border border-[rgba(200,70,70,0.2)] rounded-xl p-4">
          <p className="text-[11px] text-[#5a3535] uppercase tracking-widest mb-3 flex items-center gap-2">
            <span className="text-rose-500">◆</span> Equipment
            {onRun && <span className="ml-auto text-[10px] text-red-400/70">⚔ on run</span>}
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-1 gap-2">
            {slots.map((slot) => {
              const item = equipment[slot];
              return (
                <div key={slot}
                  className="flex items-center gap-2 p-2.5 rounded-lg bg-[#130909] border border-[rgba(200,70,70,0.10)]">
                  <div className="w-8 h-8 shrink-0 flex items-center justify-center">
                    <img
                      src={itemSprite(slot, item?.rarity)}
                      alt={slot}
                      width={32} height={32}
                      style={{ imageRendering: 'pixelated', opacity: item ? 1 : 0.3 }}
                    />
                  </div>
                  {item ? (
                    <>
                      <div className="flex-1 min-w-0">
                        <RarityText rarity={item.rarity} className="text-xs font-semibold truncate block">{item.name}</RarityText>
                        <span className="text-[#6a4040] text-[10px]">+{item.primaryValue} {STAT_LABELS[item.primaryStat]} · GS {item.gearScore}</span>
                      </div>
                      <button onClick={() => !onRun && handleUnequip(slot)} disabled={onRun}
                        className="text-[#4a3030] hover:text-[#b07070] transition-colors shrink-0 text-xs disabled:opacity-20 disabled:cursor-not-allowed">✕</button>
                    </>
                  ) : (
                    <span className="text-[#3a2222] text-xs italic">Empty</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* RIGHT: stats */}
      <div className="flex-1 flex flex-col gap-4 md:overflow-y-auto">
        <div className="bg-[#180c0c] border border-[rgba(200,70,70,0.2)] rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <p className="text-[11px] text-[#5a3535] uppercase tracking-widest flex items-center gap-2">
              <span className="text-rose-500">◆</span> Primary Attributes
            </p>
            {character.statPoints > 0 && (
              <span className="text-xs px-3 py-1 bg-amber-900/30 text-amber-400 border border-amber-600/30 rounded-full font-medium">
                Points: {character.statPoints}
              </span>
            )}
          </div>
          <div className="space-y-3">
            {(['pwr', 'end', 'lck', 'spd', 'ins'] as StatKey[]).map((stat) => (
              <div key={stat} className="flex items-center gap-3 md:gap-4"
                onMouseEnter={() => setTooltip(stat)} onMouseLeave={() => setTooltip(null)}>
                <div className="flex items-center gap-2 w-28 md:w-36 shrink-0">
                  <span className="text-lg w-6 text-center">{STAT_ICONS[stat]}</span>
                  <span className="text-slate-300 text-sm">{STAT_LABELS[stat]}</span>
                </div>
                <div className="flex-1 h-2 bg-[#130909] rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-red-700 to-purple-500 rounded-full transition-all"
                    style={{ width: `${Math.min(100, (character[stat] / 30) * 100)}%` }} />
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-slate-100 font-bold font-mono w-8 text-right">{character[stat]}</span>
                  {character.statPoints > 0 && (
                    <button onClick={() => handleSpendStat(stat)} disabled={spending}
                      className="w-7 h-7 flex items-center justify-center rounded-full bg-gradient-to-br from-red-700 to-rose-700 hover:from-red-600 hover:to-rose-600 text-white text-sm font-bold transition-all disabled:opacity-50 shadow-md shadow-red-950/30">
                      +
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
          {tooltip && (
            <div className="mt-4 p-3 bg-[#130909] rounded-lg border border-[rgba(200,70,70,0.15)] text-[#a07070] text-xs">
              <span className="text-rose-400 font-semibold">{STAT_LABELS[tooltip]}:</span> {STAT_DESC[tooltip]}
            </div>
          )}
        </div>

        <div className="bg-[#180c0c] border border-[rgba(200,70,70,0.2)] rounded-xl p-5">
          <p className="text-[11px] text-[#5a3535] uppercase tracking-widest mb-4 flex items-center gap-2">
            <span className="text-rose-500">◆</span> Combat Stats
          </p>
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'Attack Power', value: Math.floor(character.pwr * 1.5), icon: '⚔' },
              { label: 'Defense Power', value: character.end, icon: '🛡' },
              { label: 'Combat Rating', value: character.combatRating, icon: '⚡' },
            ].map(({ label, value, icon }) => (
              <div key={label} className="bg-[#130909] rounded-xl p-3 md:p-4 text-center">
                <p className="text-xl md:text-2xl mb-1">{icon}</p>
                <p className="text-slate-100 font-bold text-xl md:text-2xl">{value}</p>
                <p className="text-[#5a3535] text-[10px] md:text-[11px] mt-1">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
