'use client';
import type { Rarity } from '@/types/game';

export const RARITY_TEXT: Record<Rarity, string> = {
  common:    'text-slate-400',
  uncommon:  'text-emerald-400',
  rare:      'text-blue-400',
  epic:      'text-purple-400',
  legendary: 'text-amber-400',
};

export const RARITY_BORDER: Record<Rarity, string> = {
  common:    'border-slate-600/30',
  uncommon:  'border-emerald-500/30',
  rare:      'border-blue-500/30',
  epic:      'border-purple-500/40',
  legendary: 'border-amber-400/50',
};

export const RARITY_BG: Record<Rarity, string> = {
  common:    'bg-slate-800/30',
  uncommon:  'bg-emerald-900/20',
  rare:      'bg-blue-900/20',
  epic:      'bg-purple-900/25',
  legendary: 'bg-amber-900/20',
};

export const RARITY_BADGE_BG: Record<Rarity, string> = {
  common:    'bg-slate-700/60 text-slate-400',
  uncommon:  'bg-emerald-900/60 text-emerald-400',
  rare:      'bg-blue-900/60 text-blue-400',
  epic:      'bg-purple-900/60 text-purple-400',
  legendary: 'bg-amber-900/60 text-amber-400',
};

export const RARITY_GLOW: Record<Rarity, string> = {
  common:    '',
  uncommon:  '',
  rare:      '',
  epic:      'rarity-epic',
  legendary: 'rarity-legendary',
};

interface Props {
  rarity: Rarity;
  children: React.ReactNode;
  className?: string;
}

export function RarityText({ rarity, children, className = '' }: Props) {
  return <span className={`${RARITY_TEXT[rarity]} ${className}`}>{children}</span>;
}

export function RarityBorder({ rarity, children, className = '' }: Props) {
  return (
    <div className={`border ${RARITY_BORDER[rarity]} ${RARITY_BG[rarity]} ${RARITY_GLOW[rarity]} rounded-xl ${className}`}>
      {children}
    </div>
  );
}
