import type { ItemTemplate, EquipmentSlot, StatKey } from '@/types/game';

export const ITEM_TEMPLATES: ItemTemplate[] = [
  // T1 Weapons
  { id: 'rusty_sword', name: 'Rusty Sword', slot: 'weapon', primaryStat: 'pwr', tier: 1 },
  { id: 'chipped_dagger', name: 'Chipped Dagger', slot: 'weapon', primaryStat: 'pwr', tier: 1 },
  { id: 'gnarled_staff', name: 'Gnarled Staff', slot: 'weapon', primaryStat: 'ins', tier: 1 },
  { id: 'short_bow', name: 'Short Bow', slot: 'weapon', primaryStat: 'lck', tier: 1 },

  // T2 Weapons
  { id: 'iron_sword', name: 'Iron Sword', slot: 'weapon', primaryStat: 'pwr', tier: 2 },
  { id: 'war_axe', name: 'War Axe', slot: 'weapon', primaryStat: 'pwr', tier: 2 },
  { id: 'oak_staff', name: 'Oak Staff', slot: 'weapon', primaryStat: 'ins', tier: 2 },
  { id: 'hunters_bow', name: "Hunter's Bow", slot: 'weapon', primaryStat: 'spd', tier: 2 },

  // T3 Weapons
  { id: 'steel_blade', name: 'Steel Blade', slot: 'weapon', primaryStat: 'pwr', tier: 3 },
  { id: 'obsidian_dagger', name: 'Obsidian Dagger', slot: 'weapon', primaryStat: 'pwr', tier: 3 },
  { id: 'arcane_focus', name: 'Arcane Focus', slot: 'weapon', primaryStat: 'ins', tier: 3 },

  // T1 Helmets
  { id: 'leather_cap', name: 'Leather Cap', slot: 'helmet', primaryStat: 'end', tier: 1 },
  { id: 'padded_coif', name: 'Padded Coif', slot: 'helmet', primaryStat: 'end', tier: 1 },

  // T2 Helmets
  { id: 'iron_helmet', name: 'Iron Helmet', slot: 'helmet', primaryStat: 'end', tier: 2 },
  { id: 'chain_coif', name: 'Chain Coif', slot: 'helmet', primaryStat: 'end', tier: 2 },

  // T3 Helmets
  { id: 'plate_helm', name: 'Plate Helm', slot: 'helmet', primaryStat: 'end', tier: 3 },
  { id: 'shadow_hood', name: 'Shadow Hood', slot: 'helmet', primaryStat: 'lck', tier: 3 },

  // T1 Chests
  { id: 'leather_vest', name: 'Leather Vest', slot: 'chest', primaryStat: 'end', tier: 1 },
  { id: 'padded_armor', name: 'Padded Armor', slot: 'chest', primaryStat: 'end', tier: 1 },

  // T2 Chests
  { id: 'chain_mail', name: 'Chain Mail', slot: 'chest', primaryStat: 'end', tier: 2 },
  { id: 'scale_armor', name: 'Scale Armor', slot: 'chest', primaryStat: 'end', tier: 2 },

  // T3 Chests
  { id: 'plate_armor', name: 'Plate Armor', slot: 'chest', primaryStat: 'end', tier: 3 },
  { id: 'shadow_cloak', name: 'Shadow Cloak', slot: 'chest', primaryStat: 'spd', tier: 3 },

  // T1 Boots
  { id: 'worn_boots', name: 'Worn Boots', slot: 'boots', primaryStat: 'spd', tier: 1 },
  { id: 'leather_boots', name: 'Leather Boots', slot: 'boots', primaryStat: 'spd', tier: 1 },

  // T2 Boots
  { id: 'iron_greaves', name: 'Iron Greaves', slot: 'boots', primaryStat: 'end', tier: 2 },
  { id: 'swift_sandals', name: 'Swift Sandals', slot: 'boots', primaryStat: 'spd', tier: 2 },

  // T3 Boots
  { id: 'plate_greaves', name: 'Plate Greaves', slot: 'boots', primaryStat: 'end', tier: 3 },
  { id: 'shadow_steps', name: 'Shadow Steps', slot: 'boots', primaryStat: 'spd', tier: 3 },

  // T1 Rings
  { id: 'copper_ring', name: 'Copper Ring', slot: 'ring', primaryStat: 'lck', tier: 1 },
  { id: 'bone_ring', name: 'Bone Ring', slot: 'ring', primaryStat: 'end', tier: 1 },

  // T2 Rings
  { id: 'silver_ring', name: 'Silver Ring', slot: 'ring', primaryStat: 'lck', tier: 2 },
  { id: 'warriors_band', name: "Warrior's Band", slot: 'ring', primaryStat: 'pwr', tier: 2 },

  // T3 Rings
  { id: 'gold_ring', name: 'Gold Ring', slot: 'ring', primaryStat: 'lck', tier: 3 },
  { id: 'arcane_seal', name: 'Arcane Seal', slot: 'ring', primaryStat: 'ins', tier: 3 },

  // T1 Trinkets
  { id: 'lucky_coin', name: 'Lucky Coin', slot: 'trinket', primaryStat: 'lck', tier: 1 },
  { id: 'cracked_gem', name: 'Cracked Gem', slot: 'trinket', primaryStat: 'ins', tier: 1 },

  // T2 Trinkets
  { id: 'silver_pendant', name: 'Silver Pendant', slot: 'trinket', primaryStat: 'ins', tier: 2 },
  { id: 'wolf_fang', name: 'Wolf Fang', slot: 'trinket', primaryStat: 'pwr', tier: 2 },

  // T3 Trinkets
  { id: 'ancient_amulet', name: 'Ancient Amulet', slot: 'trinket', primaryStat: 'ins', tier: 3 },
  { id: 'dragon_scale', name: 'Dragon Scale', slot: 'trinket', primaryStat: 'end', tier: 3 },
];

export const getTemplate = (id: string): ItemTemplate | undefined =>
  ITEM_TEMPLATES.find((t) => t.id === id);

export const getTemplatesByTier = (tier: number): ItemTemplate[] =>
  ITEM_TEMPLATES.filter((t) => t.tier === tier);

export const getTemplatesBySlot = (slot: EquipmentSlot): ItemTemplate[] =>
  ITEM_TEMPLATES.filter((t) => t.slot === slot);
