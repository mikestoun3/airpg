'use client';
import { useState } from 'react';
import type { GameState, Rarity } from '@/types/game';
import { ItemCard } from '../ui/ItemCard';

interface Props {
  state: GameState;
  onRefresh: () => void;
}

type Filter = 'all' | Rarity;

const FILTERS: { id: Filter; label: string; color: string }[] = [
  { id: 'all',       label: 'All',       color: 'text-slate-300'  },
  { id: 'common',    label: 'Common',    color: 'text-slate-400'  },
  { id: 'uncommon',  label: 'Uncommon',  color: 'text-emerald-400'},
  { id: 'rare',      label: 'Rare',      color: 'text-blue-400'   },
  { id: 'epic',      label: 'Epic',      color: 'text-purple-400' },
  { id: 'legendary', label: 'Legendary', color: 'text-amber-400'  },
];

const SALVAGE_RARITIES: { rarity: Rarity; label: string; color: string; borderColor: string }[] = [
  { rarity: 'common',    label: 'Common',    color: 'text-slate-400',   borderColor: 'border-slate-600/40'  },
  { rarity: 'uncommon',  label: 'Uncommon',  color: 'text-emerald-400', borderColor: 'border-emerald-700/40'},
  { rarity: 'rare',      label: 'Rare',      color: 'text-blue-400',    borderColor: 'border-blue-700/40'   },
  { rarity: 'epic',      label: 'Epic',      color: 'text-purple-400',  borderColor: 'border-purple-700/40' },
  { rarity: 'legendary', label: 'Legendary', color: 'text-amber-400',   borderColor: 'border-amber-700/40'  },
];

export function InventoryTab({ state, onRefresh }: Props) {
  const [pendingEquip, setPendingEquip] = useState<string | null>(null);
  const [pendingSalvage, setPendingSalvage] = useState<string | null>(null);
  const [pendingSalvageRarity, setPendingSalvageRarity] = useState<Rarity | null>(null);
  const [confirmRarity, setConfirmRarity] = useState<Rarity | null>(null);
  const [filter, setFilter] = useState<Filter>('all');
  const [toast, setToast] = useState<string | null>(null);

  const { inventory, activeRun } = state;
  const onRun = !!activeRun;

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  };

  const handleEquip = async (itemId: string) => {
    setPendingEquip(itemId);
    await fetch('/api/inventory', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'equip', itemId }),
    });
    showToast('Item equipped!');
    await onRefresh();
    setPendingEquip(null);
  };

  const handleSalvage = async (itemId: string) => {
    setPendingSalvage(itemId);
    const res = await fetch('/api/inventory', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'salvage', itemId }),
    });
    const data = await res.json();
    if (data.ok) showToast(`Salvaged for ${data.goldGained}g${data.essenceGained > 0 ? ` + ${data.essenceGained} essence` : ''}`);
    await onRefresh();
    setPendingSalvage(null);
  };

  const handleSalvageRarity = async (rarity: Rarity) => {
    setConfirmRarity(null);
    setPendingSalvageRarity(rarity);
    const res = await fetch('/api/inventory', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'salvage_rarity', rarity }),
    });
    const data = await res.json();
    if (data.ok) showToast(`Salvaged ${data.count} items for ${data.goldGained}g${data.essenceGained > 0 ? ` + ${data.essenceGained} essence` : ''}`);
    await onRefresh();
    setPendingSalvageRarity(null);
  };

  const rarityCount = (r: Rarity) => inventory.filter(i => i.rarity === r).length;
  const filtered = filter === 'all' ? inventory : inventory.filter(i => i.rarity === filter);

  return (
    <div className="flex flex-col md:flex-row gap-4 md:gap-6 md:h-full">

      {/* Sidebar */}
      <div className="w-full md:w-52 md:flex-shrink-0 flex flex-col gap-3 md:gap-4">

        {/* Mobile: horizontal filter chips */}
        <div className="flex gap-1.5 overflow-x-auto pb-1 md:hidden">
          {FILTERS.map(({ id, label, color }) => {
            const count = id === 'all' ? inventory.length : rarityCount(id as Rarity);
            const isActive = filter === id;
            return (
              <button key={id} onClick={() => setFilter(id)}
                className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs border transition-all ${
                  isActive
                    ? 'bg-[#1e1e3d] border-[rgba(120,110,200,0.4)]'
                    : 'bg-[#14142a] border-[rgba(120,110,200,0.15)]'
                }`}>
                <span className={isActive ? color : 'text-[#7070a0]'}>{label}</span>
                <span className={`font-mono text-[10px] ${isActive ? color : 'text-[#5050a0]'}`}>{count}</span>
              </button>
            );
          })}
        </div>

        {/* Desktop: vertical filter panel */}
        <div className="hidden md:block bg-[#14142a] border border-[rgba(120,110,200,0.2)] rounded-xl p-4">
          <p className="text-[11px] text-[#6060a0] uppercase tracking-widest mb-3 flex items-center gap-2">
            <span className="text-purple-500">◆</span> Filter
          </p>
          <div className="space-y-1">
            {FILTERS.map(({ id, label, color }) => {
              const count = id === 'all' ? inventory.length : rarityCount(id as Rarity);
              return (
                <button key={id} onClick={() => setFilter(id)}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-all ${
                    filter === id ? 'bg-[#1e1e3d] border border-[rgba(120,110,200,0.3)]' : 'hover:bg-[#1a1a30]'
                  }`}>
                  <span className={filter === id ? color : 'text-[#7070a0]'}>{label}</span>
                  <span className={`text-xs font-mono ${filter === id ? color : 'text-[#5050a0]'}`}>{count}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Inventory count */}
        <div className="hidden md:block bg-[#14142a] border border-[rgba(120,110,200,0.2)] rounded-xl p-4">
          <p className="text-[11px] text-[#6060a0] uppercase tracking-widest mb-3">Inventory</p>
          <div className="space-y-2 text-xs">
            <div className="flex justify-between text-[#7070a0]">
              <span>Items</span>
              <span className="text-slate-300">{inventory.length}/20</span>
            </div>
            <div className="h-1.5 bg-[#0f0f22] rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-violet-600 to-purple-500 rounded-full"
                style={{ width: `${(inventory.length / 20) * 100}%` }} />
            </div>
          </div>
        </div>

        {/* Salvage by rarity */}
        <div className="bg-[#14142a] border border-[rgba(120,110,200,0.2)] rounded-xl p-4">
          <p className="text-[11px] text-[#6060a0] uppercase tracking-widest mb-3 flex items-center gap-2">
            <span className="text-red-500">⚒</span> Salvage All
          </p>
          {/* Mobile: horizontal row */}
          <div className="flex gap-1.5 flex-wrap md:hidden">
            {SALVAGE_RARITIES.map(({ rarity, label, color, borderColor }) => {
              const count = rarityCount(rarity);
              const isPending = pendingSalvageRarity === rarity;
              const isConfirming = confirmRarity === rarity;
              if (count === 0) return null;
              return (
                <div key={rarity}>
                  {isConfirming ? (
                    <div className={`rounded-lg border ${borderColor} bg-[#0f0f22] px-2 py-1.5 flex items-center gap-1.5`}>
                      <span className={`text-xs ${color}`}>{label}?</span>
                      <button onClick={() => handleSalvageRarity(rarity)} className="text-[10px] bg-red-900/50 text-red-300 px-1.5 py-0.5 rounded">Yes</button>
                      <button onClick={() => setConfirmRarity(null)} className="text-[10px] text-[#7070a0]">No</button>
                    </div>
                  ) : (
                    <button disabled={isPending} onClick={() => setConfirmRarity(rarity)}
                      className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs border ${borderColor} bg-[#0f0f22] hover:bg-[#141428] transition-all disabled:opacity-50`}>
                      <span className={color}>{isPending ? '...' : label}</span>
                      <span className="text-[#5050a0] font-mono">×{count}</span>
                    </button>
                  )}
                </div>
              );
            })}
            {SALVAGE_RARITIES.every(({ rarity }) => rarityCount(rarity) === 0) && (
              <p className="text-xs text-[#4040a0]">Nothing to salvage</p>
            )}
          </div>
          {/* Desktop: vertical list */}
          <div className="hidden md:block space-y-1.5">
            {SALVAGE_RARITIES.map(({ rarity, label, color, borderColor }) => {
              const count = rarityCount(rarity);
              const isPending = pendingSalvageRarity === rarity;
              const isConfirming = confirmRarity === rarity;
              if (count === 0) return null;
              return (
                <div key={rarity}>
                  {isConfirming ? (
                    <div className={`rounded-lg border ${borderColor} bg-[#0f0f22] p-2`}>
                      <p className={`text-xs ${color} mb-1.5`}>Salvage {count} {label}?</p>
                      <div className="flex gap-1">
                        <button onClick={() => handleSalvageRarity(rarity)} className="flex-1 py-1 text-xs bg-red-900/50 hover:bg-red-900/70 text-red-300 rounded transition-colors">Yes</button>
                        <button onClick={() => setConfirmRarity(null)} className="flex-1 py-1 text-xs bg-[#1a1a30] hover:bg-[#222240] text-[#7070a0] rounded transition-colors">No</button>
                      </div>
                    </div>
                  ) : (
                    <button disabled={isPending} onClick={() => setConfirmRarity(rarity)}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs border ${borderColor} bg-[#0f0f22] hover:bg-[#141428] transition-all disabled:opacity-50`}>
                      <span className={color}>{isPending ? '...' : label}</span>
                      <span className="text-[#5050a0] font-mono">×{count}</span>
                    </button>
                  )}
                </div>
              );
            })}
            {SALVAGE_RARITIES.every(({ rarity }) => rarityCount(rarity) === 0) && (
              <p className="text-xs text-[#4040a0] text-center py-1">Nothing to salvage</p>
            )}
          </div>
        </div>
      </div>

      {/* Item grid */}
      <div className="flex-1 md:overflow-y-auto">
        {onRun && (
          <div className="mb-3 px-4 py-2.5 bg-[#14142a] border border-violet-700/30 rounded-xl text-violet-400 text-sm text-center">
            ⚔ Hero is on a run — equipment is locked
          </div>
        )}
        {toast && (
          <div className="mb-3 px-4 py-2 bg-emerald-900/30 border border-emerald-700/30 rounded-xl text-emerald-400 text-sm text-center">
            {toast}
          </div>
        )}

        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <p className="text-5xl mb-4">🎒</p>
            <p className="text-[#5050a0]">No items{filter !== 'all' ? ` of this rarity` : ''}</p>
            {filter !== 'all' && (
              <button onClick={() => setFilter('all')} className="mt-2 text-xs text-purple-400 hover:text-purple-300">Clear filter</button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {filtered.map((item) => (
              <ItemCard
                key={item.id}
                item={item}
                onEquip={onRun || pendingEquip === item.id ? undefined : () => handleEquip(item.id)}
                onSalvage={pendingSalvage === item.id ? undefined : () => handleSalvage(item.id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
