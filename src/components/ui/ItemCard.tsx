'use client';
import type { ItemInstance } from '@/types/game';
import { STAT_LABELS, SLOT_LABELS, ATTUNEMENT_REQUIRED, GEAR_TIER_NAMES, UPGRADE_GOLD_BASE, UPGRADE_MAX } from '@/types/game';
import { RarityText, RARITY_BORDER, RARITY_BG, RARITY_BADGE_BG, RARITY_GLOW } from './RarityBadge';

const TIER_COLORS: Record<number, string> = { 1: '#9ca3af', 2: '#60a5fa', 3: '#c084fc', 4: '#fbbf24' };

interface ItemCardProps {
  item: ItemInstance;
  onEquip?: () => void;
  onSalvage?: () => void;
  onUpgrade?: () => void;
  canAffordUpgrade?: boolean;
  compact?: boolean;
}

const STAT_ICONS: Record<string, string> = {
  pwr: '⚔', end: '🛡', lck: '✦', spd: '💨', ins: '👁',
};

export function ItemCard({ item, onEquip, onSalvage, onUpgrade, canAffordUpgrade = true, compact = false }: ItemCardProps) {
  const upgradeLevel = item.upgradeLevel ?? 0;
  const upgradeCost = upgradeLevel < UPGRADE_MAX ? UPGRADE_GOLD_BASE[item.rarity] * (upgradeLevel + 1) : 0;
  if (compact) {
    return (
      <div className={`border ${RARITY_BORDER[item.rarity]} ${RARITY_BG[item.rarity]} ${RARITY_GLOW[item.rarity]} rounded-lg p-2.5 flex items-center gap-3`}>
        <div className="w-9 h-9 shrink-0 flex items-center justify-center">
          <img src={`/icons/items/item_${item.slot}_${item.rarity}.png`} alt={item.name} className="w-9 h-9 object-contain" />
        </div>
        <div className="min-w-0 flex-1">
          <RarityText rarity={item.rarity} className="text-sm font-semibold truncate block">{item.name}</RarityText>
          <span className="text-[11px] text-[#505058]">{SLOT_LABELS[item.slot]} · GS {item.gearScore}</span>
        </div>
        <div className="flex gap-1.5 shrink-0">
          {onEquip && (
            <button onClick={onEquip} className="px-3 py-1 text-xs bg-red-900/40 hover:bg-red-900/60 text-red-300 rounded-lg transition-colors font-medium">
              Equip
            </button>
          )}
          {onSalvage && (
            <button onClick={onSalvage} className="px-3 py-1 text-xs bg-red-950/50 hover:bg-red-900/50 text-red-400 rounded-lg transition-colors font-medium">
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
        <div className="flex items-start gap-2.5 flex-1 min-w-0">
          <div className="w-11 h-11 shrink-0 flex items-center justify-center mt-0.5">
            <img src={`/icons/items/item_${item.slot}_${item.rarity}.png`} alt={item.name} className="w-11 h-11 object-contain" />
          </div>
          <div className="flex-1 min-w-0">
          <RarityText rarity={item.rarity} className="font-bold text-sm leading-tight block truncate">
            {item.name}
          </RarityText>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-[11px] text-[#505058]">{SLOT_LABELS[item.slot]}</span>
            {item.gearTier && (
              <span className="text-[10px] px-1.5 py-0.5 rounded font-bold"
                style={{ color: TIER_COLORS[item.gearTier], background: TIER_COLORS[item.gearTier] + '18' }}>
                T{item.gearTier} {GEAR_TIER_NAMES[item.gearTier]}
              </span>
            )}
          </div>
          </div>
        </div>
        <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium capitalize ml-2 shrink-0 ${RARITY_BADGE_BG[item.rarity]}`}>
          {item.rarity}
        </span>
      </div>

      <div className="space-y-1.5 mb-3">
        <div className="flex items-center gap-2 text-sm">
          <span className="text-[#848490]">{STAT_ICONS[item.primaryStat]}</span>
          <span className="text-[#848490] text-xs">{STAT_LABELS[item.primaryStat]}</span>
          <span className="ml-auto text-slate-200 font-bold">+{item.primaryValue}</span>
        </div>
        {item.secondaryStats.map((s) => (
          <div key={s.stat} className="flex items-center gap-2 text-xs">
            <span className="text-[#505058]">{STAT_ICONS[s.stat]}</span>
            <span className="text-[#505058]">{STAT_LABELS[s.stat]}</span>
            <span className="ml-auto text-[#848490]">+{s.value}</span>
          </div>
        ))}
      </div>

      {item.specialEffects.length > 0 && (
        <div className="border-t border-[rgba(255,255,255,0.08)] pt-2.5 mb-3 space-y-1.5">
          {item.specialEffects.map((e) => (
            <div key={e.id} className="flex items-start gap-1.5 text-xs text-amber-400/90">
              <span className="shrink-0 mt-0.5">✦</span>
              <span className="italic">{e.description}</span>
            </div>
          ))}
        </div>
      )}

      {item.gearTier && item.gearTier < 4 && (() => {
        const runs = item.attunementRuns ?? 0;
        const needed = ATTUNEMENT_REQUIRED[item.gearTier];
        const pct = Math.min(runs / needed, 1) * 100;
        const tempered = runs >= needed;
        return (
          <div className="mb-2">
            <div className="flex items-center justify-between text-[10px] mb-1">
              <span className="text-[#606068]">Tempering</span>
              {tempered
                ? <span className="text-emerald-400 font-semibold">✓ Tempered</span>
                : <span className="text-[#505058]">{runs}/{needed} runs</span>
              }
            </div>
            <div className="h-1 bg-[#111118] rounded-full overflow-hidden">
              <div className={`h-full rounded-full transition-all ${tempered ? 'bg-emerald-500' : 'bg-amber-500/70'}`}
                style={{ width: `${pct}%` }} />
            </div>
          </div>
        );
      })()}

      <div className="flex items-center justify-between pt-1">
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-[#606068]">GS {item.gearScore}</span>
          {upgradeLevel > 0 && (
            <span className="text-[10px] text-amber-400 font-bold">+{upgradeLevel}</span>
          )}
        </div>
        <div className="flex flex-wrap gap-1.5 justify-end">
          {onUpgrade && upgradeLevel < UPGRADE_MAX && (
            <button onClick={onUpgrade} disabled={!canAffordUpgrade}
              className={`px-2 py-1 text-[10px] rounded-lg font-semibold transition-all ${
                canAffordUpgrade
                  ? 'bg-amber-900/40 hover:bg-amber-900/60 text-amber-400 border border-amber-700/40'
                  : 'bg-[#16161f] text-[#44444e] border border-[rgba(255,255,255,0.06)] cursor-not-allowed'
              }`}
              title={canAffordUpgrade ? `Upgrade for ${upgradeCost}g` : `Need ${upgradeCost}g`}>
              ▲ {upgradeCost}g
            </button>
          )}
          {onUpgrade && upgradeLevel >= UPGRADE_MAX && (
            <span className="text-[10px] text-amber-500/60 px-1.5 py-1">Max</span>
          )}
          {onEquip && (
            <button onClick={onEquip}
              className="px-2.5 py-1 text-[11px] bg-gradient-to-r from-red-700 to-rose-700 hover:from-red-600 hover:to-rose-600 text-white rounded-lg transition-all font-semibold">
              Equip
            </button>
          )}
          {onSalvage && (
            <button onClick={onSalvage}
              className="px-2.5 py-1 text-[11px] bg-red-950/60 hover:bg-red-900/60 text-red-400 rounded-lg transition-colors font-medium">
              Salvage
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
