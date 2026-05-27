import type { CraftRecipe } from '@/types/game';

// ── Tier 1 — Iron ─────────────────────────────────────────────────────────────
// Resources only. Requires The Forge (forge level 1).

const T1: CraftRecipe[] = [
  {
    id: 'iron_sword',
    name: 'Iron Sword',
    slot: 'weapon', rarity: 'uncommon', gearTier: 1, requiredForgeLevel: 1,
    description: 'A reliable iron blade — the foundation of every hero\'s arsenal.',
    goldCost: 100,
    ingredients: [
      { resourceId: 'iron_ore',      name: 'Iron Ore',      quantity: 6 },
      { resourceId: 'rough_leather', name: 'Rough Leather', quantity: 3 },
    ],
    outputItem: { templateId: 'iron_sword', name: 'Iron Sword', primaryStat: 'pwr', primaryValue: 9, secondaryStats: [{ stat: 'spd', value: 2 }], gearScore: 15 },
  },
  {
    id: 'iron_helm',
    name: 'Iron Helm',
    slot: 'helmet', rarity: 'uncommon', gearTier: 1, requiredForgeLevel: 1,
    description: 'Hammered iron plate. Not pretty, but it keeps your skull intact.',
    goldCost: 100,
    ingredients: [
      { resourceId: 'iron_ore',      name: 'Iron Ore',      quantity: 5 },
      { resourceId: 'rough_leather', name: 'Rough Leather', quantity: 2 },
    ],
    outputItem: { templateId: 'chain_coif', name: 'Iron Helm', primaryStat: 'end', primaryValue: 8, secondaryStats: [{ stat: 'pwr', value: 2 }], gearScore: 15 },
  },
  {
    id: 'iron_chestplate',
    name: 'Iron Chestplate',
    slot: 'chest', rarity: 'uncommon', gearTier: 1, requiredForgeLevel: 1,
    description: 'Basic torso protection forged from raw iron ore.',
    goldCost: 100,
    ingredients: [
      { resourceId: 'iron_ore',      name: 'Iron Ore',      quantity: 7 },
      { resourceId: 'rough_leather', name: 'Rough Leather', quantity: 4 },
    ],
    outputItem: { templateId: 'chain_mail', name: 'Iron Chestplate', primaryStat: 'end', primaryValue: 9, secondaryStats: [{ stat: 'pwr', value: 2 }], gearScore: 15 },
  },
  {
    id: 'iron_boots',
    name: 'Iron Boots',
    slot: 'boots', rarity: 'uncommon', gearTier: 1, requiredForgeLevel: 1,
    description: 'Heavy but protective. A bit slow, but you\'ll survive.',
    goldCost: 100,
    ingredients: [
      { resourceId: 'rough_leather', name: 'Rough Leather', quantity: 5 },
      { resourceId: 'iron_ore',      name: 'Iron Ore',      quantity: 3 },
    ],
    outputItem: { templateId: 'swift_sandals', name: 'Iron Boots', primaryStat: 'spd', primaryValue: 7, secondaryStats: [{ stat: 'end', value: 2 }], gearScore: 15 },
  },
  {
    id: 'arcane_ring',
    name: 'Arcane Ring',
    slot: 'ring', rarity: 'uncommon', gearTier: 1, requiredForgeLevel: 1,
    description: 'Arcane dust compressed into a simple band.',
    goldCost: 100,
    ingredients: [
      { resourceId: 'arcane_dust',   name: 'Arcane Dust',   quantity: 5 },
      { resourceId: 'iron_ore',      name: 'Iron Ore',      quantity: 2 },
    ],
    outputItem: { templateId: 'copper_ring', name: 'Arcane Ring', primaryStat: 'lck', primaryValue: 7, secondaryStats: [{ stat: 'ins', value: 2 }], gearScore: 15 },
  },
  {
    id: 'hunter_trinket',
    name: 'Hunter\'s Charm',
    slot: 'trinket', rarity: 'uncommon', gearTier: 1, requiredForgeLevel: 1,
    description: 'Scraps of leather and iron twisted into a lucky charm.',
    goldCost: 100,
    ingredients: [
      { resourceId: 'rough_leather', name: 'Rough Leather', quantity: 4 },
      { resourceId: 'arcane_dust',   name: 'Arcane Dust',   quantity: 3 },
    ],
    outputItem: { templateId: 'copper_ring', name: 'Hunter\'s Charm', primaryStat: 'ins', primaryValue: 7, secondaryStats: [{ stat: 'lck', value: 2 }], gearScore: 15 },
  },
];

// ── Tier 2 — Steel ────────────────────────────────────────────────────────────
// Quality resources + attuned T1 item (same slot, 5 runs). Requires Reinforced Forge.

const T2: CraftRecipe[] = [
  {
    id: 'steel_sword',
    name: 'Steel Sword',
    slot: 'weapon', rarity: 'rare', gearTier: 2, requiredForgeLevel: 2, requiredItemTier: 1,
    description: 'A tempered Iron Sword reforged with quality ore into true steel.',
    goldCost: 300,
    ingredients: [
      { resourceId: 'quality_ore',   name: 'Quality Ore',   quantity: 5 },
      { resourceId: 'spirit_thread', name: 'Spirit Thread', quantity: 2 },
    ],
    outputItem: { templateId: 'iron_sword', name: 'Steel Sword', primaryStat: 'pwr', primaryValue: 16, secondaryStats: [{ stat: 'spd', value: 4 }, { stat: 'end', value: 3 }], gearScore: 30 },
  },
  {
    id: 'steel_helm',
    name: 'Steel Helm',
    slot: 'helmet', rarity: 'rare', gearTier: 2, requiredForgeLevel: 2, requiredItemTier: 1,
    description: 'The Iron Helm is stripped down and rebuilt with reinforced plate.',
    goldCost: 300,
    ingredients: [
      { resourceId: 'quality_ore',   name: 'Quality Ore',   quantity: 4 },
      { resourceId: 'rough_leather', name: 'Rough Leather', quantity: 3 },
    ],
    outputItem: { templateId: 'chain_coif', name: 'Steel Helm', primaryStat: 'end', primaryValue: 15, secondaryStats: [{ stat: 'pwr', value: 4 }, { stat: 'ins', value: 3 }], gearScore: 30 },
  },
  {
    id: 'steel_chestplate',
    name: 'Steel Chestplate',
    slot: 'chest', rarity: 'rare', gearTier: 2, requiredForgeLevel: 2, requiredItemTier: 1,
    description: 'The Iron Chestplate is rebuilt with layered steel alloy.',
    goldCost: 300,
    ingredients: [
      { resourceId: 'quality_ore',   name: 'Quality Ore',   quantity: 6 },
      { resourceId: 'spirit_thread', name: 'Spirit Thread', quantity: 3 },
    ],
    outputItem: { templateId: 'chain_mail', name: 'Steel Chestplate', primaryStat: 'end', primaryValue: 17, secondaryStats: [{ stat: 'pwr', value: 5 }, { stat: 'lck', value: 3 }], gearScore: 30 },
  },
  {
    id: 'steel_boots',
    name: 'Steel Boots',
    slot: 'boots', rarity: 'rare', gearTier: 2, requiredForgeLevel: 2, requiredItemTier: 1,
    description: 'Iron Boots reshaped and reinforced for both speed and protection.',
    goldCost: 300,
    ingredients: [
      { resourceId: 'quality_ore',   name: 'Quality Ore',   quantity: 3 },
      { resourceId: 'spirit_thread', name: 'Spirit Thread', quantity: 3 },
    ],
    outputItem: { templateId: 'swift_sandals', name: 'Steel Boots', primaryStat: 'spd', primaryValue: 14, secondaryStats: [{ stat: 'end', value: 4 }, { stat: 'lck', value: 3 }], gearScore: 30 },
  },
  {
    id: 'spirit_ring',
    name: 'Spirit Ring',
    slot: 'ring', rarity: 'rare', gearTier: 2, requiredForgeLevel: 2, requiredItemTier: 1,
    description: 'The Arcane Ring is infused with refined spirit thread.',
    goldCost: 300,
    ingredients: [
      { resourceId: 'spirit_thread', name: 'Spirit Thread', quantity: 4 },
      { resourceId: 'arcane_dust',   name: 'Arcane Dust',   quantity: 4 },
    ],
    outputItem: { templateId: 'copper_ring', name: 'Spirit Ring', primaryStat: 'lck', primaryValue: 13, secondaryStats: [{ stat: 'ins', value: 5 }, { stat: 'pwr', value: 3 }], gearScore: 30 },
  },
  {
    id: 'spirit_trinket',
    name: 'Spirit Pendant',
    slot: 'trinket', rarity: 'rare', gearTier: 2, requiredForgeLevel: 2, requiredItemTier: 1,
    description: 'A Hunter\'s Charm reborn with spiritual energy.',
    goldCost: 300,
    ingredients: [
      { resourceId: 'spirit_thread', name: 'Spirit Thread', quantity: 3 },
      { resourceId: 'arcane_dust',   name: 'Arcane Dust',   quantity: 5 },
    ],
    outputItem: { templateId: 'copper_ring', name: 'Spirit Pendant', primaryStat: 'ins', primaryValue: 14, secondaryStats: [{ stat: 'lck', value: 5 }, { stat: 'spd', value: 3 }], gearScore: 30 },
  },
];

// ── Tier 3 — Mithril ──────────────────────────────────────────────────────────
// Mithril shards + attuned T2 item (same slot, 10 runs). Requires Master Forge.

const T3: CraftRecipe[] = [
  {
    id: 'mithril_sword',
    name: 'Mithril Blade',
    slot: 'weapon', rarity: 'epic', gearTier: 3, requiredForgeLevel: 3, requiredItemTier: 2,
    description: 'The Steel Sword is dissolved in mithril and recast into legend.',
    goldCost: 700,
    ingredients: [
      { resourceId: 'mithril_shard', name: 'Mithril Shard', quantity: 6 },
      { resourceId: 'quality_ore',   name: 'Quality Ore',   quantity: 4 },
    ],
    outputItem: { templateId: 'iron_sword', name: 'Mithril Blade', primaryStat: 'pwr', primaryValue: 22, secondaryStats: [{ stat: 'spd', value: 7 }, { stat: 'end', value: 5 }, { stat: 'lck', value: 4 }], gearScore: 50 },
  },
  {
    id: 'mithril_helm',
    name: 'Mithril Helm',
    slot: 'helmet', rarity: 'epic', gearTier: 3, requiredForgeLevel: 3, requiredItemTier: 2,
    description: 'A Steel Helm reforged in mithril fire.',
    goldCost: 700,
    ingredients: [
      { resourceId: 'mithril_shard', name: 'Mithril Shard', quantity: 5 },
      { resourceId: 'spirit_thread', name: 'Spirit Thread', quantity: 4 },
    ],
    outputItem: { templateId: 'chain_coif', name: 'Mithril Helm', primaryStat: 'end', primaryValue: 21, secondaryStats: [{ stat: 'pwr', value: 6 }, { stat: 'ins', value: 5 }, { stat: 'lck', value: 4 }], gearScore: 50 },
  },
  {
    id: 'mithril_chest',
    name: 'Mithril Cuirass',
    slot: 'chest', rarity: 'epic', gearTier: 3, requiredForgeLevel: 3, requiredItemTier: 2,
    description: 'The Steel Chestplate is submerged in liquid mithril.',
    goldCost: 700,
    ingredients: [
      { resourceId: 'mithril_shard', name: 'Mithril Shard', quantity: 8 },
      { resourceId: 'quality_ore',   name: 'Quality Ore',   quantity: 5 },
    ],
    outputItem: { templateId: 'chain_mail', name: 'Mithril Cuirass', primaryStat: 'end', primaryValue: 23, secondaryStats: [{ stat: 'pwr', value: 7 }, { stat: 'lck', value: 5 }, { stat: 'ins', value: 4 }], gearScore: 50 },
  },
  {
    id: 'mithril_boots',
    name: 'Mithril Greaves',
    slot: 'boots', rarity: 'epic', gearTier: 3, requiredForgeLevel: 3, requiredItemTier: 2,
    description: 'Steel Boots reborn in mithril — fleet and near-unbreakable.',
    goldCost: 700,
    ingredients: [
      { resourceId: 'mithril_shard', name: 'Mithril Shard', quantity: 5 },
      { resourceId: 'spirit_thread', name: 'Spirit Thread', quantity: 5 },
    ],
    outputItem: { templateId: 'swift_sandals', name: 'Mithril Greaves', primaryStat: 'spd', primaryValue: 20, secondaryStats: [{ stat: 'end', value: 6 }, { stat: 'lck', value: 5 }, { stat: 'pwr', value: 4 }], gearScore: 50 },
  },
  {
    id: 'mithril_ring',
    name: 'Mithril Band',
    slot: 'ring', rarity: 'epic', gearTier: 3, requiredForgeLevel: 3, requiredItemTier: 2,
    description: 'A Spirit Ring recrystallised in mithril essence.',
    goldCost: 700,
    ingredients: [
      { resourceId: 'mithril_shard', name: 'Mithril Shard', quantity: 4 },
      { resourceId: 'arcane_dust',   name: 'Arcane Dust',   quantity: 6 },
    ],
    outputItem: { templateId: 'copper_ring', name: 'Mithril Band', primaryStat: 'lck', primaryValue: 20, secondaryStats: [{ stat: 'ins', value: 7 }, { stat: 'pwr', value: 5 }, { stat: 'spd', value: 4 }], gearScore: 50 },
  },
  {
    id: 'mithril_trinket',
    name: 'Mithril Talisman',
    slot: 'trinket', rarity: 'epic', gearTier: 3, requiredForgeLevel: 3, requiredItemTier: 2,
    description: 'A Spirit Pendant encased in raw mithril crystal.',
    goldCost: 700,
    ingredients: [
      { resourceId: 'mithril_shard', name: 'Mithril Shard', quantity: 4 },
      { resourceId: 'spirit_thread', name: 'Spirit Thread', quantity: 6 },
    ],
    outputItem: { templateId: 'copper_ring', name: 'Mithril Talisman', primaryStat: 'ins', primaryValue: 21, secondaryStats: [{ stat: 'lck', value: 7 }, { stat: 'spd', value: 5 }, { stat: 'end', value: 4 }], gearScore: 50 },
  },
];

// ── Tier 4 — Void ─────────────────────────────────────────────────────────────
// Void shards + attuned T3 item (same slot, 15 runs). Requires Void Forge.

const T4: CraftRecipe[] = [
  {
    id: 'void_sword',
    name: 'Void Edge',
    slot: 'weapon', rarity: 'legendary', gearTier: 4, requiredForgeLevel: 4, requiredItemTier: 3,
    description: 'A Mithril Blade torn apart by void energy and reformed into the ultimate weapon.',
    goldCost: 1500,
    ingredients: [
      { resourceId: 'void_shard',    name: 'Void Shard',    quantity: 8 },
      { resourceId: 'mithril_shard', name: 'Mithril Shard', quantity: 5 },
    ],
    outputItem: { templateId: 'iron_sword', name: 'Void Edge', primaryStat: 'pwr', primaryValue: 34, secondaryStats: [{ stat: 'spd', value: 10 }, { stat: 'end', value: 8 }, { stat: 'lck', value: 7 }], gearScore: 75 },
  },
  {
    id: 'void_helm',
    name: 'Void Crown',
    slot: 'helmet', rarity: 'legendary', gearTier: 4, requiredForgeLevel: 4, requiredItemTier: 3,
    description: 'A Mithril Helm consumed by void and reborn.',
    goldCost: 1500,
    ingredients: [
      { resourceId: 'void_shard',    name: 'Void Shard',    quantity: 7 },
      { resourceId: 'mithril_shard', name: 'Mithril Shard', quantity: 4 },
    ],
    outputItem: { templateId: 'chain_coif', name: 'Void Crown', primaryStat: 'end', primaryValue: 32, secondaryStats: [{ stat: 'pwr', value: 9 }, { stat: 'ins', value: 8 }, { stat: 'lck', value: 6 }], gearScore: 75 },
  },
  {
    id: 'void_chest',
    name: 'Void Plate',
    slot: 'chest', rarity: 'legendary', gearTier: 4, requiredForgeLevel: 4, requiredItemTier: 3,
    description: 'A Mithril Cuirass shattered by the void and reforged from nothing.',
    goldCost: 1500,
    ingredients: [
      { resourceId: 'void_shard',    name: 'Void Shard',    quantity: 10 },
      { resourceId: 'mithril_shard', name: 'Mithril Shard', quantity: 6 },
    ],
    outputItem: { templateId: 'chain_mail', name: 'Void Plate', primaryStat: 'end', primaryValue: 35, secondaryStats: [{ stat: 'pwr', value: 10 }, { stat: 'lck', value: 8 }, { stat: 'spd', value: 6 }], gearScore: 75 },
  },
  {
    id: 'void_boots',
    name: 'Void Striders',
    slot: 'boots', rarity: 'legendary', gearTier: 4, requiredForgeLevel: 4, requiredItemTier: 3,
    description: 'Mithril Greaves dissolved in void essence. Move between worlds.',
    goldCost: 1500,
    ingredients: [
      { resourceId: 'void_shard',    name: 'Void Shard',    quantity: 7 },
      { resourceId: 'mithril_shard', name: 'Mithril Shard', quantity: 4 },
    ],
    outputItem: { templateId: 'swift_sandals', name: 'Void Striders', primaryStat: 'spd', primaryValue: 30, secondaryStats: [{ stat: 'end', value: 9 }, { stat: 'lck', value: 7 }, { stat: 'pwr', value: 6 }], gearScore: 75 },
  },
  {
    id: 'void_ring',
    name: 'Void Sigil',
    slot: 'ring', rarity: 'legendary', gearTier: 4, requiredForgeLevel: 4, requiredItemTier: 3,
    description: 'A Mithril Band inscribed with void glyphs and sealed.',
    goldCost: 1500,
    ingredients: [
      { resourceId: 'void_shard',    name: 'Void Shard',    quantity: 6 },
      { resourceId: 'arcane_dust',   name: 'Arcane Dust',   quantity: 8 },
    ],
    outputItem: { templateId: 'copper_ring', name: 'Void Sigil', primaryStat: 'lck', primaryValue: 30, secondaryStats: [{ stat: 'ins', value: 10 }, { stat: 'pwr', value: 7 }, { stat: 'spd', value: 6 }], gearScore: 75 },
  },
  {
    id: 'void_trinket',
    name: 'Void Phylactery',
    slot: 'trinket', rarity: 'legendary', gearTier: 4, requiredForgeLevel: 4, requiredItemTier: 3,
    description: 'A Mithril Talisman that holds a fragment of void within.',
    goldCost: 1500,
    ingredients: [
      { resourceId: 'void_shard',    name: 'Void Shard',    quantity: 6 },
      { resourceId: 'spirit_thread', name: 'Spirit Thread', quantity: 8 },
    ],
    outputItem: { templateId: 'copper_ring', name: 'Void Phylactery', primaryStat: 'ins', primaryValue: 32, secondaryStats: [{ stat: 'lck', value: 10 }, { stat: 'spd', value: 7 }, { stat: 'end', value: 6 }], gearScore: 75 },
  },
];

export const CRAFT_RECIPES: CraftRecipe[] = [...T1, ...T2, ...T3, ...T4];

export const ATTUNEMENT_RUNS_REQUIRED: Record<1 | 2 | 3, number> = { 1: 5, 2: 10, 3: 15 };

export const FORGE_UPGRADE_ID: Record<1 | 2 | 3 | 4, string> = {
  1: 'the_forge',
  2: 'reinforced_forge',
  3: 'master_forge',
  4: 'void_forge',
};

export interface ConversionRecipe {
  id: string;
  fromResourceId: string;
  fromName: string;
  fromQuantity: number;
  toResourceId: string;
  toName: string;
  toQuantity: number;
  fromIcon: string;
  toIcon: string;
}

export const CONVERSION_RECIPES: ConversionRecipe[] = [
  { id: 'convert_iron_to_quality',    fromResourceId: 'iron_ore',      fromName: 'Iron Ore',      fromQuantity: 3, toResourceId: 'quality_ore',    toName: 'Quality Ore',   toQuantity: 1, fromIcon: '🪨', toIcon: '💎' },
  { id: 'convert_quality_to_mithril', fromResourceId: 'quality_ore',   fromName: 'Quality Ore',   fromQuantity: 3, toResourceId: 'mithril_shard',  toName: 'Mithril Shard', toQuantity: 1, fromIcon: '💎', toIcon: '✨' },
  { id: 'convert_leather_to_thread',  fromResourceId: 'rough_leather', fromName: 'Rough Leather', fromQuantity: 3, toResourceId: 'spirit_thread',  toName: 'Spirit Thread', toQuantity: 1, fromIcon: '🧵', toIcon: '🌿' },
  { id: 'convert_thread_to_void',     fromResourceId: 'spirit_thread', fromName: 'Spirit Thread', fromQuantity: 3, toResourceId: 'void_shard',     toName: 'Void Shard',    toQuantity: 1, fromIcon: '🌿', toIcon: '🌑' },
  { id: 'convert_dust_to_thread',     fromResourceId: 'arcane_dust',   fromName: 'Arcane Dust',   fromQuantity: 3, toResourceId: 'spirit_thread',  toName: 'Spirit Thread', toQuantity: 1, fromIcon: '✨', toIcon: '🌿' },
];
