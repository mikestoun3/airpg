'use client';
import { useState, useEffect, useCallback } from 'react';
import type { GameState } from '@/types/game';

interface LeaderboardEntry {
  rank: number;
  nickname: string | null;
  shortWallet: string;
  level: number;
  seasonPoints: number;
  gearScore: number;
  combatRating: number;
  isCurrentPlayer: boolean;
}

interface LeaderboardData {
  bySeason: LeaderboardEntry[];
  byPower: LeaderboardEntry[];
}

const RANK_COLORS: Record<number, string> = {
  1: '#FFD700',
  2: '#C0C0C0',
  3: '#CD7F32',
};

function RankBadge({ rank }: { rank: number }) {
  const color = RANK_COLORS[rank];
  if (color) {
    return (
      <span className="text-sm font-black" style={{ color }}>
        {rank === 1 ? '👑' : rank === 2 ? '🥈' : '🥉'}
      </span>
    );
  }
  return <span className="text-xs text-[#505060] font-mono w-6 text-right">{rank}</span>;
}

function PlayerName({ entry }: { entry: LeaderboardEntry }) {
  const name = entry.nickname ?? entry.shortWallet;
  return (
    <span className={`text-sm font-semibold truncate max-w-[120px] sm:max-w-[200px] ${
      entry.isCurrentPlayer ? 'text-[#FC3154]' : 'text-slate-200'
    }`}>
      {name}
      {entry.isCurrentPlayer && <span className="text-[10px] text-[#FC3154]/60 ml-1">(you)</span>}
    </span>
  );
}

export function LeaderboardTab({ state }: { state: GameState }) {
  const [view, setView] = useState<'season' | 'power'>('season');
  const [data, setData] = useState<LeaderboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/leaderboard');
      const json = await res.json() as { ok: boolean; bySeason: LeaderboardEntry[]; byPower: LeaderboardEntry[] };
      if (json.ok) {
        setData({ bySeason: json.bySeason, byPower: json.byPower });
        setLastUpdated(new Date());
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const entries = view === 'season' ? (data?.bySeason ?? []) : (data?.byPower ?? []);

  return (
    <div className="flex flex-col gap-4 h-full">

      {/* Header */}
      <div className="flex items-center justify-between flex-shrink-0">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.25em] text-[#FC3154]"
            style={{ textShadow: '0 0 10px rgba(252,49,84,0.6)' }}>
            Leaderboard
          </p>
          {lastUpdated && (
            <p className="text-[10px] text-[#404050] mt-0.5">
              Updated {lastUpdated.toLocaleTimeString()}
            </p>
          )}
        </div>
        <button onClick={load} disabled={loading}
          className="text-xs text-[#505060] hover:text-slate-300 disabled:opacity-40 transition-colors px-2 py-1 border border-[rgba(255,255,255,0.06)] rounded-lg">
          {loading ? '...' : '↻ Refresh'}
        </button>
      </div>

      {/* View toggle */}
      <div className="flex gap-1 p-1 bg-[#0d0d14] rounded-xl border border-[rgba(255,255,255,0.06)] flex-shrink-0">
        {(['season', 'power'] as const).map(v => (
          <button key={v} onClick={() => setView(v)}
            className={`flex-1 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${
              view === v
                ? 'bg-[#FC3154]/20 text-[#FC3154] border border-[#FC3154]/40'
                : 'text-[#404050] hover:text-slate-400'
            }`}>
            {v === 'season' ? '⚡ Season Points' : '⚔ Character Power'}
          </button>
        ))}
      </div>

      {/* Column headers */}
      <div className="grid grid-cols-[32px_1fr_48px_80px] gap-2 px-3 flex-shrink-0">
        <span className="text-[10px] text-[#303040] uppercase tracking-widest">#</span>
        <span className="text-[10px] text-[#303040] uppercase tracking-widest">Player</span>
        <span className="text-[10px] text-[#303040] uppercase tracking-widest text-center">Lvl</span>
        <span className="text-[10px] text-[#303040] uppercase tracking-widest text-right">
          {view === 'season' ? 'Points' : 'Gear Score'}
        </span>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-y-auto space-y-1 pr-1">
        {loading && !data && (
          <div className="flex items-center justify-center h-32">
            <p className="text-[#404050] text-sm">Loading...</p>
          </div>
        )}

        {!loading && entries.length === 0 && (
          <div className="flex items-center justify-center h-32">
            <p className="text-[#404050] text-sm">No players yet</p>
          </div>
        )}

        {entries.map((entry) => (
          <div key={entry.rank}
            className={`grid grid-cols-[32px_1fr_48px_80px] gap-2 items-center px-3 py-2.5 rounded-xl border transition-all ${
              entry.isCurrentPlayer
                ? 'bg-[#FC3154]/08 border-[#FC3154]/30'
                : entry.rank <= 3
                  ? 'bg-[#13131e] border-[rgba(255,255,255,0.08)]'
                  : 'bg-[#0d0d14] border-[rgba(255,255,255,0.04)] hover:border-[rgba(255,255,255,0.08)]'
            }`}>

            <div className="flex items-center justify-center">
              <RankBadge rank={entry.rank} />
            </div>

            <div className="flex flex-col min-w-0">
              <PlayerName entry={entry} />
              {view === 'power' && (
                <span className="text-[10px] text-[#404050]">CR {entry.combatRating} · GS {entry.gearScore}</span>
              )}
              {view === 'season' && (
                <span className="text-[10px] text-[#404050]">CR {entry.combatRating}</span>
              )}
            </div>

            <div className="text-center">
              <span className="text-xs text-[#606070] font-mono">{entry.level}</span>
            </div>

            <div className="text-right">
              {view === 'season' ? (
                <span className={`text-sm font-bold font-mono ${
                  entry.rank === 1 ? 'text-[#FFD700]' :
                  entry.rank === 2 ? 'text-[#C0C0C0]' :
                  entry.rank === 3 ? 'text-[#CD7F32]' :
                  entry.isCurrentPlayer ? 'text-[#FC3154]' : 'text-slate-300'
                }`}>
                  {entry.seasonPoints.toLocaleString()}
                </span>
              ) : (
                <div className="flex flex-col items-end gap-0.5">
                  <span className={`text-sm font-bold font-mono ${
                    entry.rank === 1 ? 'text-[#FFD700]' :
                    entry.rank === 2 ? 'text-[#C0C0C0]' :
                    entry.rank === 3 ? 'text-[#CD7F32]' :
                    entry.isCurrentPlayer ? 'text-[#FC3154]' : 'text-slate-300'
                  }`}>
                    {entry.gearScore}
                  </span>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* My position callout if not in top 100 */}
      {data && view === 'season' && !data.bySeason.some(e => e.isCurrentPlayer) && state.character && (
        <div className="flex-shrink-0 px-3 py-2 bg-[#FC3154]/08 border border-[#FC3154]/20 rounded-xl">
          <p className="text-xs text-[#FC3154]/70">
            Your season points: <span className="font-bold text-[#FC3154]">{state.character.seasonPoints ?? 0}</span> — not in top 100 yet
          </p>
        </div>
      )}
      {data && view === 'power' && !data.byPower.some(e => e.isCurrentPlayer) && state.character && (
        <div className="flex-shrink-0 px-3 py-2 bg-[#FC3154]/08 border border-[#FC3154]/20 rounded-xl">
          <p className="text-xs text-[#FC3154]/70">
            Your Gear Score: <span className="font-bold text-[#FC3154]">{state.character.gearScore ?? 0}</span> — not in top 100 yet
          </p>
        </div>
      )}
    </div>
  );
}
