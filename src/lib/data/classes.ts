import type { CharacterClass, StatKey } from '@/types/game';

export interface ClassDef {
  id: CharacterClass;
  name: string;
  description: string;
  portrait: string;
  avatar: string;
  color: string;
  hpBase: number;
  hpPerEnd: number;
  atkPerPwr: number;
  defPerEnd: number;
  evaPerSpd: number;
  aspdBase: number;
  aspdPerSpd: number;
  critPerLck: number;
  primaryStats: StatKey[];
}

export const CLASSES: ClassDef[] = [
  {
    id: 'warrior',
    name: 'Warrior',
    description: 'Frontline bruiser. High HP and defense, punishes enemies who stand their ground.',
    portrait: '/icons/character_portrait.png',
    avatar: '/icons/character_avatar.png',
    color: '#ef4444',
    hpBase: 120,
    hpPerEnd: 12,
    atkPerPwr: 1.8,
    defPerEnd: 3.0,
    evaPerSpd: 1.0,
    aspdBase: 1.0,
    aspdPerSpd: 0.03,
    critPerLck: 0.5,
    primaryStats: ['pwr', 'end'],
  },
  {
    id: 'assassin',
    name: 'Assassin',
    description: 'High-speed predator. Excels at dodging and landing multiple fast strikes.',
    portrait: '/icons/character_portrait_female.png',
    avatar: '/icons/character_portrait_female.png',
    color: '#a855f7',
    hpBase: 80,
    hpPerEnd: 8,
    atkPerPwr: 2.0,
    defPerEnd: 1.0,
    evaPerSpd: 2.5,
    aspdBase: 1.2,
    aspdPerSpd: 0.06,
    critPerLck: 1.5,
    primaryStats: ['spd', 'lck'],
  },
  {
    id: 'mage',
    name: 'Mage',
    description: 'Arcane specialist. Glass cannon with devastating magic damage and high crit.',
    portrait: '/icons/character_portrait_mage.svg',
    avatar: '/icons/character_portrait_mage.svg',
    color: '#06b6d4',
    hpBase: 90,
    hpPerEnd: 8,
    atkPerPwr: 2.4,
    defPerEnd: 1.5,
    evaPerSpd: 1.5,
    aspdBase: 0.8,
    aspdPerSpd: 0.02,
    critPerLck: 1.2,
    primaryStats: ['pwr', 'ins'],
  },
];

export function getClass(id: CharacterClass): ClassDef {
  return CLASSES.find(c => c.id === id) ?? CLASSES[0];
}
