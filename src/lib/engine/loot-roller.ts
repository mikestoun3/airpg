import { v4 as uuidv4 } from 'uuid';
import type { ItemInstance, Rarity, StatKey, SpecialEffect, Difficulty, RunPreviewEvent } from '@/types/game';
import { RARITY_ORDER } from '@/types/game';
import { getTemplate } from '@/lib/data/items';
import type { DungeonLootTable, LootTableEntry, RarityWeights } from '@/lib/data/loot-tables';
import { DUNGEON_RESOURCE_DROPS, getResource } from '@/lib/data/resources';
import type { ResourceStack } from '@/types/game';

export interface PreRolledData {
  items: ItemInstance[];
  gold: number;
  essence: number;
  resources: (ResourceStack & { revealAt: number })[];
  previewEvents: RunPreviewEvent[];
}

const RARITY_STAT_RANGES: Record<Rarity, [number, number]> = {
  common: [1, 4],
  uncommon: [4, 8],
  rare: [8, 14],
  epic: [14, 22],
  legendary: [22, 36],
};

const RARITY_GEAR_SCORE: Record<Rarity, number> = {
  common: 5,
  uncommon: 12,
  rare: 22,
  epic: 38,
  legendary: 60,
};

const SECONDARY_STAT_COUNT: Record<Rarity, number> = {
  common: 0,
  uncommon: 1,
  rare: 2,
  epic: 3,
  legendary: 3,
};

const ALL_STATS: StatKey[] = ['pwr', 'end', 'lck', 'spd', 'ins'];

const SPECIAL_EFFECTS: SpecialEffect[] = [
  { id: 'night_stalker', name: 'Night Stalker', description: '+15% success in underground dungeons' },
  { id: 'lucky_break', name: 'Lucky Break', description: '30% chance to ignore injury on failure' },
  { id: 'treasure_sense', name: 'Treasure Sense', description: '+1 bonus loot roll on Critical Success' },
  { id: 'ironhide', name: 'Ironhide', description: 'Injury duration reduced by 50%' },
  { id: 'scavengers_eye', name: "Scavenger's Eye", description: '+10 guaranteed gold on any run' },
  { id: 'swift_reflexes', name: 'Swift Reflexes', description: '-10% run duration' },
  { id: 'scholars_mind', name: "Scholar's Mind", description: '+20% XP gained' },
];

function rand(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function weightedPick<T extends { weight: number }>(items: T[]): T {
  const total = items.reduce((s, i) => s + i.weight, 0);
  let roll = Math.random() * total;
  for (const item of items) {
    roll -= item.weight;
    if (roll <= 0) return item;
  }
  return items[items.length - 1];
}

function rollRarity(weights: RarityWeights, luck: number): Rarity {
  const adjusted = { ...weights };
  // Each luck point nudges distribution up
  const luckBonus = Math.min(luck * 0.5, 20);
  adjusted.common = Math.max(5, adjusted.common - luckBonus * 1.5);
  adjusted.uncommon += luckBonus * 0.8;
  adjusted.rare += luckBonus * 0.5;
  adjusted.epic += luckBonus * 0.15;
  adjusted.legendary += luckBonus * 0.05;

  const entries = RARITY_ORDER.map((r) => ({ rarity: r, weight: adjusted[r] }));
  return weightedPick(entries).rarity;
}

function rollSecondaryStats(primaryStat: StatKey, rarity: Rarity): Array<{ stat: StatKey; value: number }> {
  const count = SECONDARY_STAT_COUNT[rarity];
  if (count === 0) return [];

  const available = ALL_STATS.filter((s) => s !== primaryStat);
  const chosen: StatKey[] = [];
  const pool = [...available];

  for (let i = 0; i < count && pool.length > 0; i++) {
    const idx = Math.floor(Math.random() * pool.length);
    chosen.push(pool.splice(idx, 1)[0]);
  }

  const [min, max] = RARITY_STAT_RANGES[rarity];
  const secondaryMax = Math.ceil(max * 0.5);

  return chosen.map((stat) => ({
    stat,
    value: rand(1, Math.max(1, secondaryMax)),
  }));
}

function rollSpecialEffects(rarity: Rarity): SpecialEffect[] {
  if (rarity === 'epic') {
    return [SPECIAL_EFFECTS[Math.floor(Math.random() * SPECIAL_EFFECTS.length)]];
  }
  if (rarity === 'legendary') {
    const shuffled = [...SPECIAL_EFFECTS].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, 2);
  }
  return [];
}

function rarityPrefix(rarity: Rarity): string {
  const prefixes: Record<Rarity, string[]> = {
    common: ['Worn', 'Battered', 'Plain', 'Simple'],
    uncommon: ['Sturdy', 'Keen', 'Reinforced', 'Quality'],
    rare: ['Superior', 'Honed', 'Masterwork', 'Refined'],
    epic: ['Arcane', 'Enchanted', "Warlord's", "Champion's"],
    legendary: ['Ancient', 'Mythic', "Dragon's", 'Celestial'],
  };
  const list = prefixes[rarity];
  return list[Math.floor(Math.random() * list.length)];
}

export function rollItem(
  table: DungeonLootTable,
  luck: number,
  forceRarity?: Rarity
): ItemInstance | null {
  const rarity = forceRarity ?? rollRarity(table.rarityWeights, luck);
  const pool: LootTableEntry[] = table.items[rarity];
  if (!pool || pool.length === 0) return null;

  const entry = weightedPick(pool);
  const template = getTemplate(entry.templateId);
  if (!template) return null;

  const [min, max] = RARITY_STAT_RANGES[rarity];
  const primaryValue = rand(min, max);
  const secondaryStats = rollSecondaryStats(template.primaryStat, rarity);
  const specialEffects = rollSpecialEffects(rarity);

  const name =
    rarity === 'common'
      ? template.name
      : `${rarityPrefix(rarity)} ${template.name}`;

  return {
    id: uuidv4(),
    templateId: template.id,
    name,
    slot: template.slot,
    rarity,
    primaryStat: template.primaryStat,
    primaryValue,
    secondaryStats,
    specialEffects,
    gearScore: RARITY_GEAR_SCORE[rarity],
  };
}

const DIFF_LOOT_BONUS: Record<Difficulty, number> = { normal: 0, hardened: 1, nightmare: 2 };

export function preRollRun(
  table: DungeonLootTable,
  dungeonId: string,
  luck: number,
  difficulty: Difficulty
): PreRolledData {
  const maxRolls = 3 + DIFF_LOOT_BONUS[difficulty];

  const items: ItemInstance[] = [];
  for (let i = 0; i < maxRolls; i++) {
    const item = rollItem(table, luck);
    if (item) items.push(item);
  }

  const [goldMin, goldMax] = table.baseGold;
  const gold = Math.round(rand(goldMin, goldMax) * table.goldMultiplier);
  let essence = 0;
  if (Math.random() < table.essenceChance) {
    essence = rand(table.essenceAmount[0], table.essenceAmount[1]);
  }

  const drops = DUNGEON_RESOURCE_DROPS[dungeonId] ?? [];
  const resources: (ResourceStack & { revealAt: number })[] = [];
  for (const drop of drops) {
    if (Math.random() < drop.chance) {
      const qty = rand(drop.minQty, drop.maxQty);
      const def = getResource(drop.resourceId);
      if (def) {
        resources.push({
          resourceId: drop.resourceId,
          name: def.name,
          icon: def.icon,
          quantity: qty,
          revealAt: Math.random() * 0.75 + 0.12,
        });
      }
    }
  }

  const previewEvents: RunPreviewEvent[] = [];

  for (const item of items) {
    previewEvents.push({
      type: 'item',
      revealAt: Math.random() * 0.68 + 0.10,
      label: `Found: ${item.name}`,
      rarity: item.rarity,
    });
  }

  for (const res of resources) {
    previewEvents.push({
      type: 'resource',
      revealAt: res.revealAt,
      label: `Gathered: ${res.name} ×${res.quantity}`,
      icon: res.icon,
    });
  }

  if (essence > 0) {
    previewEvents.push({
      type: 'essence',
      revealAt: Math.random() * 0.25 + 0.65,
      label: `Collected: ${essence} Essence`,
      icon: '✦',
    });
  }

  previewEvents.sort((a, b) => a.revealAt - b.revealAt);

  return { items, gold, essence, resources, previewEvents };
}

export function rollLoot(
  table: DungeonLootTable,
  luck: number,
  numRolls: number
): { items: ItemInstance[]; gold: number; essence: number } {
  const items: ItemInstance[] = [];

  for (let i = 0; i < numRolls; i++) {
    const item = rollItem(table, luck);
    if (item) items.push(item);
  }

  const [goldMin, goldMax] = table.baseGold;
  const gold = Math.round(rand(goldMin, goldMax) * table.goldMultiplier);

  let essence = 0;
  if (Math.random() < table.essenceChance) {
    essence = rand(table.essenceAmount[0], table.essenceAmount[1]);
  }

  return { items, gold, essence };
}
