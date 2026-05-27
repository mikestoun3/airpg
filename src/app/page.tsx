'use client';
import { useEffect, useState, useCallback } from 'react';
import type { GameState, RunResult } from '@/types/game';
import { AdventureTab } from '@/components/game/AdventureTab';
import { CharacterTab } from '@/components/game/CharacterTab';
import { InventoryTab } from '@/components/game/InventoryTab';
import { CampTab } from '@/components/game/CampTab';
import { CraftTab } from '@/components/game/CraftTab';
import { MarketTab } from '@/components/game/MarketTab';
import { WikiTab } from '@/components/game/WikiTab';
import { QuestsTab } from '@/components/game/QuestsTab';
import { StoreTab } from '@/components/game/StoreTab';
import { ResultModal } from '@/components/game/ResultModal';
import { LoginScreen } from '@/components/auth/LoginScreen';

type Tab = 'adventure' | 'character' | 'inventory' | 'camp' | 'craft' | 'market' | 'wiki' | 'quests' | 'store';

const NAV = [
  { id: 'adventure' as Tab, label: 'Adventure', icon: '⚔️', section: 'Explore' },
  { id: 'character' as Tab, label: 'Character', icon: '🛡️', section: null },
  { id: 'inventory' as Tab, label: 'Inventory', icon: '🎒', section: null },
  { id: 'camp' as Tab, label: 'Camp', icon: '🏕️', section: 'Base' },
  { id: 'craft' as Tab, label: 'Forge', icon: '⚒️', section: null },
  { id: 'market' as Tab, label: 'Market', icon: '🏪', section: 'World' },
  { id: 'quests' as Tab, label: 'Quests', icon: '📋', section: null },
  { id: 'store' as Tab, label: 'Store', icon: '🏬', section: null },
  { id: 'wiki' as Tab, label: 'Wiki', icon: '📖', section: null },
];

function shortAddr(addr: string) {
  return addr.slice(0, 6) + '…' + addr.slice(-4);
}

export default function GamePage() {
  const [state, setState] = useState<GameState | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>('adventure');
  const [loading, setLoading] = useState(true);
  const [maintenance, setMaintenance] = useState(false);
  const [banned, setBanned] = useState<{ reason?: string } | null>(null);
  const [pendingResult, setPendingResult] = useState<{
    result: RunResult; leveled?: boolean; newLevel?: number;
  } | null>(null);
  const [hasCompletedRun, setHasCompletedRun] = useState(false);

  const fetchState = useCallback(async () => {
    const [mRes, gRes] = await Promise.all([fetch('/api/maintenance'), fetch('/api/game')]);
    const mData = await mRes.json() as { maintenance: boolean };
    setMaintenance(mData.maintenance);
    if (mData.maintenance) { setLoading(false); return; }
    if (gRes.status === 403) {
      const d = await gRes.json() as { banned?: boolean; banReason?: string };
      if (d.banned) { setBanned({ reason: d.banReason }); setLoading(false); return; }
    }
    const data = await gRes.json();
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

  const handleLogin = async (_wallet: string) => { await fetchState(); };

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    await fetchState();
  };

  if (loading) {
    return (
      <div className="h-[100dvh] flex items-center justify-center bg-[#09091a]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-full border-2 border-purple-600 border-t-transparent animate-spin" />
          <p className="text-[#5050a0] text-sm">Entering the dungeon...</p>
        </div>
      </div>
    );
  }

  if (maintenance) {
    return (
      <div className="h-[100dvh] flex items-center justify-center bg-[#09091a]">
        <div className="flex flex-col items-center gap-4 text-center px-6">
          <div className="text-5xl">🔧</div>
          <h1 className="text-slate-100 text-2xl font-black tracking-wide">Технические работы</h1>
          <p className="text-[#5050a0] text-sm max-w-xs">Сервер временно недоступен. Мы уже всё чиним — возвращайтесь позже.</p>
        </div>
      </div>
    );
  }

  if (banned) {
    return (
      <div className="h-[100dvh] flex items-center justify-center bg-[#09091a]">
        <div className="flex flex-col items-center gap-5 text-center px-6 max-w-sm">
          <div className="text-5xl">🚫</div>
          <h1 className="text-slate-100 text-2xl font-black tracking-wide">Вы заблокированы</h1>
          {banned.reason && (
            <p className="text-[#7070a0] text-sm bg-[#0f0f22] border border-[rgba(120,110,200,0.2)] rounded-xl px-4 py-3">{banned.reason}</p>
          )}
          <p className="text-[#5050a0] text-sm">Если вы считаете, что блокировка была ошибочной — свяжитесь с нами.</p>
          <a href="https://t.me/airpg_support" target="_blank" rel="noreferrer"
            className="flex items-center gap-2.5 px-6 py-2.5 rounded-xl bg-[#0088cc] hover:bg-[#0099dd] text-white font-bold text-sm transition-all">
            <img src="/icons/telegram.png" alt="Telegram" width={20} height={20} className="rounded-full" />
            Написать в поддержку
          </a>
        </div>
      </div>
    );
  }

  if (!state?.walletAddress) return <LoginScreen onLogin={handleLogin} />;

  if (!state) {
    return (
      <div className="h-[100dvh] flex items-center justify-center bg-[#09091a]">
        <p className="text-red-400">Failed to load game state.</p>
      </div>
    );
  }

  const { character } = state;
  const xpPct = Math.min(100, Math.round((character.xp / character.xpToNext) * 100));
  const invBadge = state.inventory.length > 0;

  return (
    <div className="h-[100dvh] flex overflow-hidden bg-[#09091a]">

      {/* ── Sidebar (desktop only) ── */}
      <aside className="hidden md:flex w-56 flex-shrink-0 bg-[#0c0c1e] border-r border-[rgba(120,110,200,0.12)] flex-col">
        <div className="px-5 py-5 border-b border-[rgba(120,110,200,0.10)]">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-600 to-purple-800 flex items-center justify-center text-sm font-bold">A</div>
            <div>
              <p className="text-slate-100 font-black text-base leading-none tracking-wide">AirPG</p>
              <p className="text-[#5050a0] text-[10px] tracking-widest uppercase">Idle Dungeon</p>
            </div>
          </div>
        </div>

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
                <button onClick={() => setActiveTab(item.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all relative mb-0.5 ${
                    isActive
                      ? 'bg-gradient-to-r from-[#1e1e40] to-[#191935] text-slate-100 border border-[rgba(120,110,200,0.25)]'
                      : 'text-[#7070a0] hover:bg-[#141430] hover:text-[#a0a0c0]'
                  }`}>
                  {isActive && <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-purple-500 rounded-r-full" />}
                  <span className="text-base w-5 text-center">{item.icon}</span>
                  <span>{item.label === 'Camp' ? 'Base Camp' : item.label}</span>
                  {showBadge && <span className="ml-auto w-2 h-2 rounded-full bg-emerald-400 shrink-0" />}
                </button>
              </div>
            );
          })}
        </nav>

        <div className="px-3 py-3 border-t border-[rgba(120,110,200,0.10)] space-y-2">
          <div className="flex items-center gap-2 px-2 py-2 rounded-xl bg-[#101025]">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-700 to-purple-900 flex items-center justify-center text-sm shrink-0">⚔</div>
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
          <div className="flex items-center justify-between px-2 py-1.5 rounded-lg bg-[#0c0c1e] border border-[rgba(120,110,200,0.08)]">
            <span className="text-[10px] text-[#4040a0] font-mono">{shortAddr(state.walletAddress)}</span>
            <button onClick={handleLogout} className="text-[10px] text-[#3a3a6a] hover:text-[#7070a0] transition-colors">out</button>
          </div>
        </div>
      </aside>

      {/* ── Main column ── */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">

        {/* Top bar */}
        <header className="h-12 md:h-14 flex-shrink-0 bg-[#0c0c1e] border-b border-[rgba(120,110,200,0.12)] flex items-center justify-between px-3 md:px-6 relative">
          <div className="flex items-center gap-2">
            {/* Mobile: mini logo */}
            <div className="md:hidden w-6 h-6 rounded-md bg-gradient-to-br from-violet-600 to-purple-800 flex items-center justify-center text-xs font-bold shrink-0">A</div>
            <h1 className="text-slate-300 font-semibold text-sm capitalize">
              {NAV.find(n => n.id === activeTab)?.label === 'Camp' ? 'Base Camp' : NAV.find(n => n.id === activeTab)?.label}
            </h1>
          </div>

          {hasCompletedRun && !pendingResult && (
            <button onClick={handleRunComplete}
              className="absolute left-1/2 -translate-x-1/2 px-3 md:px-4 py-1 md:py-1.5 bg-emerald-900/40 border border-emerald-600/40 rounded-full text-emerald-400 text-[11px] md:text-xs font-medium hover:bg-emerald-900/60 transition-colors whitespace-nowrap">
              ⚔ Loot ready →
            </button>
          )}

          <div className="flex items-center gap-1">
            <div className="flex items-center gap-1.5 px-2 md:px-3 py-1 md:py-1.5 bg-[#101025] rounded-xl border border-[rgba(120,110,200,0.12)]">
              <img src="/icons/res_gold.png" alt="gold" width={16} height={16} style={{ imageRendering: 'pixelated' }} />
              <span className="text-amber-400 font-bold text-xs md:text-sm">{character.gold}</span>
            </div>
            {character.essence > 0 && (
              <div className="hidden sm:flex items-center gap-1.5 px-2 md:px-3 py-1 md:py-1.5 bg-[#101025] rounded-xl border border-[rgba(120,110,200,0.12)]">
                <span className="text-xs">🔮</span>
                <span className="text-purple-400 font-bold text-xs md:text-sm">{character.essence}</span>
              </div>
            )}
            <div className="flex items-center gap-1 md:gap-2 px-2 md:px-3 py-1 md:py-1.5 bg-[#101025] rounded-xl border border-[rgba(120,110,200,0.12)]">
              <span className="text-[#6060a0] text-[10px] md:text-xs">Lv.</span>
              <span className="text-slate-200 font-bold text-xs md:text-sm">{character.level}</span>
              <div className="hidden sm:block w-14 md:w-20 h-1.5 bg-[#1a1a35] rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-amber-500 to-yellow-400 rounded-full transition-all" style={{ width: `${xpPct}%` }} />
              </div>
            </div>
            {/* Mobile logout */}
            <button onClick={handleLogout} className="md:hidden ml-1 text-[10px] text-[#3a3a6a] hover:text-[#7070a0] px-1.5 py-1 rounded">out</button>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto md:overflow-hidden p-3 md:p-6">
          <div className="md:h-full">
            {activeTab === 'adventure' && <AdventureTab state={state} onRunStart={handleRunStart} onRunComplete={handleRunComplete} onRefresh={fetchState} />}
            {activeTab === 'character' && <CharacterTab state={state} onRefresh={fetchState} />}
            {activeTab === 'inventory' && <InventoryTab state={state} onRefresh={fetchState} />}
            {activeTab === 'camp' && <CampTab state={state} onRefresh={fetchState} />}
            {activeTab === 'craft' && <CraftTab state={state} onRefresh={fetchState} />}
            {activeTab === 'market' && <MarketTab state={state} onRefresh={fetchState} />}
            {activeTab === 'quests' && <QuestsTab />}
            {activeTab === 'store' && <StoreTab state={state} onRefresh={fetchState} />}
            {activeTab === 'wiki' && <WikiTab />}
          </div>
        </main>

        {/* ── Bottom nav (mobile only) ── */}
        <nav className="md:hidden flex-shrink-0 bg-[#0c0c1e] border-t border-[rgba(120,110,200,0.12)] flex items-stretch overflow-x-auto">
          {NAV.map((item) => {
            const isActive = activeTab === item.id;
            const showBadge = item.id === 'inventory' && invBadge && !isActive;
            return (
              <button key={item.id} onClick={() => setActiveTab(item.id)}
                className={`flex-shrink-0 flex flex-col items-center justify-center py-2 gap-0.5 relative transition-colors w-14 ${
                  isActive ? 'text-slate-100' : 'text-[#4040a0]'
                }`}>
                {isActive && <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-purple-500 rounded-full" />}
                <span className="text-lg leading-none">{item.icon}</span>
                <span className="text-[9px] font-medium truncate w-full text-center px-0.5">{item.label}</span>
                {showBadge && <span className="absolute top-1.5 right-2 w-1.5 h-1.5 rounded-full bg-emerald-400" />}
              </button>
            );
          })}
        </nav>
      </div>

      {pendingResult && (
        <ResultModal result={pendingResult.result} leveled={pendingResult.leveled}
          newLevel={pendingResult.newLevel} onClose={handleResultClose} />
      )}
    </div>
  );
}
