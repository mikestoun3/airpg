export type StoreReward =
  | { type: 'gold'; amount: number }
  | { type: 'essence'; amount: number }
  | { type: 'loot_case'; tier: string; rarityWeights: Record<string, number> };

export interface StoreItem {
  id: string;
  name: string;
  description: string;
  category: 'gold' | 'essence' | 'loot_case';
  icon: string;
  priceWei: string;
  priceDisplay: string;
  reward: StoreReward;
  badge?: string;
}

export const STORE_ITEMS: StoreItem[] = [
  // ── Gold packs ──────────────────────────────────────────────────
  {
    id: 'gold_small',
    name: 'Gold Pouch',
    description: '1,000 Gold',
    category: 'gold',
    icon: '💰',
    priceWei: '100000000000000000',
    priceDisplay: '0.1 POL',
    reward: { type: 'gold', amount: 1000 },
  },
  {
    id: 'gold_medium',
    name: 'Gold Chest',
    description: '6,000 Gold',
    category: 'gold',
    icon: '🪙',
    priceWei: '500000000000000000',
    priceDisplay: '0.5 POL',
    reward: { type: 'gold', amount: 6000 },
    badge: 'Popular',
  },
  {
    id: 'gold_large',
    name: 'Gold Vault',
    description: '15,000 Gold',
    category: 'gold',
    icon: '🏆',
    priceWei: '1000000000000000000',
    priceDisplay: '1 POL',
    reward: { type: 'gold', amount: 15000 },
    badge: 'Best Value',
  },
  // ── Essence packs ────────────────────────────────────────────────
  {
    id: 'essence_small',
    name: 'Essence Vial',
    description: '100 Essence',
    category: 'essence',
    icon: '🔮',
    priceWei: '100000000000000000',
    priceDisplay: '0.1 POL',
    reward: { type: 'essence', amount: 100 },
  },
  {
    id: 'essence_medium',
    name: 'Essence Flask',
    description: '600 Essence',
    category: 'essence',
    icon: '💜',
    priceWei: '500000000000000000',
    priceDisplay: '0.5 POL',
    reward: { type: 'essence', amount: 600 },
    badge: 'Popular',
  },
  {
    id: 'essence_large',
    name: 'Essence Crystal',
    description: '1,500 Essence',
    category: 'essence',
    icon: '✨',
    priceWei: '1000000000000000000',
    priceDisplay: '1 POL',
    reward: { type: 'essence', amount: 1500 },
    badge: 'Best Value',
  },
  // ── Loot cases ───────────────────────────────────────────────────
  {
    id: 'case_iron',
    name: 'Iron Case',
    description: 'Random T1–T2 item',
    category: 'loot_case',
    icon: '📦',
    priceWei: '50000000000000000',
    priceDisplay: '0.05 POL',
    reward: {
      type: 'loot_case',
      tier: 'iron',
      rarityWeights: { common: 40, uncommon: 40, rare: 18, epic: 2, legendary: 0 },
    },
  },
  {
    id: 'case_mithril',
    name: 'Mithril Case',
    description: 'Random T2–T3 item — guaranteed Rare+',
    category: 'loot_case',
    icon: '💎',
    priceWei: '200000000000000000',
    priceDisplay: '0.2 POL',
    reward: {
      type: 'loot_case',
      tier: 'mithril',
      rarityWeights: { common: 0, uncommon: 10, rare: 55, epic: 30, legendary: 5 },
    },
    badge: 'Popular',
  },
  {
    id: 'case_void',
    name: 'Void Case',
    description: 'Random T3–T4 item — Epic or Legendary',
    category: 'loot_case',
    icon: '🌑',
    priceWei: '500000000000000000',
    priceDisplay: '0.5 POL',
    reward: {
      type: 'loot_case',
      tier: 'void',
      rarityWeights: { common: 0, uncommon: 0, rare: 20, epic: 55, legendary: 25 },
    },
    badge: 'Premium',
  },
];
