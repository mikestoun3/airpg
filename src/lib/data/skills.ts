import type { CharacterClass } from '@/types/game';

export type SkillEffectStat = 'atk' | 'def' | 'eva' | 'aspd' | 'crit' | 'hp';

export interface SkillDef {
  id: string;
  name: string;
  description: string;
  maxRanks: number;
  effectStat: SkillEffectStat;
  effectPerRank: number;
  forClass: CharacterClass;
  requiredLevel: number;
  icon: string;
}

export const SKILLS: SkillDef[] = [
  // ── Warrior ──────────────────────────────────────────────────────────────────
  { id: 'warrior_iron_skin',  name: 'Iron Skin',       description: '+{n} DEF per rank',  maxRanks: 3, effectStat: 'def',  effectPerRank: 3,    forClass: 'warrior',  requiredLevel: 1,  icon: '🛡' },
  { id: 'warrior_battle_fury',name: 'Battle Fury',     description: '+{n} ATK per rank',  maxRanks: 3, effectStat: 'atk',  effectPerRank: 5,    forClass: 'warrior',  requiredLevel: 1,  icon: '⚔' },
  { id: 'warrior_fortress',   name: 'Fortress',        description: '+{n} HP per rank',   maxRanks: 3, effectStat: 'hp',   effectPerRank: 20,   forClass: 'warrior',  requiredLevel: 3,  icon: '🏰' },
  { id: 'warrior_veteran',    name: "Veteran's Edge",  description: '+{n}% CRIT per rank', maxRanks: 2, effectStat: 'crit', effectPerRank: 1,    forClass: 'warrior',  requiredLevel: 5,  icon: '✦' },
  { id: 'warrior_advance',    name: 'Advance',         description: '+{n} ASPD per rank', maxRanks: 2, effectStat: 'aspd', effectPerRank: 0.08, forClass: 'warrior',  requiredLevel: 7,  icon: '⚡' },
  { id: 'warrior_bulwark',    name: 'Bulwark',         description: '+{n}% EVA per rank', maxRanks: 2, effectStat: 'eva',  effectPerRank: 2,    forClass: 'warrior',  requiredLevel: 10, icon: '💨' },

  // ── Assassin ─────────────────────────────────────────────────────────────────
  { id: 'assassin_shadow',    name: 'Shadow Step',     description: '+{n}% EVA per rank', maxRanks: 3, effectStat: 'eva',  effectPerRank: 3,    forClass: 'assassin', requiredLevel: 1,  icon: '💨' },
  { id: 'assassin_blade',     name: 'Blade Mastery',   description: '+{n} ATK per rank',  maxRanks: 3, effectStat: 'atk',  effectPerRank: 4,    forClass: 'assassin', requiredLevel: 1,  icon: '🗡' },
  { id: 'assassin_lethal',    name: 'Lethal Strike',   description: '+{n}% CRIT per rank',maxRanks: 3, effectStat: 'crit', effectPerRank: 2,    forClass: 'assassin', requiredLevel: 3,  icon: '✦' },
  { id: 'assassin_predator',  name: 'Predator',        description: '+{n} ASPD per rank', maxRanks: 2, effectStat: 'aspd', effectPerRank: 0.1,  forClass: 'assassin', requiredLevel: 5,  icon: '⚡' },
  { id: 'assassin_resilience',name: 'Resilience',      description: '+{n} HP per rank',   maxRanks: 2, effectStat: 'hp',   effectPerRank: 12,   forClass: 'assassin', requiredLevel: 7,  icon: '❤' },
  { id: 'assassin_hardened',  name: 'Hardened',        description: '+{n} DEF per rank',  maxRanks: 2, effectStat: 'def',  effectPerRank: 2,    forClass: 'assassin', requiredLevel: 10, icon: '🛡' },

  // ── Mage ─────────────────────────────────────────────────────────────────────
  { id: 'mage_arcane_power',  name: 'Arcane Power',    description: '+{n} ATK per rank',  maxRanks: 3, effectStat: 'atk',  effectPerRank: 6,    forClass: 'mage',     requiredLevel: 1,  icon: '✨' },
  { id: 'mage_rune_insight',  name: 'Runic Insight',   description: '+{n}% CRIT per rank',maxRanks: 3, effectStat: 'crit', effectPerRank: 2,    forClass: 'mage',     requiredLevel: 1,  icon: '✦' },
  { id: 'mage_mana_shield',   name: 'Mana Shield',     description: '+{n} HP per rank',   maxRanks: 3, effectStat: 'hp',   effectPerRank: 15,   forClass: 'mage',     requiredLevel: 3,  icon: '🔷' },
  { id: 'mage_crystal_ward',  name: 'Crystal Ward',    description: '+{n} DEF per rank',  maxRanks: 2, effectStat: 'def',  effectPerRank: 2,    forClass: 'mage',     requiredLevel: 5,  icon: '🛡' },
  { id: 'mage_arcane_flow',   name: 'Arcane Flow',     description: '+{n} ASPD per rank', maxRanks: 2, effectStat: 'aspd', effectPerRank: 0.07, forClass: 'mage',     requiredLevel: 7,  icon: '⚡' },
  { id: 'mage_wind_step',     name: 'Wind Step',       description: '+{n}% EVA per rank', maxRanks: 2, effectStat: 'eva',  effectPerRank: 2,    forClass: 'mage',     requiredLevel: 10, icon: '💨' },
];

export function getSkillsByClass(charClass: CharacterClass): SkillDef[] {
  return SKILLS.filter(s => s.forClass === charClass);
}

export function getSkill(id: string): SkillDef | undefined {
  return SKILLS.find(s => s.id === id);
}

export function formatSkillDesc(skill: SkillDef, ranks: number): string {
  const value = skill.effectStat === 'aspd'
    ? (skill.effectPerRank * ranks).toFixed(2)
    : String(Math.round(skill.effectPerRank * ranks));
  return skill.description.replace('{n}', value);
}
