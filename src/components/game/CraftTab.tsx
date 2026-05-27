'use client';
import { useState } from 'react';
import type { GameState, ItemInstance } from '@/types/game';
import { RARITY_COLORS } from '@/types/game';
import { CRAFT_RECIPES, ATTUNEMENT_RUNS_REQUIRED, FORGE_UPGRADE_ID } from '@/lib/data/recipes';
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

const TIER_COLORS: Record<number, string> = {
  1: '#9ca3af',
  2: '#60a5fa',
  3: '#c084fc',
  4: '#fbbf24',
};

const TIER_NAMES: Record<number, string> = {
  1: 'Iron', 2: 'Steel', 3: 'Mithril', 4: 'Void',
};

const FORGE_NAMES: Record<number, string> = {
  1: 'The Forge',
  2: 'Reinforced Forge',
  3: 'Master Forge',
  4: 'Void Forge',
};

export function CraftTab({ state, onRefresh }: Props) {
  const [crafting, setCrafting] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
  const [selectedIngredient, setSelectedIngredient] = useState<Record<string, string>>({});
  const [showIngredientPicker, setShowIngredientPicker] = useState<string | null>(null);
  const [tierFilter, setTierFilter] = useState<number | null>(null);

  const stock = Object.fromEntries(state.resources.map((r) => [r.resourceId, r.quantity]));
  const builtIds = state.campUpgrades.filter(u => u.built).map(u => u.id);

  const forgeLevel = (() => {
    if (builtIds.includes(FORGE_UPGRADE_ID[4])) return 4;
    if (builtIds.includes(FORGE_UPGRADE_ID[3])) return 3;
    if (builtIds.includes(FORGE_UPGRADE_ID[2])) return 2;
    if (builtIds.includes(FORGE_UPGRADE_ID[1])) return 1;
    return 0;
  })();

  const canCraft = (recipeId: string): { ok: boolean; reason?: string } => {
    const recipe = CRAFT_RECIPES.find((r) => r.id === recipeId)!;

    if (recipe.requiredForgeLevel > forgeLevel) {
      return { ok: false, reason: `Needs ${FORGE_NAMES[recipe.requiredForgeLevel]}` };
    }

    if (!recipe.ingredients.every((ing) => (stock[ing.resourceId] ?? 0) >= ing.quantity)) {
      return { ok: false, reason: 'Need Materials' };
    }

    if (recipe.goldCost > 0 && state.character.gold < recipe.goldCost) {
      return { ok: false, reason: `Need ${recipe.goldCost}g` };
    }

    if (recipe.requiredItemTier) {
      const ingredientId = selectedIngredient[recipeId];
      if (!ingredientId) return { ok: false, reason: 'Select item to absorb' };
      const item = state.inventory.find(i => i.id === ingredientId);
      if (!item) return { ok: false, reason: 'Select item to absorb' };
      const required = ATTUNEMENT_RUNS_REQUIRED[recipe.requiredItemTier as 1 | 2 | 3];
      if ((item.attunementRuns ?? 0) < required) {
        return { ok: false, reason: `Item not tempered (${item.attunementRuns ?? 0}/${required})` };
      }
    }

    return { ok: true };
  };

  const eligibleIngredients = (recipeId: string): ItemInstance[] => {
    const recipe = CRAFT_RECIPES.find((r) => r.id === recipeId)!;
    if (!recipe.requiredItemTier) return [];
    return state.inventory.filter(i => i.slot === recipe.slot && (i.gearTier ?? 1) === recipe.requiredItemTier);
  };

  const handleCraft = async (recipeId: string) => {
    const check = canCraft(recipeId);
    if (!check.ok) return;
    setCrafting(recipeId); setMessage(null);
    const ingredientItemId = selectedIngredient[recipeId];
    const res = await fetch('/api/craft', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ recipeId, ingredientItemId }),
    });
    const data = await res.json();
    if (data.ok) {
      setMessage({ type: 'ok', text: `Crafted: ${data.item.name}` });
      setSelectedIngredient(prev => { const n = { ...prev }; delete n[recipeId]; return n; });
      onRefresh();
    } else {
      setMessage({ type: 'err', text: data.error });
    }
    setCrafting(null);
  };

  const recipes = tierFilter
    ? CRAFT_RECIPES.filter(r => r.gearTier === tierFilter)
    : CRAFT_RECIPES;

  return (
    <div className="flex flex-col md:flex-row gap-4 md:gap-6 md:h-full">

      {/* LEFT: materials + forge status */}
      <div className="w-full md:w-56 md:flex-shrink-0 flex flex-col gap-4">
        <p className="text-[11px] text-[#6060a0] uppercase tracking-widest flex items-center gap-2">
          <span className="text-purple-500">◆</span> Materials
        </p>

        {/* Mobile: horizontal scroll */}
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

        {/* Forge level */}
        <div className="bg-[#14142a] border border-[rgba(120,110,200,0.2)] rounded-xl p-3">
          <p className="text-[11px] text-[#6060a0] uppercase tracking-widest mb-2">Forge Level</p>
          <div className="flex gap-1 mb-2">
            {[1, 2, 3, 4].map(lvl => (
              <div key={lvl}
                className={`flex-1 h-1.5 rounded-full ${lvl <= forgeLevel ? 'bg-orange-500' : 'bg-[#252545]'}`} />
            ))}
          </div>
          {forgeLevel === 0
            ? <p className="text-[10px] text-red-400">Build The Forge in Camp</p>
            : <p className="text-[10px] text-orange-400">{FORGE_NAMES[forgeLevel]} active — T{forgeLevel} crafting unlocked</p>
          }
        </div>
      </div>

      {/* RIGHT: recipes */}
      <div className="flex-1 flex flex-col gap-4 md:overflow-y-auto md:pr-1">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <p className="text-[11px] text-[#6060a0] uppercase tracking-widest flex items-center gap-2">
            <span className="text-purple-500">◆</span> Recipes
          </p>
          {/* Tier filter */}
          <div className="flex gap-1.5">
            <button onClick={() => setTierFilter(null)}
              className={`px-2.5 py-1 text-[11px] rounded-lg border transition-all ${
                tierFilter === null ? 'bg-[#1e1e40] text-slate-200 border-[rgba(120,110,200,0.3)]' : 'text-[#5050a0] border-transparent'
              }`}>All</button>
            {[1, 2, 3, 4].map(t => (
              <button key={t} onClick={() => setTierFilter(tierFilter === t ? null : t)}
                className={`px-2.5 py-1 text-[11px] rounded-lg border transition-all ${
                  tierFilter === t ? 'bg-[#1e1e40] border-current' : 'border-transparent hover:bg-[#141428]'
                }`}
                style={{ color: TIER_COLORS[t], borderColor: tierFilter === t ? TIER_COLORS[t] + '60' : undefined }}>
                T{t} {TIER_NAMES[t]}
              </button>
            ))}
          </div>
        </div>

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
          {recipes.map((recipe) => {
            const { ok: affordable, reason } = canCraft(recipe.id);
            const isCrafting = crafting === recipe.id;
            const rarityColor = RARITY_COLORS[recipe.rarity];
            const tierColor = TIER_COLORS[recipe.gearTier];
            const forgeOk = recipe.requiredForgeLevel <= forgeLevel;
            const eligible = eligibleIngredients(recipe.id);
            const chosenIngredientId = selectedIngredient[recipe.id];
            const chosenItem = eligible.find(i => i.id === chosenIngredientId);
            const isPickerOpen = showIngredientPicker === recipe.id;

            return (
              <div key={recipe.id}
                className={`bg-[#14142a] rounded-xl border ${RARITY_BORDER[recipe.rarity]} overflow-hidden flex flex-col ${!forgeOk ? 'opacity-50' : ''}`}>
                <div className="h-0.5" style={{ background: `linear-gradient(90deg, ${rarityColor}80, transparent)` }} />
                <div className="p-4 flex flex-col gap-3 flex-1">
                  <div>
                    <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                      <span className="text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded"
                        style={{ color: tierColor, background: tierColor + '18', border: `1px solid ${tierColor}30` }}>
                        T{recipe.gearTier} {TIER_NAMES[recipe.gearTier]}
                      </span>
                      <span className="text-[10px] text-[#5050a0] bg-[#0f0f22] px-1.5 py-0.5 rounded">{recipe.slot}</span>
                    </div>
                    <h3 className="text-slate-100 font-semibold text-sm">{recipe.name}</h3>
                    <p className="text-[11px] text-[#6060a0] mt-0.5">{recipe.description}</p>
                  </div>

                  {/* Output stats */}
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

                  {/* Material cost */}
                  <div className="space-y-1">
                    {recipe.goldCost > 0 && (
                      <div className="flex items-center justify-between text-xs">
                        <span className="flex items-center gap-1 text-[#8080a0]">
                          <img src="/icons/res_gold.png" alt="gold" width={16} height={16} style={{ imageRendering: 'pixelated' }} />
                          <span>Gold</span>
                        </span>
                        <span className={`font-semibold tabular-nums ${state.character.gold >= recipe.goldCost ? 'text-emerald-400' : 'text-red-400'}`}>
                          {state.character.gold}/{recipe.goldCost}
                        </span>
                      </div>
                    )}
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

                  {/* Ingredient item picker for T2+ */}
                  {recipe.requiredItemTier && (
                    <div className="space-y-1.5">
                      <p className="text-[10px] text-[#5050a0] uppercase tracking-wide">
                        Absorb T{recipe.requiredItemTier} {TIER_NAMES[recipe.requiredItemTier]} {recipe.slot}
                        <span className="text-[#3a3a6a] ml-1">({ATTUNEMENT_RUNS_REQUIRED[recipe.requiredItemTier as 1|2|3]} runs needed)</span>
                      </p>

                      {eligible.length === 0 ? (
                        <p className="text-[11px] text-[#4040a0] italic">No eligible items</p>
                      ) : (
                        <>
                          <button
                            onClick={() => setShowIngredientPicker(isPickerOpen ? null : recipe.id)}
                            className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-[#0f0f22] border border-[rgba(120,110,200,0.2)] text-xs hover:border-violet-500/30 transition-all">
                            {chosenItem ? (
                              <span style={{ color: RARITY_COLORS[chosenItem.rarity] }}>{chosenItem.name}
                                <span className="text-[#5050a0] ml-1">
                                  ({chosenItem.attunementRuns ?? 0}/{ATTUNEMENT_RUNS_REQUIRED[recipe.requiredItemTier as 1|2|3]} runs)
                                </span>
                              </span>
                            ) : (
                              <span className="text-[#5050a0]">— select —</span>
                            )}
                            <span className="text-[#5050a0]">{isPickerOpen ? '▲' : '▼'}</span>
                          </button>

                          {isPickerOpen && (
                            <div className="bg-[#0a0a1e] border border-[rgba(120,110,200,0.2)] rounded-lg overflow-hidden">
                              {eligible.map(item => {
                                const runs = item.attunementRuns ?? 0;
                                const needed = ATTUNEMENT_RUNS_REQUIRED[recipe.requiredItemTier as 1|2|3];
                                const tempered = runs >= needed;
                                return (
                                  <button key={item.id}
                                    onClick={() => {
                                      setSelectedIngredient(prev => ({ ...prev, [recipe.id]: item.id }));
                                      setShowIngredientPicker(null);
                                    }}
                                    className="w-full flex items-center justify-between px-3 py-2 text-xs hover:bg-[#141428] transition-colors border-b border-[rgba(120,110,200,0.08)] last:border-0">
                                    <span style={{ color: RARITY_COLORS[item.rarity] }}>{item.name}</span>
                                    <div className="text-right">
                                      {tempered
                                        ? <span className="text-emerald-400">✓ Tempered</span>
                                        : <span className="text-amber-400/70">{runs}/{needed} runs</span>
                                      }
                                    </div>
                                  </button>
                                );
                              })}
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  )}

                  <button
                    onClick={() => handleCraft(recipe.id)}
                    disabled={!affordable || isCrafting || state.character.status === 'on_run'}
                    className={`mt-auto w-full py-2 rounded-lg text-xs font-bold border transition-all ${
                      !forgeOk
                        ? 'border-[rgba(120,110,200,0.1)] bg-transparent text-[#3030a0] cursor-not-allowed'
                        : affordable
                        ? 'border-violet-500/40 bg-violet-900/20 text-violet-300 hover:bg-violet-900/40 hover:border-violet-500/60'
                        : 'border-[rgba(120,110,200,0.1)] bg-transparent text-[#4040a0] cursor-not-allowed'
                    }`}>
                    {isCrafting ? 'Crafting…' : !forgeOk ? `🔒 ${FORGE_NAMES[recipe.requiredForgeLevel]}` : affordable ? '⚒ Craft' : reason}
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
