'use client';
import { useState } from 'react';
import type { GameState, ItemInstance } from '@/types/game';

interface Props {
  state: GameState;
  onRefresh: () => void;
}

const UPGRADE_ICONS: Record<string, string> = {
  storage_room: '📦', the_forge: '🔥', the_shrine: '⛩️', the_library: '📚', armory: '⚔️',
};

const UPGRADE_COLORS: Record<string, string> = {
  storage_room: 'from-slate-700 to-slate-600',
  the_forge:    'from-orange-800 to-red-700',
  the_shrine:   'from-red-800 to-rose-700',
  the_library:  'from-blue-800 to-indigo-700',
  armory:       'from-slate-700 to-gray-600',
};

const RARITY_COLOR: Record<string, string> = {
  common: '#9ca3af', uncommon: '#4ade80', rare: '#60a5fa', epic: '#c084fc', legendary: '#fbbf24',
};

export function CampTab({ state, onRefresh }: Props) {
  const [building, setBuilding] = useState<string | null>(null);
  const [message, setMessage] = useState<{ text: string; ok: boolean } | null>(null);
  const [promoCode, setPromoCode] = useState('');
  const [promoState, setPromoState] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [promoResult, setPromoResult] = useState<{ msg: string; item?: ItemInstance } | null>(null);

  const { campUpgrades, character } = state;
  const builtIds = campUpgrades.filter(u => u.built).map(u => u.id);

  const handlePromoRedeem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!promoCode.trim()) return;
    setPromoState('loading'); setPromoResult(null);
    const res = await fetch('/api/promo/redeem', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: promoCode.trim() }),
    });
    const data = await res.json() as { ok: boolean; error?: string; reward?: { type: string; amount?: number }; item?: ItemInstance };
    if (data.ok) {
      setPromoState('success');
      let msg = 'Code redeemed!';
      if (data.reward?.type === 'gold') msg = `+${data.reward.amount} Gold!`;
      else if (data.reward?.type === 'essence') msg = `+${data.reward.amount} Essence!`;
      else if (data.item) msg = `Got: ${data.item.name}`;
      setPromoResult({ msg, item: data.item });
      setPromoCode('');
      await onRefresh();
    } else {
      setPromoState('error');
      setPromoResult({ msg: data.error ?? 'Invalid code' });
    }
  };

  const handleBuild = async (upgradeId: string) => {
    setBuilding(upgradeId); setMessage(null);
    const res = await fetch('/api/camp/build', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ upgradeId }),
    });
    const data = await res.json();
    setMessage({ text: data.ok ? 'Construction complete!' : data.error, ok: data.ok });
    if (data.ok) await onRefresh();
    setBuilding(null);
  };

  return (
    <div className="flex flex-col md:flex-row gap-4 md:gap-6 md:h-full">

      {/* LEFT: resources + promo */}
      <div className="w-full md:w-64 md:flex-shrink-0 flex flex-col gap-4">

        {/* Resources — horizontal on mobile */}
        <div className="bg-[#16161f] border border-[rgba(255,255,255,0.09)] rounded-xl p-4">
          <p className="text-[11px] text-[#505058] uppercase tracking-widest mb-3 flex items-center gap-2">
            <span className="text-rose-500">◆</span> Resources
          </p>
          <div className="grid grid-cols-3 md:grid-cols-1 gap-3 md:gap-0 md:space-y-3">
            {[
              { icon: '💰', label: 'Gold', value: character.gold, color: 'text-amber-400' },
              { icon: '🔮', label: 'Essence', value: character.essence, color: 'text-rose-400' },
              { icon: '⭐', label: 'Relics', value: character.relics, color: 'text-blue-400' },
            ].map(({ icon, label, value, color }) => (
              <div key={label} className="flex flex-col md:flex-row md:items-center md:justify-between bg-[#111118] md:bg-transparent rounded-lg md:rounded-none p-2 md:p-0 text-center md:text-left">
                <span className="text-[#909098] text-xs flex flex-col md:flex-row items-center gap-1 md:gap-2">
                  <span>{icon}</span> <span className="hidden md:inline">{label}</span>
                  <span className="md:hidden text-[10px] text-[#505058]">{label}</span>
                </span>
                <span className={`${color} font-bold text-sm md:text-base mt-0.5 md:mt-0`}>{value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Progress */}
        <div className="bg-[#16161f] border border-[rgba(255,255,255,0.09)] rounded-xl p-4">
          <p className="text-[11px] text-[#505058] uppercase tracking-widest mb-3">Progress</p>
          <div className="flex items-center gap-2">
            <div className="flex-1 flex gap-1">
              {campUpgrades.map((u) => (
                <div key={u.id} className={`flex-1 h-1.5 rounded-full ${u.built ? 'bg-red-600' : 'bg-[#252545]'}`} />
              ))}
            </div>
            <span className="text-[#505058] text-xs">{builtIds.length}/{campUpgrades.length}</span>
          </div>
        </div>

        {/* Promo code */}
        <div className="bg-[#16161f] border border-[rgba(255,255,255,0.09)] rounded-xl p-4">
          <p className="text-[11px] text-[#505058] uppercase tracking-widest mb-3 flex items-center gap-2">
            <span className="text-rose-500">◆</span> Promo Code
          </p>
          <form onSubmit={handlePromoRedeem} className="flex gap-2">
            <input
              value={promoCode}
              onChange={e => { setPromoCode(e.target.value.toUpperCase()); setPromoState('idle'); setPromoResult(null); }}
              placeholder="ENTER CODE"
              className="flex-1 bg-[#0c0c20] border border-[rgba(255,255,255,0.09)] rounded-lg px-3 py-2 text-slate-200 text-xs font-mono uppercase tracking-wider outline-none focus:border-purple-600 placeholder:text-[#3535a0] placeholder:normal-case placeholder:tracking-normal"
            />
            <button type="submit" disabled={promoState === 'loading' || !promoCode.trim()}
              className="px-3 py-2 rounded-lg bg-gradient-to-r from-red-700 to-rose-700 hover:from-red-700 hover:to-rose-600 disabled:opacity-40 text-white text-xs font-bold transition-all">
              {promoState === 'loading' ? '…' : '→'}
            </button>
          </form>
          {promoResult && (
            <div className={`mt-2 rounded-lg px-3 py-2 text-xs text-center ${
              promoState === 'success'
                ? 'bg-emerald-900/20 border border-emerald-700/30 text-emerald-400'
                : 'bg-red-950/20 border border-red-700/25 text-red-400'
            }`}>
              {promoResult.msg}
              {promoResult.item && (
                <div className="mt-0.5 font-medium" style={{ color: RARITY_COLOR[promoResult.item.rarity] }}>
                  {promoResult.item.name}
                </div>
              )}
            </div>
          )}
        </div>

        {message && (
          <div className={`rounded-xl p-3 text-sm text-center border ${
            message.ok ? 'bg-emerald-900/20 border-emerald-700/30 text-emerald-400' : 'bg-red-950/30 border-red-700/30 text-red-400'
          }`}>
            {message.text}
          </div>
        )}
      </div>

      {/* RIGHT: upgrade cards */}
      <div className="flex-1 md:overflow-y-auto">
        <p className="text-[11px] text-[#505058] uppercase tracking-widest mb-4 flex items-center gap-2">
          <span className="text-rose-500">◆</span> Base Upgrades
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {campUpgrades.map((upgrade) => {
            const canAfford = character.gold >= upgrade.goldCost && character.essence >= upgrade.essenceCost;
            const prereqMet = !upgrade.requires || builtIds.includes(upgrade.requires);
            const isBuilding = building === upgrade.id;

            return (
              <div key={upgrade.id}
                className={`bg-[#16161f] border rounded-xl overflow-hidden transition-all ${
                  upgrade.built ? 'border-purple-600/30'
                  : prereqMet ? 'border-[rgba(255,255,255,0.09)] hover:border-[rgba(200,70,70,0.35)]'
                  : 'border-[rgba(255,255,255,0.05)] opacity-55'
                }`}>
                <div className={`h-1.5 bg-gradient-to-r ${UPGRADE_COLORS[upgrade.id] ?? 'from-slate-700 to-slate-600'} ${upgrade.built ? 'opacity-100' : 'opacity-50'}`} />
                <div className="p-4 md:p-5">
                  <div className="flex items-start gap-3 mb-3">
                    <span className="text-3xl">{UPGRADE_ICONS[upgrade.id] ?? '🏗️'}</span>
                    <div>
                      <h3 className={`font-bold text-sm ${upgrade.built ? 'text-rose-300' : 'text-slate-200'}`}>
                        {upgrade.name} {upgrade.built && '✓'}
                      </h3>
                      <p className="text-[#505058] text-xs mt-0.5">{upgrade.description}</p>
                    </div>
                  </div>
                  <div className="bg-[#111118] rounded-lg px-3 py-2 mb-4">
                    <p className="text-[#8080c0] text-xs">{upgrade.effect}</p>
                  </div>
                  {!upgrade.built && (
                    <div className="flex items-center justify-between">
                      <div className="flex gap-2 text-xs">
                        <span className={character.gold >= upgrade.goldCost ? 'text-amber-400' : 'text-red-400'}>{upgrade.goldCost}g</span>
                        {upgrade.essenceCost > 0 && (
                          <span className={character.essence >= upgrade.essenceCost ? 'text-rose-400' : 'text-red-400'}>{upgrade.essenceCost} ess</span>
                        )}
                      </div>
                      {!prereqMet ? (
                        <span className="text-xs text-[#44444e]">Needs: {campUpgrades.find(u => u.id === upgrade.requires)?.name}</span>
                      ) : (
                        <button onClick={() => handleBuild(upgrade.id)} disabled={!canAfford || isBuilding}
                          className="px-4 py-1.5 text-xs font-semibold rounded-lg transition-all bg-gradient-to-r from-red-700 to-rose-700 hover:from-red-700 hover:to-rose-600 disabled:from-slate-700 disabled:to-slate-700 disabled:text-slate-500 text-white">
                          {isBuilding ? 'Building...' : canAfford ? 'Build' : 'Need more'}
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
