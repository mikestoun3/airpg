import type { DungeonConfig } from '@/types/game';

export const DUNGEONS: DungeonConfig[] = [
  {
    id: 'goblin_warrens',
    name: 'Goblin Warrens',
    description: 'Shallow tunnels crawling with goblin scouts. Good for fresh adventurers.',
    tier: 1,
    durationMinutes: 5,
    baseDC: 20,
    minGearScore: 0,
    minLevel: 1,
    lootFocus: 'Gold, iron scraps, common gear',
    unlockCondition: {},
  },
  {
    id: 'forgotten_cellar',
    name: 'Forgotten Cellar',
    description: 'A merchant\'s cellar abandoned after a raid. Dusty but promising.',
    tier: 1,
    durationMinutes: 10,
    baseDC: 28,
    minGearScore: 0,
    minLevel: 1,
    lootFocus: 'Common gear, potions, small chance of uncommon',
    unlockCondition: {},
  },
  {
    id: 'ruined_watchtower',
    name: 'Ruined Watchtower',
    description: 'An old border fort now occupied by bandits and worse.',
    tier: 2,
    durationMinutes: 20,
    baseDC: 40,
    minGearScore: 15,
    minLevel: 4,
    lootFocus: 'Uncommon gear, stone dust, gold',
    unlockCondition: { minTier1Clears: 5, minLevel: 4 },
  },
  {
    id: 'collapsed_mine',
    name: 'Collapsed Mine',
    description: 'Ancient veins of rare ore, guarded by things that dwell in the dark.',
    tier: 2,
    durationMinutes: 30,
    baseDC: 45,
    minGearScore: 20,
    minLevel: 5,
    lootFocus: 'Ore, essence, rare gear chance',
    unlockCondition: { minTier1Clears: 8, minLevel: 5 },
  },
  {
    id: 'cursed_catacombs',
    name: 'Cursed Catacombs',
    description: 'Deep burial grounds corrupted by old magic. High risk, high reward.',
    tier: 3,
    durationMinutes: 60,
    baseDC: 60,
    minGearScore: 50,
    minLevel: 12,
    lootFocus: 'Rare gear, essence, legendary chance',
    unlockCondition: { minGearScore: 50, minLevel: 12 },
  },
  {
    id: 'bandit_stronghold',
    name: 'Bandit Stronghold',
    description: 'A fortified camp full of stolen wealth. Gold-hunters dream.',
    tier: 3,
    durationMinutes: 45,
    baseDC: 55,
    minGearScore: 45,
    minLevel: 11,
    lootFocus: 'Gold-heavy, unique item chance',
    unlockCondition: { minGearScore: 45, minLevel: 11 },
  },
];

export const getDungeon = (id: string): DungeonConfig | undefined =>
  DUNGEONS.find((d) => d.id === id);

export const getDungeonsByTier = (tier: number): DungeonConfig[] =>
  DUNGEONS.filter((d) => d.tier === tier);
