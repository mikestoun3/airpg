import type { Character, Difficulty, RunOutcome, RunResult, ActiveRun, ResourceStack } from '@/types/game';
import { getDungeon } from '@/lib/data/dungeons';
import { getLootTable } from '@/lib/data/loot-tables';
import { rollLoot, rollItem } from '@/lib/engine/loot-roller';
import type { PreRolledData } from '@/lib/engine/loot-roller';

const DIFFICULTY_DC_BONUS: Record<Difficulty, number> = {
  normal: 0,
  hardened: 15,
  nightmare: 30,
};

const DIFFICULTY_LOOT_BONUS: Record<Difficulty, number> = {
  normal: 0,
  hardened: 1,
  nightmare: 2,
};

const DIFFICULTY_XP_MULT: Record<Difficulty, number> = {
  normal: 1,
  hardened: 1.25,
  nightmare: 1.75,
};

const DIFFICULTY_INJURY_MULT: Record<Difficulty, number> = {
  normal: 1,
  hardened: 1,
  nightmare: 2,
};

export function computeCombatRating(char: Character): number {
  return Math.floor(char.pwr * 1.5 + char.end * 1.0);
}

export function computeRunDuration(dungeon: ReturnType<typeof getDungeon>, char: Character): number {
  if (!dungeon) return 0;
  // Each SPD point reduces duration by 2%, capped at 40%
  const reduction = Math.min(char.spd * 0.02, 0.4);
  return Math.round(dungeon.durationMinutes * (1 - reduction));
}

export function resolveRun(
  run: ActiveRun,
  char: Character,
  pityCounts: { totalRuns: number; sinceLastUncommon: number; sinceLastRare: number; sinceLastEpic: number; consecutiveNoSuccess: number },
  preRolled?: PreRolledData
): RunResult {
  const dungeon = getDungeon(run.dungeonId);
  if (!dungeon) throw new Error(`Unknown dungeon: ${run.dungeonId}`);

  const table = getLootTable(run.dungeonId);
  if (!table) throw new Error(`No loot table for dungeon: ${run.dungeonId}`);

  const dc = dungeon.baseDC + DIFFICULTY_DC_BONUS[run.difficulty];
  const combatRating = computeCombatRating(char);
  const roll = Math.floor(Math.random() * 100) + 1 + combatRating;

  // Check pity: 10 consecutive no-success → auto success
  const isForced = pityCounts.consecutiveNoSuccess >= 10;

  let outcome: RunOutcome;
  if (isForced) {
    outcome = 'success';
  } else if (roll >= dc + 15) {
    outcome = 'critical_success';
  } else if (roll >= dc) {
    outcome = 'success';
  } else if (roll >= dc - 15) {
    outcome = 'partial';
  } else if (roll >= dc - 30) {
    outcome = 'failure';
  } else {
    outcome = 'critical_failure';
  }

  const lootRolls = baseLootRolls(outcome) + DIFFICULTY_LOOT_BONUS[run.difficulty];
  const injuryChance = injuryProbability(outcome) * DIFFICULTY_INJURY_MULT[run.difficulty];

  let pityForcedRarity: 'uncommon' | 'rare' | 'epic' | undefined;
  if (outcome !== 'failure' && outcome !== 'critical_failure') {
    if (pityCounts.sinceLastUncommon >= 4) pityForcedRarity = 'uncommon';
    if (pityCounts.sinceLastRare >= 19) pityForcedRarity = 'rare';
    if (pityCounts.sinceLastEpic >= 74) pityForcedRarity = 'epic';
  }

  let items: import('@/types/game').ItemInstance[];
  let gold: number;
  let essence: number;

  if (preRolled) {
    items = preRolled.items.slice(0, lootRolls);
    gold = preRolled.gold;
    essence = preRolled.essence;
  } else {
    const rolled = rollLoot(table, char.lck, lootRolls);
    items = rolled.items;
    gold = rolled.gold;
    essence = rolled.essence;
  }

  if (pityForcedRarity && lootRolls > 0 && items.length > 0) {
    const forcedItem = rollItem(table, char.lck, pityForcedRarity);
    if (forcedItem) items[0] = forcedItem;
  }

  // Resources: gathered regardless unless critical_failure
  const resourceMult = (outcome === 'critical_failure') ? 0 : 1;
  const resourcesGained: ResourceStack[] = preRolled
    ? preRolled.resources
        .filter(() => resourceMult > 0)
        .map((r) => ({ resourceId: r.resourceId, name: r.name, icon: r.icon, quantity: r.quantity }))
    : [];

  if (outcome === 'partial') {
    items = items.filter((i) => i.rarity === 'common' || i.rarity === 'uncommon');
    gold = Math.floor(gold * 0.5);
    essence = Math.floor(essence * 0.5);
  }

  if (outcome === 'failure' || outcome === 'critical_failure') {
    items = [];
    gold = 0;
    essence = 0;
  }

  // XP calculation
  const baseXP = dungeon.tier * 60 + dungeon.baseDC * 2;
  let xpMult = DIFFICULTY_XP_MULT[run.difficulty];
  if (outcome === 'critical_success') xpMult *= 1.5;
  if (outcome === 'partial') xpMult *= 0.5;
  if (outcome === 'failure' || outcome === 'critical_failure') xpMult *= 0.25;
  // Insight bonus
  xpMult += char.ins * 0.02;
  const xpGained = Math.round(baseXP * xpMult);

  const injured = Math.random() < injuryChance;
  const injuryMinutes = injured
    ? Math.round((30 + dungeon.tier * 15) * (run.difficulty === 'nightmare' ? 1.5 : 1))
    : 0;

  return {
    runId: run.id,
    dungeonId: run.dungeonId,
    dungeonName: dungeon.name,
    difficulty: run.difficulty,
    outcome,
    loot: items,
    goldGained: gold,
    essenceGained: essence,
    xpGained,
    injured,
    injuryDurationMinutes: injuryMinutes,
    combatRoll: roll,
    dc,
    resourcesGained,
  };
}

function baseLootRolls(outcome: RunOutcome): number {
  switch (outcome) {
    case 'critical_success': return 3;
    case 'success': return 2;
    case 'partial': return 1;
    default: return 0;
  }
}

function injuryProbability(outcome: RunOutcome): number {
  switch (outcome) {
    case 'critical_failure': return 1.0;
    case 'failure': return 0.30;
    case 'partial': return 0.05;
    default: return 0;
  }
}

export function xpToNextLevel(level: number): number {
  return Math.round(100 * Math.pow(level, 1.6));
}

export function checkLevelUp(char: Character): { leveled: boolean; newLevel: number; newXp: number } {
  let level = char.level;
  let xp = char.xp;
  let leveled = false;

  while (level < 30) {
    const needed = xpToNextLevel(level);
    if (xp >= needed) {
      xp -= needed;
      level++;
      leveled = true;
    } else {
      break;
    }
  }

  return { leveled, newLevel: level, newXp: xp };
}
