export type StatKey = 'pwr' | 'end' | 'lck' | 'spd' | 'ins';

export type EquipmentSlot = 'weapon' | 'helmet' | 'chest' | 'boots' | 'ring' | 'trinket';

export type Rarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';

export type Difficulty = 'normal' | 'hardened' | 'nightmare';

export type CharacterStatus = 'idle' | 'on_run' | 'injured';

export type RunOutcome = 'critical_success' | 'success' | 'partial' | 'failure' | 'critical_failure';

export type DungeonTier = 1 | 2 | 3 | 4;

export interface SpecialEffect {
  id: string;
  name: string;
  description: string;
}

export interface ItemTemplate {
  id: string;
  name: string;
  slot: EquipmentSlot;
  primaryStat: StatKey;
  tier: DungeonTier;
  flavorText?: string;
}

export type GearTier = 1 | 2 | 3 | 4;

export const ATTUNEMENT_REQUIRED: Record<GearTier, number> = { 1: 5, 2: 10, 3: 15, 4: 0 };
export const GEAR_TIER_NAMES: Record<GearTier, string> = { 1: 'Iron', 2: 'Steel', 3: 'Mithril', 4: 'Void' };

export interface ItemInstance {
  id: string;
  templateId: string;
  name: string;
  slot: EquipmentSlot;
  rarity: Rarity;
  primaryStat: StatKey;
  primaryValue: number;
  secondaryStats: Array<{ stat: StatKey; value: number }>;
  specialEffects: SpecialEffect[];
  gearScore: number;
  gearTier?: GearTier;
  attunementRuns?: number;
  upgradeLevel?: number;
}

export const UPGRADE_GOLD_BASE: Record<Rarity, number> = {
  common: 50,
  uncommon: 120,
  rare: 300,
  epic: 700,
  legendary: 1800,
};
export const UPGRADE_MAX = 5;

export interface FloorResult {
  floor: number;
  monsterName: string;
  isBoss: boolean;
  dc: number;
  roll: number;
  effective: number;
  outcome: 'success' | 'partial' | 'failure';
  items: ItemInstance[];
  gold: number;
  essence: number;
  resources: ResourceStack[];
}

export interface DungeonConfig {
  id: string;
  name: string;
  description: string;
  tier: DungeonTier;
  durationMinutes: number;
  baseDC: number;
  minGearScore: number;
  minLevel: number;
  lootFocus: string;
  unlockCondition: {
    minTier1Clears?: number;
    minLevel?: number;
    minGearScore?: number;
  };
  floorDCStep: number;
  monsters: string[];
  bossTitle: string;
}

export interface Character {
  id: string;
  name: string;
  level: number;
  xp: number;
  xpToNext: number;
  pwr: number;
  end: number;
  lck: number;
  spd: number;
  ins: number;
  gold: number;
  essence: number;
  relics: number;
  gearScore: number;
  combatRating: number;
  status: CharacterStatus;
  injuredUntil?: number;
  statPoints: number;
  nicknameSet: boolean;
  seasonPoints: number;
}

export interface ResourceStack {
  resourceId: string;
  name: string;
  icon: string;
  quantity: number;
}

export interface RunPreviewEvent {
  type: 'item' | 'resource' | 'essence';
  revealAt: number;
  label: string;
  rarity?: Rarity;
  icon?: string;
  resourceId?: string;
}

export interface CraftRecipe {
  id: string;
  name: string;
  slot: EquipmentSlot;
  rarity: Rarity;
  gearTier: GearTier;
  requiredForgeLevel: 1 | 2 | 3 | 4;
  requiredItemTier?: 1 | 2 | 3;
  description: string;
  goldCost: number;
  ingredients: { resourceId: string; name: string; quantity: number }[];
  outputItem: {
    templateId: string;
    name: string;
    primaryStat: StatKey;
    primaryValue: number;
    secondaryStats: Array<{ stat: StatKey; value: number }>;
    gearScore: number;
  };
}

export interface ActiveRun {
  id: string;
  dungeonId: string;
  dungeonName: string;
  difficulty: Difficulty;
  startTime: number;
  endTime: number;
  previewEvents?: RunPreviewEvent[];
  consumableUsed?: string;
  startFloor?: number;
  floorsAttempted?: number;
}

export interface RunResult {
  runId: string;
  dungeonId: string;
  dungeonName: string;
  difficulty: Difficulty;
  outcome: RunOutcome;
  loot: ItemInstance[];
  goldGained: number;
  essenceGained: number;
  xpGained: number;
  injured: boolean;
  injuryDurationMinutes?: number;
  combatRoll: number;
  dc: number;
  resourcesGained: ResourceStack[];
  startFloor?: number;
  floorsCompleted?: number;
  floorResults?: FloorResult[];
  seasonPoints?: number;
}

export interface Equipment {
  weapon: ItemInstance | null;
  helmet: ItemInstance | null;
  chest: ItemInstance | null;
  boots: ItemInstance | null;
  ring: ItemInstance | null;
  trinket: ItemInstance | null;
}

export interface CampUpgrade {
  id: string;
  name: string;
  description: string;
  effect: string;
  goldCost: number;
  essenceCost: number;
  built: boolean;
  requires?: string;
}

export interface GameState {
  character: Character;
  equipment: Equipment;
  inventory: ItemInstance[];
  activeRun: ActiveRun | null;
  pendingResult: RunResult | null;
  campUpgrades: CampUpgrade[];
  unlockedDungeons: string[];
  tier1Clears: number;
  resources: ResourceStack[];
  walletAddress: string | null;
  savedFloors: Record<string, number>;
}

export const RARITY_ORDER: Rarity[] = ['common', 'uncommon', 'rare', 'epic', 'legendary'];

export const RARITY_COLORS: Record<Rarity, string> = {
  common: '#9ca3af',
  uncommon: '#4ade80',
  rare: '#60a5fa',
  epic: '#c084fc',
  legendary: '#fbbf24',
};

export const DIFFICULTY_LABELS: Record<Difficulty, string> = {
  normal: 'Normal',
  hardened: 'Hardened',
  nightmare: 'Nightmare',
};

export const STAT_LABELS: Record<StatKey, string> = {
  pwr: 'Power',
  end: 'Endurance',
  lck: 'Luck',
  spd: 'Speed',
  ins: 'Insight',
};

export const SLOT_LABELS: Record<EquipmentSlot, string> = {
  weapon: 'Weapon',
  helmet: 'Helmet',
  chest: 'Chest',
  boots: 'Boots',
  ring: 'Ring',
  trinket: 'Trinket',
};
