export interface Quest {
  id: string;
  title: string;
  description: string;
  type: 'social' | 'referral' | 'floor';
  icon: string;
  reward: { gold: number; essence: number };
  link?: string;
  requiredReferrals?: number;
  dungeonId?: string;
  dungeonName?: string;
  requiredFloor?: number;
}

export const QUESTS: Quest[] = [
  {
    id: 'follow_twitter',
    title: 'Follow on X (Twitter)',
    description: 'Follow @AirPGio on X / Twitter',
    type: 'social',
    icon: '𝕏',
    reward: { gold: 200, essence: 0 },
    link: 'https://x.com/AirPGio',
  },
  {
    id: 'join_telegram',
    title: 'Join Telegram',
    description: 'Join the AirPG Telegram community',
    type: 'social',
    icon: '✈',
    reward: { gold: 200, essence: 0 },
    link: 'https://t.me/AirPGio',
  },
  {
    id: 'join_discord',
    title: 'Join Discord',
    description: 'Join the AirPG Discord server',
    type: 'social',
    icon: '💬',
    reward: { gold: 200, essence: 20 },
    link: 'https://discord.gg/airpg',
  },
  {
    id: 'referral_1',
    title: 'First Recruit',
    description: 'Invite 1 friend using your referral link',
    type: 'referral',
    icon: '👥',
    reward: { gold: 500, essence: 0 },
    requiredReferrals: 1,
  },
  {
    id: 'referral_3',
    title: 'Squad Commander',
    description: 'Invite 3 friends using your referral link',
    type: 'referral',
    icon: '⚔',
    reward: { gold: 1500, essence: 150 },
    requiredReferrals: 3,
  },
  {
    id: 'referral_5',
    title: 'War Chief',
    description: 'Invite 5 friends using your referral link',
    type: 'referral',
    icon: '👑',
    reward: { gold: 3000, essence: 500 },
    requiredReferrals: 5,
  },
  {
    id: 'referral_10',
    title: 'Legendary Recruiter',
    description: 'Invite 10 friends using your referral link',
    type: 'referral',
    icon: '🌟',
    reward: { gold: 8000, essence: 2000 },
    requiredReferrals: 10,
  },

  // ── Floor milestone quests ────────────────────────────────────────────────────
  { id: 'floor_goblin_warrens_25',    type: 'floor', icon: '🗺', title: 'Goblin Depths',         description: 'Reach floor 25 of the Goblin Warrens',      dungeonId: 'goblin_warrens',    dungeonName: 'Goblin Warrens',    requiredFloor: 25,  reward: { gold: 300,  essence: 30  } },
  { id: 'floor_goblin_warrens_50',    type: 'floor', icon: '🗺', title: 'Goblin Abyss',           description: 'Reach floor 50 of the Goblin Warrens',      dungeonId: 'goblin_warrens',    dungeonName: 'Goblin Warrens',    requiredFloor: 50,  reward: { gold: 600,  essence: 80  } },
  { id: 'floor_goblin_warrens_100',   type: 'floor', icon: '🗺', title: 'Goblin Overlord',        description: 'Reach floor 100 of the Goblin Warrens',     dungeonId: 'goblin_warrens',    dungeonName: 'Goblin Warrens',    requiredFloor: 100, reward: { gold: 1500, essence: 200 } },

  { id: 'floor_forgotten_cellar_25',  type: 'floor', icon: '🗺', title: 'Cellar Haunter',         description: 'Reach floor 25 of the Forgotten Cellar',    dungeonId: 'forgotten_cellar',  dungeonName: 'Forgotten Cellar',  requiredFloor: 25,  reward: { gold: 300,  essence: 30  } },
  { id: 'floor_forgotten_cellar_50',  type: 'floor', icon: '🗺', title: 'Cellar Ravager',         description: 'Reach floor 50 of the Forgotten Cellar',    dungeonId: 'forgotten_cellar',  dungeonName: 'Forgotten Cellar',  requiredFloor: 50,  reward: { gold: 600,  essence: 80  } },
  { id: 'floor_forgotten_cellar_100', type: 'floor', icon: '🗺', title: 'Cellar Legend',          description: 'Reach floor 100 of the Forgotten Cellar',   dungeonId: 'forgotten_cellar',  dungeonName: 'Forgotten Cellar',  requiredFloor: 100, reward: { gold: 1500, essence: 200 } },

  { id: 'floor_ruined_watchtower_25', type: 'floor', icon: '🗺', title: 'Tower Climber',          description: 'Reach floor 25 of the Ruined Watchtower',   dungeonId: 'ruined_watchtower', dungeonName: 'Ruined Watchtower', requiredFloor: 25,  reward: { gold: 500,  essence: 60  } },
  { id: 'floor_ruined_watchtower_50', type: 'floor', icon: '🗺', title: 'Tower Conqueror',        description: 'Reach floor 50 of the Ruined Watchtower',   dungeonId: 'ruined_watchtower', dungeonName: 'Ruined Watchtower', requiredFloor: 50,  reward: { gold: 1000, essence: 120 } },
  { id: 'floor_ruined_watchtower_100',type: 'floor', icon: '🗺', title: 'Tower Sovereign',        description: 'Reach floor 100 of the Ruined Watchtower',  dungeonId: 'ruined_watchtower', dungeonName: 'Ruined Watchtower', requiredFloor: 100, reward: { gold: 2500, essence: 300 } },

  { id: 'floor_collapsed_mine_25',    type: 'floor', icon: '🗺', title: 'Mine Delver',            description: 'Reach floor 25 of the Collapsed Mine',      dungeonId: 'collapsed_mine',    dungeonName: 'Collapsed Mine',    requiredFloor: 25,  reward: { gold: 500,  essence: 60  } },
  { id: 'floor_collapsed_mine_50',    type: 'floor', icon: '🗺', title: 'Mine Crusher',           description: 'Reach floor 50 of the Collapsed Mine',      dungeonId: 'collapsed_mine',    dungeonName: 'Collapsed Mine',    requiredFloor: 50,  reward: { gold: 1000, essence: 120 } },
  { id: 'floor_collapsed_mine_100',   type: 'floor', icon: '🗺', title: 'Mine Warlord',           description: 'Reach floor 100 of the Collapsed Mine',     dungeonId: 'collapsed_mine',    dungeonName: 'Collapsed Mine',    requiredFloor: 100, reward: { gold: 2500, essence: 300 } },

  { id: 'floor_cursed_catacombs_25',  type: 'floor', icon: '🗺', title: 'Catacomb Wanderer',      description: 'Reach floor 25 of the Cursed Catacombs',    dungeonId: 'cursed_catacombs',  dungeonName: 'Cursed Catacombs',  requiredFloor: 25,  reward: { gold: 800,  essence: 100 } },
  { id: 'floor_cursed_catacombs_50',  type: 'floor', icon: '🗺', title: 'Catacomb Champion',      description: 'Reach floor 50 of the Cursed Catacombs',    dungeonId: 'cursed_catacombs',  dungeonName: 'Cursed Catacombs',  requiredFloor: 50,  reward: { gold: 1800, essence: 200 } },
  { id: 'floor_cursed_catacombs_100', type: 'floor', icon: '🗺', title: 'Catacomb Overlord',      description: 'Reach floor 100 of the Cursed Catacombs',   dungeonId: 'cursed_catacombs',  dungeonName: 'Cursed Catacombs',  requiredFloor: 100, reward: { gold: 4000, essence: 500 } },

  { id: 'floor_bandit_stronghold_25', type: 'floor', icon: '🗺', title: 'Stronghold Raider',      description: 'Reach floor 25 of the Bandit Stronghold',   dungeonId: 'bandit_stronghold', dungeonName: 'Bandit Stronghold', requiredFloor: 25,  reward: { gold: 800,  essence: 100 } },
  { id: 'floor_bandit_stronghold_50', type: 'floor', icon: '🗺', title: 'Stronghold Warlord',     description: 'Reach floor 50 of the Bandit Stronghold',   dungeonId: 'bandit_stronghold', dungeonName: 'Bandit Stronghold', requiredFloor: 50,  reward: { gold: 1800, essence: 200 } },
  { id: 'floor_bandit_stronghold_100',type: 'floor', icon: '🗺', title: 'Stronghold Sovereign',   description: 'Reach floor 100 of the Bandit Stronghold',  dungeonId: 'bandit_stronghold', dungeonName: 'Bandit Stronghold', requiredFloor: 100, reward: { gold: 4000, essence: 500 } },
];
