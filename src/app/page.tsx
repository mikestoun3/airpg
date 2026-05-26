'use client';
import { useEffect, useState, useCallback } from 'react';
import type { GameState, RunResult } from '@/types/game';
import { AdventureTab } from '@/components/game/AdventureTab';
import { CharacterTab } from '@/components/game/CharacterTab';
import { InventoryTab } from '@/components/game/InventoryTab';
import { CampTab } from '@/components/game/CampTab';
import { CraftTab } from '@/components/game/CraftTab';
import { ResultModal } from '@/components/game/ResultModal';

type Tab = 'adventure' | 'character' | 'inventory' | 'camp' | 'craft';

const NAV = [
  { id: 'adventure' as Tab, label: 'Adventure', icon: '⚔️', section: 'Explore' },
  { id: 'character' as Tab, label: 'Character', icon: '🛡️', section: null },
  { id: 'inventory' as Tab, label: 'Inventory', icon: '🎒', section: null },
  { id: 'camp' as Tab, label: 'Base Camp', icon: '🏕️', section: 'Base' },
  { id: 'craft' as Tab, label: 'Forge', icon: '⚒️', section: null },
];

export default function GamePage() {
  const [state, setState] = useState<GameState | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>('adventure');
  const [loading, setLoading] = useState(true);
  const [pendingResult, setPendingResult] = useState<{
    result: RunResult; leveled?: boolean; newLevel?: number;
  } | null>(null);
  const [hasCompletedRun, setHasCompletedRun] = useState(false);

  const fetchState = useCallback(async () => {
    const res = await fetch('/api/game');
    const data = await res.json();
    if (data.ok) { setState(data.state); setHasCompletedRun(data.hasCompletedRun); }
    setLoading(false);
  }, []);

  useEffect(() => { fetchState(); }, [fetchState]);

  useEffect(() => {
    if (!state?.activeRun) return;
    const now = Math.floor(Date.now() / 1000);
    const msLeft = Math.max(0, (state.activeRun.endTime - now) * 1000);
    const t = setTimeout(fetchState, msLeft + 500);
    return () => clearTimeout(t);
  }, [state?.activeRun, fetchState]);

  const handleRunStart = (run: GameState['activeRun']) => {
    setState(prev => prev ? { ...prev, activeRun: run, character: { ...prev.character, status: 'on_run' } } : prev);
  };

  const handleRunComplete = async () => {
    const res = await fetch('/api/run/resolve', { method: 'POST' });
    const data = await res.json();
    if (data.ok) {
      setPendingResult({ result: data.result, leveled: data.leveled, newLevel: data.newLevel });
      setHasCompletedRun(false);
      await fetchState();
    }
  };

  const handleResultClose = () => { setPendingResult(null); setActiveTab('inventory'); };

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-[#09091a]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-full border-2 border-purple-600 border-t-transparent animate-spin" />
          <p className="text-[#5050a0] text-sm">Entering the dungeon...</p>
        </div>
      </div>
    );
  }

  if (!state) {
    return (
      <div className="h-screen flex items-center justify-center bg-[#09091a]">
        <p className="text-red-400">Failed to load game state.</p>
      </div>
    );
  }

  const { character } = state;
  const xpPct = Math.min(100, Math.round((character.xp / character.xpToNext) * 100));
  const invBadge = state.inventory.length > 0;

  return (
    <div className="h-screen flex overflow-hidden bg-[#09091a]">

      {/* ── Sidebar ── */}
      <aside className="w-56 flex-shrink-0 bg-[#0c0c1e] border-r border-[rgba(120,110,200,0.12)] flex flex-col">

        {/* Logo */}
        <div className="px-5 py-5 border-b border-[rgba(120,110,200,0.10)]">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-600 to-purple-800 flex items-center justify-center text-sm font-bold">
              A
            </div>
            <div>
              <p className="text-slate-100 font-black text-base leading-none tracking-wide">AirPG</p>
              <p className="text-[#5050a0] text-[10px] tracking-widest uppercase">Idle Dungeon</p>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-4 px-2">
          {NAV.map((item, idx) => {
            const isActive = activeTab === item.id;
            const showBadge = item.id === 'inventory' && invBadge && !isActive;
            const prevItem = idx > 0 ? NAV[idx - 1] : null;
            const showSection = item.section && (!prevItem || prevItem.section !== item.section);

            return (
              <div key={item.id}>
                {showSection && (
                  <p className="text-[10px] text-[#4040a0] uppercase tracking-widest px-3 mt-3 mb-1.5 flex items-center gap-1.5">
                    <span className="text-purple-700">◆</span> {item.section}
                  </p>
                )}
                <button
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all relative mb-0.5 ${
                    isActive
                      ? 'bg-gradient-to-r from-[#1e1e40] to-[#191935] text-slate-100 border border-[rgba(120,110,200,0.25)]'
                      : 'text-[#7070a0] hover:bg-[#141430] hover:text-[#a0a0c0]'
                  }`}>
                  {isActive && <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-purple-500 rounded-r-full" />}
                  <span className="text-base w-5 text-center">{item.icon}</span>
                  <span>{item.label}</span>
                  {showBadge && (
                    <span className="ml-auto w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
                  )}
                </button>
              </div>
            );
          })}
        </nav>

        {/* Bottom: hero status */}
        <div className="px-3 py-4 border-t border-[rgba(120,110,200,0.10)]">
          <div className="flex items-center gap-2 px-2 py-2 rounded-xl bg-[#101025]">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-700 to-purple-900 flex items-center justify-center text-sm shrink-0">
              ⚔
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <p className="text-slate-300 text-xs font-semibold truncate">{character.name}</p>
                <span className={`text-[10px] shrink-0 ml-1 ${
                  character.status === 'on_run' ? 'text-indigo-400' :
                  character.status === 'injured' ? 'text-red-400' : 'text-emerald-400'
                }`}>
                  {character.status === 'on_run' ? '● Away' : character.status === 'injured' ? '✖ Hurt' : '● Idle'}
                </span>
              </div>
              <p className="text-[#5050a0] text-[10px]">Lv.{character.level} Wanderer</p>
            </div>
          </div>
        </div>
      </aside>

      {/* ── Main area ── */}
      <div className="flex-1 flex flex-col overflow-hidden">

        {/* Top bar */}
        <header className="h-14 flex-shrink-0 bg-[#0c0c1e] border-b border-[rgba(120,110,200,0.12)] flex items-center justify-between px-6">

          {/* Breadcrumb */}
          <div className="flex items-center gap-2">
            <h1 className="text-slate-300 font-semibold text-sm capitalize">
              {NAV.find(n => n.id === activeTab)?.label}
            </h1>
          </div>

          {/* Completed run banner */}
          {hasCompletedRun && !pendingResult && (
            <button onClick={handleRunComplete}
              className="absolute left-1/2 -translate-x-1/2 px-4 py-1.5 bg-emerald-900/40 border border-emerald-600/40 rounded-full text-emerald-400 text-xs font-medium hover:bg-emerald-900/60 transition-colors">
              ⚔ Hero has returned! Collect loot →
            </button>
          )}

          {/* Resources */}
          <div className="flex items-center gap-1">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-[#101025] rounded-xl border border-[rgba(120,110,200,0.12)]">
              <span className="text-sm">💰</span>
              <span className="text-amber-400 font-bold text-sm">{character.gold}</span>
            </div>
            {character.essence > 0 && (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-[#101025] rounded-xl border border-[rgba(120,110,200,0.12)]">
                <span className="text-sm">🔮</span>
                <span className="text-purple-400 font-bold text-sm">{character.essence}</span>
              </div>
            )}
            <div className="flex items-center gap-2 px-3 py-1.5 bg-[#101025] rounded-xl border border-[rgba(120,110,200,0.12)]">
              <span className="text-[#6060a0] text-xs">Lv.</span>
              <span className="text-slate-200 font-bold text-sm">{character.level}</span>
              <div className="w-20 h-1.5 bg-[#1a1a35] rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-amber-500 to-yellow-400 rounded-full transition-all"
                  style={{ width: `${xpPct}%` }} />
              </div>
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-hidden p-6">
          <div className="h-full">
            {activeTab === 'adventure' && (
              <AdventureTab state={state} onRunStart={handleRunStart}
                onRunComplete={handleRunComplete} onRefresh={fetchState} />
            )}
            {activeTab === 'character' && (
              <CharacterTab state={state} onRefresh={fetchState} />
            )}
            {activeTab === 'inventory' && (
              <InventoryTab state={state} onRefresh={fetchState} />
            )}
            {activeTab === 'camp' && (
              <CampTab state={state} onRefresh={fetchState} />
            )}
            {activeTab === 'craft' && (
              <CraftTab state={state} onRefresh={fetchState} />
            )}
          </div>
        </main>
      </div>

      {pendingResult && (
        <ResultModal result={pendingResult.result} leveled={pendingResult.leveled}
          newLevel={pendingResult.newLevel} onClose={handleResultClose} />
      )}
    </div>
  );
}
