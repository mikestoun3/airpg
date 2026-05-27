'use client';
import { useState } from 'react';
import type { GameState } from '@/types/game';
import { RARITY_COLORS } from '@/types/game';
import { CRAFT_RECIPES } from '@/lib/data/recipes';
import { RESOURCES } from '@/lib/data/resources';
import { ResIcon } from '@/components/ui/ResIcon';

interface Props {
  state: GameState;
  onRefresh: () => void;
}

const RARITY_BORDER: Record<string, string> = {
  common:    'border-[rgba(156,163,175,0.3)]',
  uncommon:  'border-[rgba(74,222,128,0.35)]',
  rare:      'border-[rgba(96,165,250,0.35)]',
  epic:      'border-[rgba(192,132,252,0.40)]',
  legendary: 'border-[rgba(251,191,36,0.45)]',
};

const STAT_ICONS: Record<string, string> = {
  pwr: '⚔', end: '🛡', lck: '✦', spd: '💨', ins: '👁',
};

export function CraftTab({ state, onRefresh }: Props) {
  const [crafting, setCrafting] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  const stock = Object.fromEntries(state.resources.map((r) => [r.resourceId, r.quantity]));

  const canCraft = (recipeId: string) => {
    const recipe = CRAFT_RECIPES.find((r) => r.id === recipeId)!;
    return recipe.ingredients.every((ing) => (stock[ing.resourceId] ?? 0) >= ing.quantity);
  };

  const handleCraft = async (recipeId: string) => {
    setCrafting(recipeId); setMessage(null);
    const res = await fetch('/api/craft', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ recipeId }),
    });
    const data = await res.json();
    if (data.ok) { setMessage({ type: 'ok', text: `Crafted: ${data.item.name}` }); onRefresh(); }
    else setMessage({ type: 'err', text: data.error });
    setCrafting(null);
  };

  const hasAnyMaterials = state.resources.length > 0;

  return (
    <div className="flex flex-col md:flex-row gap-4 md:gap-6 md:h-full">

      {/* LEFT: materials */}
      <div className="w-full md:w-56 md:flex-shrink-0 flex flex-col gap-4">
        <p className="text-[11px] text-[#6060a0] uppercase tracking-widest flex items-center gap-2">
          <span className="text-purple-500">◆</span> Materials
        </p>

        {/* Mobile: horizontal scroll */}
        {hasAnyMaterials ? (
          <>
            <div className="flex gap-2 overflow-x-auto pb-1 md:hidden">
              {RESOURCES.map((res) => {
                const qty = stock[res.id] ?? 0;
                const rarityColor = res.rarity === 'rare' ? '#60a5fa' : res.rarity === 'uncommon' ? '#4ade80' : '#9ca3af';
                return (
                  <div key={res.id}
                    className="flex-shrink-0 flex items-center gap-2 bg-[#14142a] border border-[rgba(120,110,200,0.12)] rounded-lg px-3 py-2">
                    <ResIcon resourceId={res.id} fallback={res.icon} size={18} />
                    <div>
                      <p className="text-xs text-slate-300 whitespace-nowrap">{res.name}</p>
                      <p className="text-[10px]" style={{ color: rarityColor }}>{qty}</p>
                    </div>
                  </div>
                );
              })}
            </div>
            {/* Desktop: vertical list */}
            <div className="hidden md:block space-y-1.5">
              {RESOURCES.map((res) => {
                const qty = stock[res.id] ?? 0;
                const rarityColor = res.rarity === 'rare' ? '#60a5fa' : res.rarity === 'uncommon' ? '#4ade80' : '#9ca3af';
                return (
                  <div key={res.id}
                    className="flex items-center justify-between bg-[#14142a] border border-[rgba(120,110,200,0.12)] rounded-lg px-3 py-2">
                    <div className="flex items-center gap-2">
                      <ResIcon resourceId={res.id} fallback={res.icon} size={20} />
                      <div>
                        <p className="text-xs text-slate-300">{res.name}</p>
                        <p className="text-[10px]" style={{ color: rarityColor }}>{res.rarity}</p>
                      </div>
                    </div>
                    <span className={`font-bold text-sm ${qty > 0 ? 'text-slate-100' : 'text-[#4040a0]'}`}>{qty}</span>
                  </div>
                );
              })}
            </div>
          </>
        ) : (
          <p className="text-[11px] text-[#4040a0] italic px-1">Run dungeons to gather materials.</p>
        )}
      </div>

      {/* RIGHT: recipes */}
      <div className="flex-1 flex flex-col gap-4 md:overflow-y-auto md:pr-1">
        <p className="text-[11px] text-[#6060a0] uppercase tracking-widest flex items-center gap-2">
          <span className="text-purple-500">◆</span> Recipes
        </p>

        {message && (
          <div className={`rounded-xl p-3 text-sm border ${
            message.type === 'ok'
              ? 'bg-emerald-950/30 border-emerald-700/30 text-emerald-400'
              : 'bg-red-950/30 border-red-700/30 text-red-400'
          }`}>
            {message.text}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {CRAFT_RECIPES.map((recipe) => {
            const affordable = canCraft(recipe.id);
            const isCrafting = crafting === recipe.id;
            const rarityColor = RARITY_COLORS[recipe.rarity];

            return (
              <div key={recipe.id}
                className={`bg-[#14142a] rounded-xl border ${RARITY_BORDER[recipe.rarity]} overflow-hidden flex flex-col`}>
                <div className="h-0.5" style={{ background: `linear-gradient(90deg, ${rarityColor}80, transparent)` }} />
                <div className="p-4 flex flex-col gap-3 flex-1">
                  <div>
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-xs font-bold uppercase tracking-wide" style={{ color: rarityColor }}>{recipe.rarity}</span>
                      <span className="text-[10px] text-[#5050a0] bg-[#0f0f22] px-1.5 py-0.5 rounded">{recipe.slot}</span>
                    </div>
                    <h3 className="text-slate-100 font-semibold text-sm">{recipe.name}</h3>
                    <p className="text-[11px] text-[#6060a0] mt-0.5">{recipe.description}</p>
                  </div>

                  <div className="bg-[#0f0f22] rounded-lg p-2.5 space-y-1">
                    <p className="text-[10px] text-[#5050a0] uppercase tracking-wide mb-1.5">Output</p>
                    <div className="flex items-center gap-1.5 text-xs">
                      <span className="text-[#8080a0]">{STAT_ICONS[recipe.outputItem.primaryStat]}</span>
                      <span className="text-slate-300">{recipe.outputItem.primaryStat.toUpperCase()}</span>
                      <span className="font-bold text-slate-100">+{recipe.outputItem.primaryValue}</span>
                    </div>
                    {recipe.outputItem.secondaryStats.map((s) => (
                      <div key={s.stat} className="flex items-center gap-1.5 text-xs">
                        <span className="text-[#8080a0]">{STAT_ICONS[s.stat]}</span>
                        <span className="text-[#7070a0]">{s.stat.toUpperCase()}</span>
                        <span className="text-[#9090b0]">+{s.value}</span>
                      </div>
                    ))}
                  </div>

                  <div className="space-y-1">
                    {recipe.ingredients.map((ing) => {
                      const have = stock[ing.resourceId] ?? 0;
                      const ok = have >= ing.quantity;
                      const def = RESOURCES.find((r) => r.id === ing.resourceId);
                      return (
                        <div key={ing.resourceId} className="flex items-center justify-between text-xs">
                          <span className="flex items-center gap-1 text-[#8080a0]">
                            <ResIcon resourceId={ing.resourceId} fallback={def?.icon ?? '?'} size={16} />
                            <span>{ing.name}</span>
                          </span>
                          <span className={`font-semibold tabular-nums ${ok ? 'text-emerald-400' : 'text-red-400'}`}>
                            {have}/{ing.quantity}
                          </span>
                        </div>
                      );
                    })}
                  </div>

                  <button
                    onClick={() => handleCraft(recipe.id)}
                    disabled={!affordable || isCrafting || state.character.status === 'on_run'}
                    className={`mt-auto w-full py-2 rounded-lg text-xs font-bold border transition-all ${
                      affordable
                        ? 'border-violet-500/40 bg-violet-900/20 text-violet-300 hover:bg-violet-900/40 hover:border-violet-500/60'
                        : 'border-[rgba(120,110,200,0.1)] bg-transparent text-[#4040a0] cursor-not-allowed'
                    }`}>
                    {isCrafting ? 'Crafting...' : affordable ? '⚒ Craft' : 'Need Materials'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
