'use client';
import type { RunResult } from '@/types/game';
import { ItemCard } from '../ui/ItemCard';
import { RARITY_COLORS } from '@/types/game';
import { ResIcon } from '../ui/ResIcon';

const OUTCOME_CONFIG = {
  critical_success: { label: 'Critical Success!', icon: '⚡', color: 'text-amber-400',   bar: 'from-amber-500 to-yellow-500' },
  success:          { label: 'Success',           icon: '✓',  color: 'text-emerald-400', bar: 'from-emerald-600 to-teal-500' },
  partial:          { label: 'Partial Success',   icon: '◎',  color: 'text-blue-400',    bar: 'from-blue-600 to-sky-500' },
  failure:          { label: 'Failed',            icon: '✗',  color: 'text-red-400',     bar: 'from-red-700 to-rose-600' },
  critical_failure: { label: 'Disaster!',         icon: '💀', color: 'text-red-500',     bar: 'from-red-800 to-red-600' },
};

interface Props {
  result: RunResult;
  leveled?: boolean;
  newLevel?: number;
  onClose: () => void;
}

export function ResultModal({ result, leveled, newLevel, onClose }: Props) {
  const cfg = OUTCOME_CONFIG[result.outcome];

  const hasFloorResults = result.floorResults && result.floorResults.length > 0;
  const startFloor = result.startFloor ?? 1;
  const floorsCompleted = result.floorsCompleted ?? 0;
  const endFloor = startFloor + (result.floorResults?.length ?? 0) - 1;

  // Find the retreat floor (first failure floor)
  const failFloor = result.floorResults?.find(f => f.outcome === 'failure');

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-6">
      <div className="bg-[#0f0f22] border border-[rgba(120,110,200,0.25)] rounded-2xl w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col shadow-2xl shadow-black/60">

        {/* Header */}
        <div className={`h-1.5 bg-gradient-to-r ${cfg.bar} rounded-t-2xl`} />
        <div className="px-6 py-5 border-b border-[rgba(120,110,200,0.12)]">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[11px] text-[#7070b0] uppercase tracking-widest">
                {result.dungeonName} · {hasFloorResults
                  ? (startFloor === endFloor ? `Floor ${startFloor}` : `Floors ${startFloor}–${endFloor}`)
                  : result.difficulty}
              </p>
              <h2 className={`text-2xl font-bold mt-1 ${cfg.color}`}>
                {cfg.icon} {cfg.label}
              </h2>
              {hasFloorResults && (
                <p className="text-[#7070b0] text-xs mt-1">
                  {floorsCompleted} of {result.floorResults!.length} floor{result.floorResults!.length > 1 ? 's' : ''} completed
                  {failFloor && ` · Retreated at floor ${failFloor.floor}`}
                </p>
              )}
            </div>
            <div className="text-right text-xs text-[#5050a0] mt-1">
              <div>Roll: <span className={result.combatRoll >= result.dc ? 'text-emerald-400' : 'text-red-400'}>{result.combatRoll}</span></div>
              <div>Need: <span className="text-[#9090c0]">{result.dc}</span></div>
            </div>
          </div>
        </div>

        {/* Rewards strip */}
        <div className="px-6 py-4 flex gap-3 border-b border-[rgba(120,110,200,0.10)]">
          <div className="flex-1 bg-[#14142a] rounded-xl p-3 text-center">
            <p className="text-amber-400 font-bold text-xl">+{result.goldGained}</p>
            <p className="text-[#6060a0] text-[11px] mt-0.5">Gold</p>
          </div>
          {result.essenceGained > 0 && (
            <div className="flex-1 bg-[#14142a] rounded-xl p-3 text-center">
              <p className="text-purple-400 font-bold text-xl">+{result.essenceGained}</p>
              <p className="text-[#6060a0] text-[11px] mt-0.5">Essence</p>
            </div>
          )}
          <div className="flex-1 bg-[#14142a] rounded-xl p-3 text-center">
            <p className="text-blue-400 font-bold text-xl">+{result.xpGained}</p>
            <p className="text-[#6060a0] text-[11px] mt-0.5">XP</p>
          </div>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {leveled && (
            <div className="bg-amber-900/20 border border-amber-500/30 rounded-xl p-4 text-center">
              <p className="text-amber-400 font-bold text-lg">⭐ Level Up → Level {newLevel}</p>
              <p className="text-amber-300/60 text-xs mt-1">+1 stat point available</p>
            </div>
          )}

          {result.injured && (
            <div className="bg-red-950/40 border border-red-700/30 rounded-xl p-3 flex items-center gap-3">
              <span className="text-2xl">🩹</span>
              <div>
                <p className="text-red-400 font-semibold text-sm">Hero Injured</p>
                <p className="text-red-400/60 text-xs">Recovering for {result.injuryDurationMinutes} minutes</p>
              </div>
            </div>
          )}

          {/* Floor-by-floor breakdown */}
          {hasFloorResults && (
            <div>
              <p className="text-[11px] text-[#7070b0] uppercase tracking-widest mb-3">Floor Breakdown</p>
              <div className="space-y-2">
                {result.floorResults!.map((floor) => {
                  const isSuccess = floor.outcome === 'success';
                  const isPartial = floor.outcome === 'partial';
                  const isFail = floor.outcome === 'failure';
                  const outcomeIcon = isSuccess ? '✓' : isPartial ? '◎' : '✗';
                  const outcomeColor = isSuccess ? 'text-emerald-400 border-emerald-700/30 bg-emerald-950/20'
                    : isPartial ? 'text-blue-400 border-blue-700/30 bg-blue-950/20'
                    : 'text-red-400 border-red-700/30 bg-red-950/20';

                  return (
                    <div key={floor.floor} className={`rounded-lg border p-2.5 ${outcomeColor}`}>
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-1.5">
                          {floor.isBoss && <span className="text-xs">👹</span>}
                          <span className="font-semibold text-xs">Floor {floor.floor}</span>
                          <span className="text-[11px] opacity-70">{floor.monsterName}</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs">
                          <span className="opacity-60">DC {floor.dc}</span>
                          <span className="font-bold">{outcomeIcon}</span>
                        </div>
                      </div>

                      {floor.items.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1.5">
                          {floor.items.map((item) => (
                            <span
                              key={item.id}
                              className="text-[11px] px-1.5 py-0.5 rounded bg-[#0f0f22]/60"
                              style={{ color: RARITY_COLORS[item.rarity] }}
                            >
                              {item.name}
                            </span>
                          ))}
                        </div>
                      )}

                      {(floor.gold > 0 || floor.essence > 0) && (
                        <div className="flex gap-2 mt-1 text-[11px] opacity-70">
                          {floor.gold > 0 && <span className="text-amber-400">+{floor.gold}g</span>}
                          {floor.essence > 0 && <span className="text-purple-400">+{floor.essence} ess</span>}
                        </div>
                      )}

                      {isFail && (
                        <p className="text-[11px] mt-1 opacity-60">Hero retreated</p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {result.loot.length > 0 ? (
            <div>
              <p className="text-[11px] text-[#7070b0] uppercase tracking-widest mb-3">
                Loot Found — {result.loot.length} item{result.loot.length > 1 ? 's' : ''}
              </p>
              <div className="grid grid-cols-1 gap-3">
                {result.loot.map((item) => (
                  <ItemCard key={item.id} item={item} />
                ))}
              </div>
            </div>
          ) : (
            !hasFloorResults && (
              <div className="text-center py-6 text-[#5050a0]">
                <p className="text-3xl mb-2">—</p>
                <p className="text-sm">No loot this time</p>
              </div>
            )
          )}

          {result.resourcesGained && result.resourcesGained.length > 0 && (
            <div>
              <p className="text-[11px] text-[#7070b0] uppercase tracking-widest mb-2">Materials Gathered</p>
              <div className="flex flex-wrap gap-2">
                {result.resourcesGained.map((r) => (
                  <div key={r.resourceId}
                    className="flex items-center gap-1.5 bg-[#0f0f22] border border-[rgba(120,110,200,0.15)] rounded-lg px-3 py-1.5 text-sm">
                    <ResIcon resourceId={r.resourceId} fallback={r.icon} size={18} />
                    <span className="text-slate-300">{r.name}</span>
                    <span className="text-emerald-400 font-bold">×{r.quantity}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-[rgba(120,110,200,0.10)]">
          <button onClick={onClose}
            className="w-full py-3.5 bg-gradient-to-r from-violet-700 to-purple-700 hover:from-violet-600 hover:to-purple-600 text-white font-bold rounded-xl transition-all text-sm tracking-wide">
            Continue
          </button>
        </div>
      </div>
    </div>
  );
}
