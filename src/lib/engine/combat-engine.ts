import type { Character, CharacterClass } from '@/types/game';
import { getClass } from '@/lib/data/classes';
import type { MobTemplate } from '@/lib/data/mob-templates';
import { scaleMob } from '@/lib/data/mob-templates';

export interface CombatStats {
  hp: number;
  atk: number;
  def: number;   // % damage reduction, 0-75
  eva: number;   // % dodge chance, 0-60
  aspd: number;  // attacks per round
  crit: number;  // % crit chance, 0-50
}

export interface SkillBonus {
  atk?: number;
  def?: number;
  eva?: number;
  aspd?: number;
  crit?: number;
  hp?: number;
}

export function computeCombatStats(char: Character, charClass: CharacterClass, bonus: SkillBonus = {}): CombatStats {
  const cls = getClass(charClass);
  return {
    hp:   Math.round(cls.hpBase + char.end * cls.hpPerEnd + (bonus.hp ?? 0)),
    atk:  Math.round(char.pwr * cls.atkPerPwr + (bonus.atk ?? 0)),
    def:  Math.min(75, Math.round(char.end * cls.defPerEnd + (bonus.def ?? 0))),
    eva:  Math.min(60, Math.round(char.spd * cls.evaPerSpd + (bonus.eva ?? 0))),
    aspd: Math.max(0.5, cls.aspdBase + char.spd * cls.aspdPerSpd + (bonus.aspd ?? 0)),
    crit: Math.min(50, Math.round(char.lck * cls.critPerLck + (bonus.crit ?? 0))),
  };
}

export interface BattleResult {
  won: boolean;
  hpRemaining: number;
  hpPercent: number;
}

// Seeded LCG — keeps simulation deterministic for pre-rolled runs
function makeRng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 0x100000000;
  };
}

export function simulateBattle(
  charStats: CombatStats,
  mob: MobTemplate,
  floor: number,
  seed: number,
): BattleResult {
  const scaled = scaleMob(mob, floor);
  let charHp = charStats.hp;
  let mobHp = scaled.hp;
  const rand = makeRng(seed);

  for (let round = 0; round < 30 && charHp > 0 && mobHp > 0; round++) {
    // Character attacks (aspd = attacks/round, fractional handled probabilistically)
    const fullAttacks = Math.floor(charStats.aspd);
    const extraAttack = rand() < (charStats.aspd % 1) ? 1 : 0;
    const attacks = fullAttacks + extraAttack;

    for (let a = 0; a < attacks && mobHp > 0; a++) {
      if (rand() * 100 < scaled.eva) continue;
      let dmg = Math.max(1, charStats.atk * (1 - scaled.def / 100));
      if (rand() * 100 < charStats.crit) dmg *= 1.5;
      mobHp -= Math.round(dmg);
    }
    if (mobHp <= 0) break;

    // Mob attacks (one attack per round)
    if (rand() * 100 >= charStats.eva) {
      const dmg = Math.max(1, scaled.atk * (1 - charStats.def / 100));
      charHp -= Math.round(dmg);
    }
  }

  const finalHp = Math.max(0, charHp);
  return {
    won: mobHp <= 0,
    hpRemaining: finalHp,
    hpPercent: finalHp / charStats.hp,
  };
}

// Map battle result → floor outcome
export function battleToOutcome(result: BattleResult): 'success' | 'partial' | 'failure' {
  if (!result.won) return 'failure';
  if (result.hpPercent >= 0.35) return 'success';
  return 'partial';
}

// Derive a single "power rating" number for leaderboard / display
export function powerRating(stats: CombatStats): number {
  return Math.round(stats.atk + stats.hp / 8 + stats.def * 2 + stats.eva + stats.crit * 1.5 + stats.aspd * 10);
}

// Combine stats from multiple party members
export function computePartyCombatStats(memberStats: CombatStats[]): CombatStats {
  if (memberStats.length === 0) return { hp: 0, atk: 0, def: 0, eva: 0, aspd: 0, crit: 0 };
  if (memberStats.length === 1) return memberStats[0];
  const n = memberStats.length;
  return {
    hp:   memberStats.reduce((s, c) => s + c.hp, 0),
    atk:  memberStats.reduce((s, c) => s + c.atk, 0),
    def:  Math.round(memberStats.reduce((s, c) => s + c.def, 0) / n),
    eva:  Math.round(memberStats.reduce((s, c) => s + c.eva, 0) / n),
    aspd: +memberStats.reduce((s, c) => s + c.aspd, 0).toFixed(2),
    crit: Math.round(memberStats.reduce((s, c) => s + c.crit, 0) / n),
  };
}
