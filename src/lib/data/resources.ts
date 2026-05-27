export interface ResourceDef {
  id: string;
  name: string;
  rarity: 'common' | 'uncommon' | 'rare';
  icon: string;
  sprite: string;
}

export const RESOURCES: ResourceDef[] = [
  { id: 'iron_ore',       name: 'Iron Ore',       rarity: 'common',   icon: '⛏', sprite: '/icons/res_iron.png'     },
  { id: 'rough_leather',  name: 'Rough Leather',  rarity: 'common',   icon: '🟫', sprite: '/icons/res_leather.png'  },
  { id: 'arcane_dust',    name: 'Arcane Dust',    rarity: 'common',   icon: '✦', sprite: '/icons/res_mystic.png'   },
  { id: 'quality_ore',    name: 'Quality Ore',    rarity: 'uncommon', icon: '💎', sprite: '/icons/res_gems.png'     },
  { id: 'spirit_thread',  name: 'Spirit Thread',  rarity: 'uncommon', icon: '🔮', sprite: '/icons/res_energy.png'  },
  { id: 'mithril_shard',  name: 'Mithril Shard',  rarity: 'rare',     icon: '💠', sprite: '/icons/res_crystals.png'},
  { id: 'void_shard',     name: 'Void Shard',     rarity: 'rare',     icon: '🌑', sprite: '/icons/res_crystals.png'},
];

export function getResourceSprite(resourceId: string): string | undefined {
  return RESOURCES.find((r) => r.id === resourceId)?.sprite;
}

export const getResource = (id: string) => RESOURCES.find((r) => r.id === id);

export interface ResourceDrop {
  resourceId: string;
  chance: number;
  minQty: number;
  maxQty: number;
}

export const DUNGEON_RESOURCE_DROPS: Record<string, ResourceDrop[]> = {
  goblin_warrens: [
    { resourceId: 'iron_ore',      chance: 0.45, minQty: 1, maxQty: 3 },
    { resourceId: 'rough_leather', chance: 0.35, minQty: 1, maxQty: 2 },
    { resourceId: 'quality_ore',   chance: 0.08, minQty: 1, maxQty: 1 },
  ],
  forgotten_cellar: [
    { resourceId: 'arcane_dust',   chance: 0.40, minQty: 1, maxQty: 3 },
    { resourceId: 'rough_leather', chance: 0.28, minQty: 1, maxQty: 2 },
    { resourceId: 'spirit_thread', chance: 0.08, minQty: 1, maxQty: 1 },
  ],
  ruined_watchtower: [
    { resourceId: 'rough_leather', chance: 0.40, minQty: 1, maxQty: 3 },
    { resourceId: 'iron_ore',      chance: 0.32, minQty: 1, maxQty: 2 },
    { resourceId: 'quality_ore',   chance: 0.15, minQty: 1, maxQty: 2 },
  ],
  collapsed_mine: [
    { resourceId: 'iron_ore',      chance: 0.55, minQty: 2, maxQty: 4 },
    { resourceId: 'quality_ore',   chance: 0.40, minQty: 1, maxQty: 3 },
    { resourceId: 'mithril_shard', chance: 0.12, minQty: 1, maxQty: 2 },
  ],
  cursed_catacombs: [
    { resourceId: 'arcane_dust',   chance: 0.45, minQty: 2, maxQty: 4 },
    { resourceId: 'spirit_thread', chance: 0.28, minQty: 1, maxQty: 2 },
    { resourceId: 'mithril_shard', chance: 0.12, minQty: 1, maxQty: 2 },
    { resourceId: 'void_shard',    chance: 0.05, minQty: 1, maxQty: 1 },
  ],
  bandit_stronghold: [
    { resourceId: 'rough_leather', chance: 0.40, minQty: 1, maxQty: 3 },
    { resourceId: 'iron_ore',      chance: 0.25, minQty: 1, maxQty: 2 },
    { resourceId: 'quality_ore',   chance: 0.20, minQty: 1, maxQty: 2 },
    { resourceId: 'void_shard',    chance: 0.05, minQty: 1, maxQty: 1 },
  ],
};
