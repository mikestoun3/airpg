'use client';
import type { ItemInstance } from '@/types/game';
import { STAT_LABELS, SLOT_LABELS } from '@/types/game';
import { RarityText, RARITY_BORDER, RARITY_BG, RARITY_BADGE_BG, RARITY_GLOW } from './RarityBadge';

interface ItemCardProps {
  item: ItemInstance;
  onEquip?: () => void;
  onSalvage?: () => void;
  compact?: boolean;
}

const STAT_ICONS: Record<string, string> = {
  pwr: '⚔', end: '🛡', lck: '✦', spd: '💨', ins: '👁',
};

export function ItemCard({ item, onEquip, onSalvage, compact = false }: ItemCardProps) {
  if (compact) {
    return (
      <div className={`border ${RARITY_BORDER[item.rarity]} ${RARITY_BG[item.rarity]} ${RARITY_GLOW[item.rarity]} rounded-lg p-2.5 flex items-center gap-3`}>
        <div className="min-w-0 flex-1">
          <RarityText rarity={item.rarity} className="text-sm font-semibold truncate block">
            {item.name}
          </RarityText>
          <span className="text-[11px] text-[#6060a0]">{SLOT_LABELS[item.slot]} · GS {item.gearScore}</span>
        </div>
        <div className="flex gap-1.5 shrink-0">
          {onEquip && (
            <button onClick={onEquip}
              className="px-3 py-1 text-xs bg-[#252545] hover:bg-[#2e2e55] text-slate-200 rounded-lg transition-colors font-medium">
              Equip
            </button>
          )}
          {onSalvage && (
            <button onClick={onSalvage}
              className="px-3 py-1 text-xs bg-red-950/50 hover:bg-red-900/50 text-red-400 rounded-lg transition-colors font-medium">
              Salvage
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={`border ${RARITY_BORDER[item.rarity]} ${RARITY_BG[item.rarity]} ${RARITY_GLOW[item.rarity]} rounded-xl p-4`}>
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <RarityText rarity={item.rarity} className="font-bold text-sm leading-tight block truncate">
            {item.name}
          </RarityText>
          <span className="text-[11px] text-[#6060a0] mt-0.5 block">{SLOT_LABELS[item.slot]}</span>
        </div>
        <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium capitalize ml-2 shrink-0 ${RARITY_BADGE_BG[item.rarity]}`}>
          {item.rarity}
        </span>
      </div>

      <div className="space-y-1.5 mb-3">
        <div className="flex items-center gap-2 text-sm">
          <span className="text-[#9090c0]">{STAT_ICONS[item.primaryStat]}</span>
          <span className="text-[#9090c0] text-xs">{STAT_LABELS[item.primaryStat]}</span>
          <span className="ml-auto text-slate-200 font-bold">+{item.primaryValue}</span>
        </div>
        {item.secondaryStats.map((s) => (
          <div key={s.stat} className="flex items-center gap-2 text-xs">
            <span className="text-[#6060a0]">{STAT_ICONS[s.stat]}</span>
            <span className="text-[#6060a0]">{STAT_LABELS[s.stat]}</span>
            <span className="ml-auto text-[#9090c0]">+{s.value}</span>
          </div>
        ))}
      </div>

      {item.specialEffects.length > 0 && (
        <div className="border-t border-[rgba(120,100,200,0.15)] pt-2.5 mb-3 space-y-1.5">
          {item.specialEffects.map((e) => (
            <div key={e.id} className="flex items-start gap-1.5 text-xs text-amber-400/90">
              <span className="shrink-0 mt-0.5">✦</span>
              <span className="italic">{e.description}</span>
            </div>
          ))}
        </div>
      )}

      <div className="flex items-center justify-between pt-1">
        <span className="text-[11px] text-[#5050a0]">GS {item.gearScore}</span>
        <div className="flex gap-2">
          {onEquip && (
            <button onClick={onEquip}
              className="px-3 py-1.5 text-xs bg-gradient-to-r from-violet-700 to-purple-700 hover:from-violet-600 hover:to-purple-600 text-white rounded-lg transition-all font-semibold">
              Equip
            </button>
          )}
          {onSalvage && (
            <button onClick={onSalvage}
              className="px-3 py-1.5 text-xs bg-red-950/60 hover:bg-red-900/60 text-red-400 rounded-lg transition-colors font-medium">
              Salvage
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
