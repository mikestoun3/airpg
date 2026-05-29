'use client';
import { useEffect, useState, useCallback, useRef } from 'react';
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
import { LeaderboardTab } from '@/components/game/LeaderboardTab';
import { ResultModal } from '@/components/game/ResultModal';
import { LoginScreen } from '@/components/auth/LoginScreen';

type Tab = 'adventure' | 'character' | 'inventory' | 'camp' | 'craft' | 'market' | 'wiki' | 'quests' | 'store' | 'leaderboard';

const NAV = [
  { id: 'adventure' as Tab, label: 'Adventure', icon: '⚔️', section: 'Explore' },
  { id: 'character' as Tab, label: 'Character', icon: '🛡️', section: null },
  { id: 'inventory' as Tab, label: 'Inventory', icon: '🎒', section: null },
  { id: 'camp' as Tab, label: 'Camp', icon: '🏕️', section: 'Base' },
  { id: 'craft' as Tab, label: 'Forge', icon: '⚒️', section: null },
  { id: 'market' as Tab, label: 'Market', icon: '🏪', section: 'World' },
  { id: 'quests' as Tab, label: 'Quests', icon: '📋', section: null },
  { id: 'store' as Tab, label: 'Store', icon: '🏬', section: null },
  { id: 'leaderboard' as Tab, label: 'Ranks', icon: '🏆', section: null },
  { id: 'wiki' as Tab, label: 'Wiki', icon: '📖', section: null },
];

// Mobile: 7 grouped nav items
const MOBILE_NAV = [
  { id: 'adventure',    label: 'Adventure', icon: '⚔️', tabs: ['adventure'] as Tab[],           subs: [] as string[] },
  { id: 'hero',         label: 'Hero',      icon: '🛡️', tabs: ['character', 'inventory'] as Tab[], subs: ['Character', 'Inventory'] },
  { id: 'base',         label: 'Base',      icon: '🏕️', tabs: ['camp', 'craft'] as Tab[],        subs: ['Camp', 'Forge'] },
  { id: 'trade',        label: 'Trade',     icon: '🏪', tabs: ['market', 'store'] as Tab[],       subs: ['Market', 'Store'] },
  { id: 'quests',       label: 'Quests',    icon: '📋', tabs: ['quests'] as Tab[],               subs: [] as string[] },
  { id: 'leaderboard',  label: 'Ranks',     icon: '🏆', tabs: ['leaderboard'] as Tab[],          subs: [] as string[] },
  { id: 'wiki',         label: 'Wiki',      icon: '📖', tabs: ['wiki'] as Tab[],                 subs: [] as string[] },
];

function shortAddr(addr: string) {
  return addr.slice(0, 6) + '…' + addr.slice(-4);
}

function NicknameModal({ onDone }: { onDone: () => void }) {
  const [value, setValue] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  const validate = (v: string) => {
    if (v.length === 0) return '';
    if (v.length < 3) return 'Минимум 3 символа';
    if (!/^[a-zA-Z0-9_]+$/.test(v)) return 'Только латиница, цифры и _';
    return '';
  };

  const handleChange = (v: string) => {
    if (v.length > 13) return;
    setValue(v);
    setError(validate(v));
  };

  const submit = async () => {
    const err = validate(value);
    if (err || value.length < 3) { setError(err || 'Минимум 3 символа'); return; }
    setLoading(true);
    const res = await fetch('/api/nickname', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nickname: value }),
    });
    const data = await res.json() as { ok: boolean; error?: string };
    setLoading(false);
    if (data.ok) { onDone(); }
    else { setError(data.error ?? 'Ошибка'); }
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#0b0b0f]/95 backdrop-blur-sm flex items-center justify-center px-4">
      <div className="w-full max-w-sm bg-[#16161f] border border-[rgba(200,70,70,0.25)] rounded-2xl overflow-hidden shadow-2xl">
        <div className="px-6 pt-8 pb-6">
          <div className="text-center mb-6">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#d4294a] to-[#7a1228] flex items-center justify-center text-2xl mx-auto mb-4">⚔️</div>
            <h2 className="text-slate-100 font-black text-xl tracking-wide">Выберите никнейм</h2>
            <p className="text-[#606068] text-sm mt-1">Это имя увидят другие игроки</p>
          </div>

          <div className="relative mb-1.5">
            <input
              ref={inputRef}
              value={value}
              onChange={e => handleChange(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') submit(); }}
              placeholder="Hero_123"
              maxLength={13}
              className={`w-full bg-[#1a1a26] border rounded-xl px-4 py-3 text-slate-100 text-sm font-mono tracking-wide outline-none transition-colors ${
                error ? 'border-[#FC3154]/60 focus:border-[#FC3154]' : 'border-[rgba(200,70,70,0.25)] focus:border-[#FC3154]'
              }`}
            />
            <span className={`absolute right-3 top-1/2 -translate-y-1/2 text-xs font-mono ${value.length >= 13 ? 'text-amber-400' : 'text-[#44444e]'}`}>
              {value.length}/13
            </span>
          </div>

          {error ? (
            <p className="text-[#FC3154] text-xs mb-4 px-1">{error}</p>
          ) : (
            <p className="text-[#44444e] text-xs mb-4 px-1">Латиница, цифры и _ · 3–13 символов · навсегда</p>
          )}

          <button onClick={submit} disabled={loading || value.length < 3 || !!error}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-[#d4294a] to-[#d4294a] hover:from-[#FC3154] hover:to-[#e02a49] disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold text-sm transition-all">
            {loading ? 'Проверяем…' : 'Начать игру'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function GamePage() {
  const [state, setState] = useState<GameState | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>('adventure');
  const [loading, setLoading] = useState(true);
  const [maintenance, setMaintenance] = useState(false);
  const [banned, setBanned] = useState<{ reason?: string } | null>(null);
  const [showNicknameModal, setShowNicknameModal] = useState(false);
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
    if (data.ok) {
      setState(data.state);
      setHasCompletedRun(data.hasCompletedRun);
      if (data.state?.character && !data.state.character.nicknameSet) {
        setShowNicknameModal(true);
      }
    }
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
      <div className="h-[100dvh] flex items-center justify-center bg-[#0b0b0f]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-full border-2 border-[#d4294a] border-t-transparent animate-spin" />
          <p className="text-[#606068] text-sm">Entering the dungeon...</p>
        </div>
      </div>
    );
  }

  if (maintenance) {
    return (
      <div className="h-[100dvh] flex items-center justify-center bg-[#0b0b0f]">
        <div className="flex flex-col items-center gap-4 text-center px-6">
          <div className="text-5xl">🔧</div>
          <h1 className="text-slate-100 text-2xl font-black tracking-wide">Технические работы</h1>
          <p className="text-[#606068] text-sm max-w-xs">Сервер временно недоступен. Мы уже всё чиним — возвращайтесь позже.</p>
        </div>
      </div>
    );
  }

  if (banned) {
    return (
      <div className="h-[100dvh] flex items-center justify-center bg-[#0b0b0f]">
        <div className="flex flex-col items-center gap-5 text-center px-6 max-w-sm">
          <div className="text-5xl">🚫</div>
          <h1 className="text-slate-100 text-2xl font-black tracking-wide">Вы заблокированы</h1>
          {banned.reason && (
            <p className="text-[#78788a] text-sm bg-[#16161f] border border-[rgba(255,255,255,0.09)] rounded-xl px-4 py-3">{banned.reason}</p>
          )}
          <p className="text-[#606068] text-sm">Если вы считаете, что блокировка была ошибочной — свяжитесь с нами.</p>
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
      <div className="h-[100dvh] flex items-center justify-center bg-[#0b0b0f]">
        <p className="text-[#FC3154]">Failed to load game state.</p>
      </div>
    );
  }

  const { character } = state;
  const xpPct = Math.min(100, Math.round((character.xp / character.xpToNext) * 100));
  const invBadge = state.inventory.length > 0;

  return (
    <div className="h-[100dvh] flex overflow-hidden bg-[#0b0b0f]">

      {showNicknameModal && (
        <NicknameModal onDone={async () => { setShowNicknameModal(false); await fetchState(); }} />
      )}

      {/* ── Sidebar (desktop only) ── */}
      <aside className="hidden md:flex w-56 flex-shrink-0 bg-[#0e0e14] border-r border-[rgba(255,255,255,0.07)] flex-col">
        <div className="px-5 py-5 border-b border-[rgba(255,255,255,0.06)]">
          <img src="/icons/logo.png" alt="Nexfall" className="h-9 w-auto object-contain" />
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
                  <p className="text-[10px] text-[#44444e] uppercase tracking-widest px-3 mt-3 mb-1.5 flex items-center gap-1.5">
                    <span className="text-red-800">◆</span> {item.section}
                  </p>
                )}
                <button onClick={() => setActiveTab(item.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all relative mb-0.5 ${
                    isActive
                      ? 'font-bold'
                      : 'font-medium text-[#68687a] hover:bg-[#16161e] hover:text-[#909098]'
                  }`}>
                  {isActive && (
                    <>
                      <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-6 bg-[#FC3154] rounded-r-full shadow-[0_0_8px_rgba(252,49,84,0.9)]" />
                      <span className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-[#FC3154]/10 to-transparent rounded-l-xl" />
                    </>
                  )}
                  <span className={`text-base w-5 text-center ${isActive ? 'text-[#FC3154]' : ''}`}>{item.icon}</span>
                  <span
                    className={isActive ? 'text-[#FC3154] uppercase tracking-wider text-xs' : ''}
                    style={isActive ? { textShadow: '0 0 8px rgba(252,49,84,0.7), 0 0 16px rgba(252,49,84,0.3)' } : undefined}>
                    {item.label === 'Camp' ? 'Base Camp' : item.label}
                  </span>
                  {showBadge && <span className="ml-auto w-2 h-2 rounded-full bg-emerald-400 shrink-0" />}
                </button>
              </div>
            );
          })}
        </nav>

        <div className="px-3 py-3 border-t border-[rgba(255,255,255,0.06)] space-y-2">
          <div className="flex items-center gap-2 px-2 py-2 rounded-xl bg-[#16161f]">
            <div className="w-8 h-8 rounded-full overflow-hidden shrink-0 border border-[rgba(255,255,255,0.1)]">
                <img src="/icons/character_avatar.png" alt="avatar" className="w-full h-full object-cover object-top" />
              </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <p className="text-slate-300 text-xs font-semibold truncate">{character.name}</p>
                <span className={`text-[10px] shrink-0 ml-1 ${
                  character.status === 'on_run' ? 'text-blue-400' :
                  character.status === 'injured' ? 'text-[#FC3154]' : 'text-emerald-400'
                }`}>
                  {character.status === 'on_run' ? '● Away' : character.status === 'injured' ? '✖ Hurt' : '● Idle'}
                </span>
              </div>
              <p className="text-[#606068] text-[10px]">Lv.{character.level} Wanderer</p>
            </div>
          </div>
          <div className="flex items-center justify-between px-2 py-1.5 rounded-lg bg-[#0e0e14] border border-[rgba(255,255,255,0.05)]">
            <span className="text-[10px] text-[#44444e] font-mono">{shortAddr(state.walletAddress)}</span>
            <button onClick={handleLogout} className="text-[10px] text-[#404048] hover:text-[#78788a] transition-colors">out</button>
          </div>
        </div>
      </aside>

      {/* ── Main column ── */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">

        {/* Top bar */}
        <header className="h-12 md:h-14 flex-shrink-0 bg-[#0e0e14] border-b border-[rgba(255,255,255,0.07)] flex items-center justify-between px-3 md:px-6 relative">
          <div className="flex items-center gap-2">
            {/* Mobile: mini logo */}
            <img src="/icons/logo.png" alt="Nexfall" className="md:hidden h-6 w-auto object-contain shrink-0" />
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
            <div className="flex items-center gap-1.5 px-2 md:px-3 py-1 md:py-1.5 bg-[#16161f] rounded-xl border border-[rgba(255,255,255,0.07)]">
              <img src="/icons/res_gold.png" alt="gold" width={16} height={16} style={{ imageRendering: 'pixelated' }} />
              <span className="text-amber-400 font-bold text-xs md:text-sm">{character.gold}</span>
            </div>
            {character.essence > 0 && (
              <div className="hidden sm:flex items-center gap-1.5 px-2 md:px-3 py-1 md:py-1.5 bg-[#16161f] rounded-xl border border-[rgba(255,255,255,0.07)]">
                <span className="text-xs">🔮</span>
                <span className="text-[#FC3154] font-bold text-xs md:text-sm">{character.essence}</span>
              </div>
            )}
            <div className="flex items-center gap-1 md:gap-2 px-2 md:px-3 py-1 md:py-1.5 bg-[#16161f] rounded-xl border border-[rgba(255,255,255,0.07)]">
              <span className="text-[#505058] text-[10px] md:text-xs">Lv.</span>
              <span className="text-slate-200 font-bold text-xs md:text-sm">{character.level}</span>
              <div className="hidden sm:block w-14 md:w-20 h-1.5 bg-[#1e1e2c] rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-amber-500 to-yellow-400 rounded-full transition-all" style={{ width: `${xpPct}%` }} />
              </div>
            </div>
            {/* Mobile logout */}
            <button onClick={handleLogout} className="md:hidden ml-1 text-[10px] text-[#404048] hover:text-[#78788a] px-1.5 py-1 rounded">out</button>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto md:overflow-hidden p-3 md:p-6">
          <div className="md:h-full">
            {/* Mobile sub-nav for grouped tabs */}
            {(() => {
              const group = MOBILE_NAV.find(g => g.tabs.includes(activeTab));
              if (!group || group.subs.length === 0) return null;
              return (
                <div className="md:hidden flex gap-1.5 mb-3">
                  {group.tabs.map((tabId, i) => (
                    <button key={tabId} onClick={() => setActiveTab(tabId)}
                      className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all border ${
                        activeTab === tabId
                          ? 'bg-[#1c1c28] text-slate-100 border-[rgba(200,70,70,0.35)]'
                          : 'text-[#606068] border-transparent hover:text-[#909098]'
                      }`}>
                      {group.subs[i]}
                    </button>
                  ))}
                </div>
              );
            })()}

            {activeTab === 'adventure' && <AdventureTab state={state} onRunStart={handleRunStart} onRunComplete={handleRunComplete} onRefresh={fetchState} onNavigate={(t) => setActiveTab(t as Tab)} />}
            {activeTab === 'character' && <CharacterTab state={state} onRefresh={fetchState} />}
            {activeTab === 'inventory' && <InventoryTab state={state} onRefresh={fetchState} />}
            {activeTab === 'camp' && <CampTab state={state} onRefresh={fetchState} />}
            {activeTab === 'craft' && <CraftTab state={state} onRefresh={fetchState} />}
            {activeTab === 'market' && <MarketTab state={state} onRefresh={fetchState} />}
            {activeTab === 'quests' && <QuestsTab />}
            {activeTab === 'store' && <StoreTab state={state} onRefresh={fetchState} />}
            {activeTab === 'leaderboard' && <LeaderboardTab state={state} />}
            {activeTab === 'wiki' && <WikiTab />}
          </div>
        </main>

        {/* ── Bottom nav (mobile only, 6 groups — no scroll) ── */}
        <nav className="md:hidden flex-shrink-0 bg-[#0e0e14] border-t border-[rgba(255,255,255,0.07)] flex items-stretch">
          {MOBILE_NAV.map((group) => {
            const isActive = group.tabs.includes(activeTab);
            const showBadge = group.id === 'hero' && invBadge && !isActive;
            return (
              <button key={group.id}
                onClick={() => {
                  if (!isActive) { setActiveTab(group.tabs[0]); }
                  // if already active and has sub-tabs, sub-nav handles switching
                }}
                className={`flex-1 flex flex-col items-center justify-center py-2 gap-0.5 relative transition-colors ${
                  isActive ? 'text-[#FC3154]' : 'text-[#44444e]'
                }`}>
                {isActive && (
                  <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-[#FC3154] rounded-full shadow-[0_0_6px_rgba(252,49,84,0.9)]" />
                )}
                <span className={`text-base leading-none ${isActive ? 'drop-shadow-[0_0_4px_rgba(252,49,84,0.8)]' : ''}`}>{group.icon}</span>
                <span
                  className="text-[9px] font-medium"
                  style={isActive ? { textShadow: '0 0 6px rgba(252,49,84,0.7)' } : undefined}>
                  {group.label}
                </span>
                {showBadge && <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-emerald-400" />}
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
