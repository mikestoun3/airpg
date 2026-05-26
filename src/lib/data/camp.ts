import type { CampUpgrade } from '@/types/game';

export const CAMP_UPGRADES: CampUpgrade[] = [
  {
    id: 'storage_room',
    name: 'Storage Room',
    description: 'Expand your inventory capacity.',
    effect: 'Inventory: 12 → 20 slots',
    goldCost: 200,
    essenceCost: 0,
    built: false,
  },
  {
    id: 'the_forge',
    name: 'The Forge',
    description: 'Unlock item salvage value bonus and enhancement hints.',
    effect: '+25% salvage gold return',
    goldCost: 150,
    essenceCost: 30,
    built: false,
    requires: 'storage_room',
  },
  {
    id: 'the_shrine',
    name: 'The Shrine',
    description: 'Ancient magic accelerates your hero\'s return.',
    effect: '-10% all run durations',
    goldCost: 500,
    essenceCost: 80,
    built: false,
    requires: 'the_forge',
  },
  {
    id: 'the_library',
    name: 'The Library',
    description: 'Research grants foresight before each expedition.',
    effect: 'Reveals dungeon loot tier before sending',
    goldCost: 300,
    essenceCost: 50,
    built: false,
  },
  {
    id: 'armory',
    name: 'Armory',
    description: 'Store alternate loadout presets.',
    effect: '+1 saved equipment preset',
    goldCost: 250,
    essenceCost: 0,
    built: false,
    requires: 'storage_room',
  },
];

export function getCampUpgradesWithState(builtIds: string[]): CampUpgrade[] {
  return CAMP_UPGRADES.map((u) => ({ ...u, built: builtIds.includes(u.id) }));
}
