'use client';
import { useState } from 'react';
import type { GameState, StatKey } from '@/types/game';
import { STAT_LABELS, SLOT_LABELS } from '@/types/game';
import { RarityText } from '../ui/RarityBadge';
import { CLASSES } from '@/lib/data/classes';
import { getSkillsByClass, formatSkillDesc } from '@/lib/data/skills';
import { computeCombatStats } from '@/lib/engine/combat-engine';

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
  pwr: 'Increases ATK damage (Warrior/Mage scale more)',
  end: 'Increases HP and DEF (Warrior scales more)',
  lck: 'Increases CRIT chance and drop quality',
  spd: 'Increases EVA, ASPD, and reduces run duration (-2% per point)',
  ins: 'Increases XP gained from runs',
};

type Panel = 'stats' | 'skills';

export function CharacterTab({ state, onRefresh }: Props) {
  const { character, equipment, activeRun } = state;
  const onRun = !!activeRun;
  const [spending, setSpending] = useState(false);
  const [tooltip, setTooltip] = useState<StatKey | null>(null);
  const [panel, setPanel] = useState<Panel>('stats');
  const [skillBuying, setSkillBuying] = useState<string | null>(null);

  const slots = ['weapon', 'helmet', 'chest', 'boots', 'ring', 'trinket'] as const;
  const xpPct = Math.min(100, Math.round((character.xp / character.xpToNext) * 100));

  const classDef = CLASSES.find(c => c.id === character.charClass) ?? CLASSES[0];

  // Build skill bonus map from character.skills
  const skillBonusMap: Record<string, number> = {};
  for (const s of character.skills) { skillBonusMap[s.skillId] = s.ranks; }

  // Compute skill bonus for combat stats
  const { getSkill } = require('@/lib/data/skills') as typeof import('@/lib/data/skills');
  const rawSkillBonus: Record<string, number> = {};
  for (const s of character.skills) {
    const def = getSkill(s.skillId);
    if (!def) continue;
    rawSkillBonus[def.effectStat] = (rawSkillBonus[def.effectStat] ?? 0) + def.effectPerRank * s.ranks;
  }

  const combatStats = computeCombatStats(character, character.charClass, rawSkillBonus as Parameters<typeof computeCombatStats>[2]);
  const classSkills = getSkillsByClass(character.charClass);

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

  const handleSpendSkill = async (skillId: string) => {
    if (character.skillPoints <= 0 || skillBuying) return;
    setSkillBuying(skillId);
    await fetch('/api/inventory', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'spend_skill', skillId }),
    });
    await onRefresh();
    setSkillBuying(null);
  };

  const combatRows = [
    { label: 'HP',   value: combatStats.hp,   unit: '',   color: 'text-emerald-400', bar: combatStats.hp / 500 },
    { label: 'ATK',  value: combatStats.atk,  unit: '',   color: 'text-red-400',     bar: combatStats.atk / 300 },
    { label: 'DEF',  value: combatStats.def,  unit: '%',  color: 'text-blue-400',    bar: combatStats.def / 75 },
    { label: 'EVA',  value: combatStats.eva,  unit: '%',  color: 'text-cyan-400',    bar: combatStats.eva / 60 },
    { label: 'ASPD', value: +combatStats.aspd.toFixed(2), unit: '', color: 'text-amber-400', bar: combatStats.aspd / 3 },
    { label: 'CRIT', value: combatStats.crit, unit: '%',  color: 'text-purple-400',  bar: combatStats.crit / 50 },
  ];

  return (
    <div className="flex flex-col md:flex-row gap-4 md:gap-6 md:h-full">

      {/* LEFT: portrait + equipment */}
      <div className="w-full md:w-72 md:flex-shrink-0 flex flex-col gap-4 md:overflow-y-auto md:pb-2">
        {/* Portrait card */}
        <div className="flex-shrink-0 bg-[#16161f] border border-[rgba(255,255,255,0.09)] rounded-xl overflow-hidden">
          <div className="relative h-36 md:h-40 overflow-hidden bg-[#0e0e14]">
            <img src={classDef.portrait} alt={classDef.name}
              className="w-full h-full object-cover object-top" />
            <div className="absolute inset-0 bg-gradient-to-t from-[#16161f] via-transparent to-transparent" />
            {/* Class badge */}
            <div className="absolute top-2 left-2">
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full border uppercase tracking-wider"
                style={{ color: classDef.color, borderColor: classDef.color + '66', background: classDef.color + '22' }}>
                {classDef.name}
              </span>
            </div>
          </div>
          <div className="px-4 pt-3 pb-4">
            {/* Name + badges */}
            <div className="text-center mb-3">
              <h2 className="text-slate-100 font-black text-lg leading-tight truncate">{character.name}</h2>
              <div className="flex items-center justify-center gap-1.5 mt-1.5">
                <span className="text-[10px] font-bold text-red-300 bg-red-900/50 border border-[#d4294a]/40 px-2 py-0.5 rounded-full tracking-wide">
                  LVL {character.level}
                </span>
                <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${
                  character.status === 'on_run'  ? 'text-red-300 bg-indigo-900/40 border-[#d4294a]/40' :
                  character.status === 'injured' ? 'text-red-300 bg-red-900/40 border-[#d4294a]/40' :
                                                   'text-emerald-300 bg-emerald-900/40 border-emerald-700/40'
                }`}>
                  {character.status === 'on_run' ? '⚔ In Dungeon' : character.status === 'injured' ? '✖ Injured' : '● Idle'}
                </span>
              </div>
            </div>
            <div className="mb-1 flex justify-between text-[11px] text-[#505058]">
              <span>XP</span>
              <span>{character.xp} / {character.xpToNext}</span>
            </div>
            <div className="h-1.5 bg-[#111118] rounded-full overflow-hidden mb-4">
              <div className="h-full bg-gradient-to-r from-amber-500 to-yellow-400 rounded-full transition-all" style={{ width: `${xpPct}%` }} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: 'Gear Score', value: character.gearScore, color: 'text-[#FC3154]' },
                { label: 'Gold', value: character.gold, color: 'text-amber-400' },
                { label: 'Essence', value: character.essence, color: 'text-rose-300' },
                { label: 'Skill Pts', value: character.skillPoints, color: 'text-purple-400' },
              ].map(({ label, value, color }) => (
                <div key={label} className="bg-[#111118] rounded-lg p-2.5 text-center">
                  <p className={`font-bold text-base ${color}`}>{value}</p>
                  <p className="text-[#606068] text-[10px] mt-0.5">{label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Equipment */}
        <div className="bg-[#16161f] border border-[rgba(255,255,255,0.09)] rounded-xl p-4">
          <p className="text-[11px] text-[#505058] uppercase tracking-widest mb-3 flex items-center gap-2">
            <span className="text-[#FC3154]">◆</span> Equipment
            {onRun && <span className="ml-auto text-[10px] text-[#FC3154]/70">⚔ on run</span>}
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-1 gap-2">
            {slots.map((slot) => {
              const item = equipment[slot];
              return (
                <div key={slot}
                  className="flex items-center gap-2 p-2.5 rounded-lg bg-[#111118] border border-[rgba(255,255,255,0.06)]">
                  <div className="w-8 h-8 shrink-0 flex items-center justify-center">
                    <img src={itemSprite(slot, item?.rarity)} alt={slot} width={32} height={32}
                      style={{ imageRendering: 'pixelated', opacity: item ? 1 : 0.3 }} />
                  </div>
                  {item ? (
                    <>
                      <div className="flex-1 min-w-0">
                        <RarityText rarity={item.rarity} className="text-xs font-semibold truncate block">{item.name}</RarityText>
                        <span className="text-[#606068] text-[10px]">+{item.primaryValue} {STAT_LABELS[item.primaryStat]} · GS {item.gearScore}</span>
                      </div>
                      <button onClick={() => !onRun && handleUnequip(slot)} disabled={onRun}
                        className="text-[#44444e] hover:text-[#909098] transition-colors shrink-0 text-xs disabled:opacity-20 disabled:cursor-not-allowed">✕</button>
                    </>
                  ) : (
                    <span className="text-[#363640] text-xs italic">Empty</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* RIGHT: panel tabs + content */}
      <div className="flex-1 flex flex-col gap-4 md:overflow-y-auto">

        {/* Panel toggle */}
        <div className="flex gap-1 bg-[#111118] rounded-xl p-1">
          {(['stats', 'skills'] as Panel[]).map(p => (
            <button key={p} onClick={() => setPanel(p)}
              className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all ${
                panel === p
                  ? 'bg-[#16161f] text-slate-100 shadow-sm'
                  : 'text-[#606068] hover:text-[#909098]'
              }`}>
              {p === 'stats' ? 'Attributes' : `Skills ${character.skillPoints > 0 ? `(${character.skillPoints})` : ''}`}
            </button>
          ))}
        </div>

        {panel === 'stats' && (
          <>
            {/* Base Attributes */}
            <div className="bg-[#16161f] border border-[rgba(255,255,255,0.09)] rounded-xl p-5">
              <div className="flex items-center justify-between mb-4">
                <p className="text-[11px] text-[#505058] uppercase tracking-widest flex items-center gap-2">
                  <span className="text-[#FC3154]">◆</span> Base Attributes
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
                    <div className="flex-1 h-2 bg-[#111118] rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-[#d4294a] to-purple-500 rounded-full transition-all"
                        style={{ width: `${Math.min(100, (character[stat] / 30) * 100)}%` }} />
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-slate-100 font-bold font-mono w-8 text-right">{character[stat]}</span>
                      {character.statPoints > 0 && (
                        <button onClick={() => handleSpendStat(stat)} disabled={spending}
                          className="w-7 h-7 flex items-center justify-center rounded-full bg-gradient-to-br from-[#d4294a] to-[#d4294a] hover:from-[#FC3154] hover:to-[#e02a49] text-white text-sm font-bold transition-all disabled:opacity-50 shadow-md shadow-[#1a0510]/30">
                          +
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              {tooltip && (
                <div className="mt-4 p-3 bg-[#111118] rounded-lg border border-[rgba(255,255,255,0.08)] text-[#848490] text-xs">
                  <span className="text-[#FC3154] font-semibold">{STAT_LABELS[tooltip]}:</span> {STAT_DESC[tooltip]}
                </div>
              )}
            </div>

            {/* Combat Stats */}
            <div className="bg-[#16161f] border border-[rgba(255,255,255,0.09)] rounded-xl p-5">
              <p className="text-[11px] text-[#505058] uppercase tracking-widest mb-4 flex items-center gap-2">
                <span className="text-[#FC3154]">◆</span> Combat Stats
                <span className="ml-auto text-[10px]" style={{ color: classDef.color + 'cc' }}>{classDef.name} build</span>
              </p>
              <div className="space-y-2.5">
                {combatRows.map(({ label, value, unit, color, bar }) => (
                  <div key={label} className="flex items-center gap-3">
                    <span className="text-[#505058] text-xs w-10 shrink-0">{label}</span>
                    <div className="flex-1 h-1.5 bg-[#111118] rounded-full overflow-hidden">
                      <div className={`h-full rounded-full transition-all ${color.replace('text-', 'bg-')}`}
                        style={{ width: `${Math.min(100, bar * 100)}%`, opacity: 0.7 }} />
                    </div>
                    <span className={`${color} font-bold font-mono text-sm w-16 text-right shrink-0`}>
                      {value}{unit}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {panel === 'skills' && (
          <div className="bg-[#16161f] border border-[rgba(255,255,255,0.09)] rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <p className="text-[11px] text-[#505058] uppercase tracking-widest flex items-center gap-2">
                <span className="text-[#FC3154]">◆</span> {classDef.name} Skills
              </p>
              {character.skillPoints > 0 && (
                <span className="text-xs px-3 py-1 bg-purple-900/30 text-purple-400 border border-purple-600/30 rounded-full font-medium">
                  {character.skillPoints} point{character.skillPoints !== 1 ? 's' : ''}
                </span>
              )}
            </div>
            <div className="space-y-3">
              {classSkills.map((skill) => {
                const currentRanks = skillBonusMap[skill.id] ?? 0;
                const isMaxed = currentRanks >= skill.maxRanks;
                const locked = character.level < skill.requiredLevel;
                const canBuy = character.skillPoints > 0 && !isMaxed && !locked;

                return (
                  <div key={skill.id} className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${
                    locked
                      ? 'bg-[#0e0e14] border-[rgba(255,255,255,0.04)] opacity-40'
                      : isMaxed
                        ? 'bg-[#111118] border-[rgba(255,255,255,0.08)]'
                        : 'bg-[#111118] border-[rgba(255,255,255,0.07)] hover:border-[rgba(255,255,255,0.12)]'
                  }`}>
                    <span className="text-xl w-7 text-center shrink-0">{skill.icon}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-slate-200 text-sm font-semibold">{skill.name}</span>
                        {locked && <span className="text-[10px] text-[#44444e]">Lv.{skill.requiredLevel}</span>}
                        {isMaxed && <span className="text-[10px] text-amber-500 font-bold">MAX</span>}
                      </div>
                      <div className="text-[11px] text-[#606068] mt-0.5">
                        {currentRanks > 0
                          ? <><span style={{ color: classDef.color }}>{formatSkillDesc(skill, currentRanks)}</span>{!isMaxed && ` → ${formatSkillDesc(skill, currentRanks + 1)}`}</>
                          : skill.description.replace('{n}', String(skill.effectPerRank))
                        }
                      </div>
                      {/* Rank pips */}
                      <div className="flex gap-1 mt-1.5">
                        {Array.from({ length: skill.maxRanks }).map((_, i) => (
                          <div key={i} className={`h-1 w-5 rounded-full ${i < currentRanks ? '' : 'bg-[#1e1e2a]'}`}
                            style={i < currentRanks ? { background: classDef.color } : {}} />
                        ))}
                      </div>
                    </div>
                    {canBuy && (
                      <button
                        onClick={() => handleSpendSkill(skill.id)}
                        disabled={skillBuying !== null}
                        className="w-8 h-8 flex items-center justify-center rounded-full text-white text-sm font-bold transition-all disabled:opacity-50 shrink-0 shadow-md"
                        style={{ background: classDef.color }}>
                        +
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
