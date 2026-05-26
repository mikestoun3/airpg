import type { Rarity } from '@/types/game';

export interface LootTableEntry {
  templateId: string;
  weight: number;
}

export interface RarityWeights {
  common: number;
  uncommon: number;
  rare: number;
  epic: number;
  legendary: number;
}

export interface DungeonLootTable {
  dungeonId: string;
  baseGold: [number, number];
  goldMultiplier: number;
  essenceChance: number;
  essenceAmount: [number, number];
  rarityWeights: RarityWeights;
  items: Record<Rarity, LootTableEntry[]>;
}

export const LOOT_TABLES: Record<string, DungeonLootTable> = {
  goblin_warrens: {
    dungeonId: 'goblin_warrens',
    baseGold: [8, 25],
    goldMultiplier: 1,
    essenceChance: 0.05,
    essenceAmount: [1, 2],
    rarityWeights: { common: 65, uncommon: 25, rare: 8, epic: 1.5, legendary: 0.5 },
    items: {
      common: [
        { templateId: 'rusty_sword', weight: 2 },
        { templateId: 'chipped_dagger', weight: 2 },
        { templateId: 'leather_cap', weight: 2 },
        { templateId: 'leather_vest', weight: 2 },
        { templateId: 'worn_boots', weight: 2 },
        { templateId: 'copper_ring', weight: 2 },
        { templateId: 'lucky_coin', weight: 2 },
        { templateId: 'padded_coif', weight: 1 },
        { templateId: 'padded_armor', weight: 1 },
        { templateId: 'leather_boots', weight: 1 },
        { templateId: 'bone_ring', weight: 1 },
        { templateId: 'cracked_gem', weight: 1 },
      ],
      uncommon: [
        { templateId: 'iron_sword', weight: 2 },
        { templateId: 'iron_helmet', weight: 2 },
        { templateId: 'chain_mail', weight: 2 },
        { templateId: 'iron_greaves', weight: 2 },
        { templateId: 'silver_ring', weight: 2 },
        { templateId: 'silver_pendant', weight: 2 },
      ],
      rare: [
        { templateId: 'war_axe', weight: 2 },
        { templateId: 'chain_coif', weight: 2 },
        { templateId: 'scale_armor', weight: 2 },
        { templateId: 'swift_sandals', weight: 2 },
        { templateId: 'warriors_band', weight: 1 },
      ],
      epic: [
        { templateId: 'oak_staff', weight: 2 },
        { templateId: 'hunters_bow', weight: 1 },
        { templateId: 'wolf_fang', weight: 2 },
      ],
      legendary: [
        { templateId: 'silver_pendant', weight: 1 },
        { templateId: 'ancient_amulet', weight: 1 },
      ],
    },
  },

  forgotten_cellar: {
    dungeonId: 'forgotten_cellar',
    baseGold: [15, 40],
    goldMultiplier: 1,
    essenceChance: 0.1,
    essenceAmount: [1, 3],
    rarityWeights: { common: 58, uncommon: 28, rare: 10, epic: 3, legendary: 1 },
    items: {
      common: [
        { templateId: 'chipped_dagger', weight: 2 },
        { templateId: 'gnarled_staff', weight: 2 },
        { templateId: 'padded_coif', weight: 2 },
        { templateId: 'padded_armor', weight: 2 },
        { templateId: 'leather_boots', weight: 2 },
        { templateId: 'bone_ring', weight: 2 },
        { templateId: 'cracked_gem', weight: 2 },
      ],
      uncommon: [
        { templateId: 'iron_sword', weight: 2 },
        { templateId: 'oak_staff', weight: 2 },
        { templateId: 'chain_coif', weight: 2 },
        { templateId: 'scale_armor', weight: 2 },
        { templateId: 'swift_sandals', weight: 2 },
        { templateId: 'warriors_band', weight: 1 },
        { templateId: 'wolf_fang', weight: 1 },
      ],
      rare: [
        { templateId: 'war_axe', weight: 2 },
        { templateId: 'hunters_bow', weight: 2 },
        { templateId: 'iron_greaves', weight: 2 },
        { templateId: 'silver_ring', weight: 2 },
        { templateId: 'silver_pendant', weight: 2 },
      ],
      epic: [
        { templateId: 'steel_blade', weight: 1 },
        { templateId: 'plate_helm', weight: 1 },
        { templateId: 'shadow_hood', weight: 1 },
      ],
      legendary: [
        { templateId: 'arcane_focus', weight: 1 },
        { templateId: 'ancient_amulet', weight: 1 },
      ],
    },
  },

  ruined_watchtower: {
    dungeonId: 'ruined_watchtower',
    baseGold: [35, 80],
    goldMultiplier: 1.2,
    essenceChance: 0.25,
    essenceAmount: [2, 5],
    rarityWeights: { common: 50, uncommon: 30, rare: 14, epic: 4.5, legendary: 1.5 },
    items: {
      common: [
        { templateId: 'iron_sword', weight: 2 },
        { templateId: 'iron_helmet', weight: 2 },
        { templateId: 'chain_mail', weight: 2 },
        { templateId: 'iron_greaves', weight: 2 },
        { templateId: 'silver_ring', weight: 2 },
      ],
      uncommon: [
        { templateId: 'war_axe', weight: 2 },
        { templateId: 'oak_staff', weight: 2 },
        { templateId: 'chain_coif', weight: 2 },
        { templateId: 'scale_armor', weight: 2 },
        { templateId: 'swift_sandals', weight: 2 },
        { templateId: 'warriors_band', weight: 2 },
        { templateId: 'wolf_fang', weight: 2 },
      ],
      rare: [
        { templateId: 'steel_blade', weight: 2 },
        { templateId: 'plate_helm', weight: 2 },
        { templateId: 'plate_armor', weight: 2 },
        { templateId: 'plate_greaves', weight: 2 },
        { templateId: 'gold_ring', weight: 1 },
      ],
      epic: [
        { templateId: 'obsidian_dagger', weight: 2 },
        { templateId: 'shadow_hood', weight: 2 },
        { templateId: 'shadow_cloak', weight: 2 },
        { templateId: 'shadow_steps', weight: 1 },
        { templateId: 'arcane_seal', weight: 1 },
      ],
      legendary: [
        { templateId: 'arcane_focus', weight: 1 },
        { templateId: 'ancient_amulet', weight: 1 },
        { templateId: 'dragon_scale', weight: 1 },
      ],
    },
  },

  collapsed_mine: {
    dungeonId: 'collapsed_mine',
    baseGold: [20, 60],
    goldMultiplier: 0.8,
    essenceChance: 0.6,
    essenceAmount: [3, 8],
    rarityWeights: { common: 45, uncommon: 32, rare: 16, epic: 5.5, legendary: 1.5 },
    items: {
      common: [
        { templateId: 'iron_sword', weight: 1 },
        { templateId: 'iron_helmet', weight: 2 },
        { templateId: 'chain_mail', weight: 2 },
        { templateId: 'silver_ring', weight: 2 },
        { templateId: 'silver_pendant', weight: 2 },
      ],
      uncommon: [
        { templateId: 'war_axe', weight: 2 },
        { templateId: 'chain_coif', weight: 2 },
        { templateId: 'scale_armor', weight: 2 },
        { templateId: 'iron_greaves', weight: 2 },
        { templateId: 'warriors_band', weight: 2 },
        { templateId: 'wolf_fang', weight: 2 },
      ],
      rare: [
        { templateId: 'steel_blade', weight: 2 },
        { templateId: 'plate_helm', weight: 2 },
        { templateId: 'plate_armor', weight: 2 },
        { templateId: 'gold_ring', weight: 2 },
        { templateId: 'arcane_seal', weight: 1 },
      ],
      epic: [
        { templateId: 'obsidian_dagger', weight: 2 },
        { templateId: 'shadow_hood', weight: 1 },
        { templateId: 'shadow_cloak', weight: 2 },
        { templateId: 'shadow_steps', weight: 1 },
        { templateId: 'dragon_scale', weight: 2 },
      ],
      legendary: [
        { templateId: 'arcane_focus', weight: 1 },
        { templateId: 'ancient_amulet', weight: 2 },
        { templateId: 'dragon_scale', weight: 1 },
      ],
    },
  },

  cursed_catacombs: {
    dungeonId: 'cursed_catacombs',
    baseGold: [60, 150],
    goldMultiplier: 1.5,
    essenceChance: 0.8,
    essenceAmount: [5, 15],
    rarityWeights: { common: 30, uncommon: 30, rare: 24, epic: 12, legendary: 4 },
    items: {
      common: [
        { templateId: 'steel_blade', weight: 2 },
        { templateId: 'plate_helm', weight: 2 },
        { templateId: 'plate_armor', weight: 2 },
        { templateId: 'plate_greaves', weight: 2 },
      ],
      uncommon: [
        { templateId: 'obsidian_dagger', weight: 2 },
        { templateId: 'shadow_hood', weight: 2 },
        { templateId: 'shadow_cloak', weight: 2 },
        { templateId: 'shadow_steps', weight: 2 },
        { templateId: 'gold_ring', weight: 2 },
        { templateId: 'arcane_seal', weight: 2 },
      ],
      rare: [
        { templateId: 'arcane_focus', weight: 2 },
        { templateId: 'ancient_amulet', weight: 2 },
        { templateId: 'dragon_scale', weight: 2 },
      ],
      epic: [
        { templateId: 'arcane_focus', weight: 2 },
        { templateId: 'ancient_amulet', weight: 2 },
        { templateId: 'dragon_scale', weight: 2 },
      ],
      legendary: [
        { templateId: 'arcane_focus', weight: 1 },
        { templateId: 'ancient_amulet', weight: 1 },
        { templateId: 'dragon_scale', weight: 1 },
      ],
    },
  },

  bandit_stronghold: {
    dungeonId: 'bandit_stronghold',
    baseGold: [100, 250],
    goldMultiplier: 2,
    essenceChance: 0.4,
    essenceAmount: [3, 10],
    rarityWeights: { common: 35, uncommon: 30, rare: 22, epic: 10, legendary: 3 },
    items: {
      common: [
        { templateId: 'steel_blade', weight: 2 },
        { templateId: 'plate_helm', weight: 2 },
        { templateId: 'plate_armor', weight: 2 },
        { templateId: 'gold_ring', weight: 3 },
      ],
      uncommon: [
        { templateId: 'obsidian_dagger', weight: 2 },
        { templateId: 'shadow_hood', weight: 2 },
        { templateId: 'shadow_cloak', weight: 2 },
        { templateId: 'arcane_seal', weight: 2 },
        { templateId: 'dragon_scale', weight: 2 },
      ],
      rare: [
        { templateId: 'arcane_focus', weight: 2 },
        { templateId: 'ancient_amulet', weight: 2 },
        { templateId: 'shadow_steps', weight: 2 },
      ],
      epic: [
        { templateId: 'arcane_focus', weight: 2 },
        { templateId: 'ancient_amulet', weight: 2 },
        { templateId: 'dragon_scale', weight: 2 },
      ],
      legendary: [
        { templateId: 'arcane_focus', weight: 1 },
        { templateId: 'ancient_amulet', weight: 2 },
        { templateId: 'dragon_scale', weight: 1 },
      ],
    },
  },
};

export const getLootTable = (dungeonId: string): DungeonLootTable | undefined =>
  LOOT_TABLES[dungeonId];
