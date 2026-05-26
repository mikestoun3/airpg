'use client';
import { useState } from 'react';
import type { GameState } from '@/types/game';

interface Props {
  state: GameState;
  onRefresh: () => void;
}

const UPGRADE_ICONS: Record<string, string> = {
  storage_room: '📦',
  the_forge: '🔥',
  the_shrine: '⛩️',
  the_library: '📚',
  armory: '⚔️',
};

const UPGRADE_COLORS: Record<string, string> = {
  storage_room: 'from-slate-700 to-slate-600',
  the_forge:    'from-orange-800 to-red-700',
  the_shrine:   'from-violet-800 to-purple-700',
  the_library:  'from-blue-800 to-indigo-700',
  armory:       'from-slate-700 to-gray-600',
};

export function CampTab({ state, onRefresh }: Props) {
  const [building, setBuilding] = useState<string | null>(null);
  const [message, setMessage] = useState<{ text: string; ok: boolean } | null>(null);

  const { campUpgrades, character } = state;
  const builtIds = campUpgrades.filter(u => u.built).map(u => u.id);

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
    <div className="flex gap-6 h-full">
      {/* LEFT: camp overview */}
      <div className="w-64 flex-shrink-0 flex flex-col gap-4">
        <div className="bg-[#14142a] border border-[rgba(120,110,200,0.2)] rounded-xl p-5">
          <p className="text-[11px] text-[#6060a0] uppercase tracking-widest mb-4 flex items-center gap-2">
            <span className="text-purple-500">◆</span> Resources
          </p>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[#8080b0] text-sm flex items-center gap-2">
                <span>💰</span> Gold
              </span>
              <span className="text-amber-400 font-bold">{character.gold}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[#8080b0] text-sm flex items-center gap-2">
                <span>🔮</span> Essence
              </span>
              <span className="text-purple-400 font-bold">{character.essence}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[#8080b0] text-sm flex items-center gap-2">
                <span>⭐</span> Relics
              </span>
              <span className="text-blue-400 font-bold">{character.relics}</span>
            </div>
          </div>
        </div>

        <div className="bg-[#14142a] border border-[rgba(120,110,200,0.2)] rounded-xl p-5">
          <p className="text-[11px] text-[#6060a0] uppercase tracking-widest mb-3">Progress</p>
          <div className="flex items-center gap-2">
            <div className="flex-1 flex gap-1">
              {campUpgrades.map((u) => (
                <div key={u.id}
                  className={`flex-1 h-1.5 rounded-full ${u.built ? 'bg-purple-500' : 'bg-[#252545]'}`} />
              ))}
            </div>
            <span className="text-[#6060a0] text-xs">{builtIds.length}/{campUpgrades.length}</span>
          </div>
        </div>

        {message && (
          <div className={`rounded-xl p-3 text-sm text-center border ${
            message.ok
              ? 'bg-emerald-900/20 border-emerald-700/30 text-emerald-400'
              : 'bg-red-950/30 border-red-700/30 text-red-400'
          }`}>
            {message.text}
          </div>
        )}
      </div>

      {/* RIGHT: upgrade cards grid */}
      <div className="flex-1 overflow-y-auto">
        <p className="text-[11px] text-[#6060a0] uppercase tracking-widest mb-4 flex items-center gap-2">
          <span className="text-purple-500">◆</span> Base Upgrades
        </p>
        <div className="grid grid-cols-2 gap-4">
          {campUpgrades.map((upgrade) => {
            const canAfford = character.gold >= upgrade.goldCost && character.essence >= upgrade.essenceCost;
            const prereqMet = !upgrade.requires || builtIds.includes(upgrade.requires);
            const isBuilding = building === upgrade.id;

            return (
              <div key={upgrade.id}
                className={`bg-[#14142a] border rounded-xl overflow-hidden transition-all ${
                  upgrade.built
                    ? 'border-purple-600/30'
                    : prereqMet
                    ? 'border-[rgba(120,110,200,0.2)] hover:border-[rgba(120,110,200,0.35)]'
                    : 'border-[rgba(120,110,200,0.08)] opacity-55'
                }`}>
                {/* Color bar */}
                <div className={`h-1.5 bg-gradient-to-r ${UPGRADE_COLORS[upgrade.id] ?? 'from-slate-700 to-slate-600'} ${upgrade.built ? 'opacity-100' : 'opacity-50'}`} />

                <div className="p-5">
                  <div className="flex items-start gap-3 mb-3">
                    <span className="text-3xl">{UPGRADE_ICONS[upgrade.id] ?? '🏗️'}</span>
                    <div>
                      <h3 className={`font-bold text-sm ${upgrade.built ? 'text-purple-300' : 'text-slate-200'}`}>
                        {upgrade.name} {upgrade.built && '✓'}
                      </h3>
                      <p className="text-[#6060a0] text-xs mt-0.5">{upgrade.description}</p>
                    </div>
                  </div>

                  <div className="bg-[#0f0f22] rounded-lg px-3 py-2 mb-4">
                    <p className="text-[#8080c0] text-xs">{upgrade.effect}</p>
                  </div>

                  {!upgrade.built && (
                    <div className="flex items-center justify-between">
                      <div className="flex gap-2 text-xs">
                        <span className={character.gold >= upgrade.goldCost ? 'text-amber-400' : 'text-red-400'}>
                          {upgrade.goldCost}g
                        </span>
                        {upgrade.essenceCost > 0 && (
                          <span className={character.essence >= upgrade.essenceCost ? 'text-purple-400' : 'text-red-400'}>
                            {upgrade.essenceCost} ess
                          </span>
                        )}
                      </div>

                      {!prereqMet ? (
                        <span className="text-xs text-[#4040a0]">
                          Needs: {campUpgrades.find(u => u.id === upgrade.requires)?.name}
                        </span>
                      ) : (
                        <button onClick={() => handleBuild(upgrade.id)} disabled={!canAfford || isBuilding}
                          className="px-4 py-1.5 text-xs font-semibold rounded-lg transition-all bg-gradient-to-r from-violet-700 to-purple-700 hover:from-violet-600 hover:to-purple-600 disabled:from-slate-700 disabled:to-slate-700 disabled:text-slate-500 text-white">
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
