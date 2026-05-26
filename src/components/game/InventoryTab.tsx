'use client';
import { useState } from 'react';
import type { GameState, Rarity } from '@/types/game';
import { SLOT_LABELS } from '@/types/game';
import { ItemCard } from '../ui/ItemCard';

interface Props {
  state: GameState;
  onRefresh: () => void;
}

type Filter = 'all' | Rarity;

export function InventoryTab({ state, onRefresh }: Props) {
  const [pendingEquip, setPendingEquip] = useState<string | null>(null);
  const [pendingSalvage, setPendingSalvage] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>('all');
  const [toast, setToast] = useState<string | null>(null);

  const { inventory } = state;

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

  const filtered = filter === 'all' ? inventory : inventory.filter(i => i.rarity === filter);

  const FILTERS: { id: Filter; label: string; color: string }[] = [
    { id: 'all', label: 'All', color: 'text-slate-300' },
    { id: 'common', label: 'Common', color: 'text-slate-400' },
    { id: 'uncommon', label: 'Uncommon', color: 'text-emerald-400' },
    { id: 'rare', label: 'Rare', color: 'text-blue-400' },
    { id: 'epic', label: 'Epic', color: 'text-purple-400' },
    { id: 'legendary', label: 'Legendary', color: 'text-amber-400' },
  ];

  const rarityCount = (r: Rarity) => inventory.filter(i => i.rarity === r).length;

  return (
    <div className="flex gap-6 h-full">
      {/* LEFT: filters + stats */}
      <div className="w-52 flex-shrink-0 flex flex-col gap-4">
        <div className="bg-[#14142a] border border-[rgba(120,110,200,0.2)] rounded-xl p-4">
          <p className="text-[11px] text-[#6060a0] uppercase tracking-widest mb-3 flex items-center gap-2">
            <span className="text-purple-500">◆</span> Filter
          </p>
          <div className="space-y-1">
            {FILTERS.map(({ id, label, color }) => {
              const count = id === 'all' ? inventory.length : rarityCount(id as Rarity);
              return (
                <button key={id} onClick={() => setFilter(id)}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-all ${
                    filter === id
                      ? 'bg-[#1e1e3d] border border-[rgba(120,110,200,0.3)]'
                      : 'hover:bg-[#1a1a30]'
                  }`}>
                  <span className={filter === id ? color : 'text-[#7070a0]'}>{label}</span>
                  <span className={`text-xs font-mono ${filter === id ? color : 'text-[#5050a0]'}`}>{count}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="bg-[#14142a] border border-[rgba(120,110,200,0.2)] rounded-xl p-4">
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
      </div>

      {/* RIGHT: item grid */}
      <div className="flex-1 overflow-y-auto">
        {toast && (
          <div className="mb-3 px-4 py-2 bg-emerald-900/30 border border-emerald-700/30 rounded-xl text-emerald-400 text-sm text-center">
            {toast}
          </div>
        )}

        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-32 text-center">
            <p className="text-5xl mb-4">🎒</p>
            <p className="text-[#5050a0]">No items{filter !== 'all' ? ` of this rarity` : ''}</p>
            {filter !== 'all' && (
              <button onClick={() => setFilter('all')} className="mt-2 text-xs text-purple-400 hover:text-purple-300">
                Clear filter
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-3">
            {filtered.map((item) => (
              <ItemCard
                key={item.id}
                item={item}
                onEquip={pendingEquip === item.id ? undefined : () => handleEquip(item.id)}
                onSalvage={pendingSalvage === item.id ? undefined : () => handleSalvage(item.id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
