export interface Quest {
  id: string;
  title: string;
  description: string;
  type: 'social' | 'referral';
  icon: string;
  reward: { gold: number; essence: number };
  link?: string;
  requiredReferrals?: number;
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
];
