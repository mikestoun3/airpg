'use client';
import { useState } from 'react';
import type { GameState, ItemInstance } from '@/types/game';
import { STORE_ITEMS, type StoreItem } from '@/lib/data/store';
import { RarityText, RARITY_BORDER, RARITY_BG, RARITY_GLOW } from '@/components/ui/RarityBadge';
import { CaseOpenModal } from './CaseOpenModal';

declare global {
  interface Window {
    ethereum?: {
      request: (a: { method: string; params?: unknown[] }) => Promise<unknown>;
    };
  }
}

const STORE_ADDRESS = process.env.NEXT_PUBLIC_STORE_ADDRESS ?? '';

interface Props {
  state: GameState;
  onRefresh: () => void;
}

type Category = 'all' | 'gold' | 'essence' | 'loot_case';

const CATEGORY_LABELS: Record<Category, string> = {
  all: 'All',
  gold: '💰 Gold',
  essence: '🔮 Essence',
  loot_case: '📦 Cases',
};

interface PurchaseResult {
  item: ItemInstance | null;
  reward: { type: string; amount?: number };
  name: string;
}

export function StoreTab({ state, onRefresh }: Props) {
  const [category, setCategory] = useState<Category>('all');
  const [buying, setBuying] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<PurchaseResult | null>(null);
  const [caseOpen, setCaseOpen] = useState<{ item: ItemInstance; caseName: string } | null>(null);

  const filtered = category === 'all' ? STORE_ITEMS : STORE_ITEMS.filter(i => i.category === category);

  const handleBuy = async (item: StoreItem) => {
    setError(null);
    if (!window.ethereum) {
      setError('MetaMask not found. Please install MetaMask.');
      return;
    }
    if (!STORE_ADDRESS) {
      setError('Store address not configured. Contact support.');
      return;
    }

    setBuying(item.id);
    try {
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' }) as string[];
      const from = accounts[0];
      if (!from) throw new Error('No account');

      const txHash = await window.ethereum.request({
        method: 'eth_sendTransaction',
        params: [{
          from,
          to: STORE_ADDRESS,
          value: '0x' + BigInt(item.priceWei).toString(16),
        }],
      }) as string;

      const res = await fetch('/api/store/purchase', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ storeItemId: item.id, txHash }),
      });
      const json = await res.json() as { ok: boolean; reward?: { type: string; amount?: number }; item?: ItemInstance; error?: string };

      if (!json.ok) throw new Error(json.error ?? 'Purchase failed');

      onRefresh();

      // Loot cases → open with reel animation; packs → simple modal
      if (item.category === 'loot_case' && json.item) {
        setCaseOpen({ item: json.item, caseName: item.name });
      } else {
        setResult({ item: json.item ?? null, reward: json.reward!, name: item.name });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes('User rejected') || msg.includes('user rejected') || msg.includes('denied')) {
        setError('Transaction cancelled.');
      } else {
        setError(msg);
      }
    } finally {
      setBuying(null);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-4">

      {/* Case opening animation */}
      {caseOpen && (
        <CaseOpenModal
          item={caseOpen.item}
          caseName={caseOpen.caseName}
          onClose={() => setCaseOpen(null)}
        />
      )}

      {/* Result modal (gold/essence packs) */}
      {result && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4" onClick={() => setResult(null)}>
          <div className="bg-[#0f0f22] border border-[rgba(120,110,200,0.3)] rounded-2xl p-6 max-w-sm w-full text-center space-y-4" onClick={e => e.stopPropagation()}>
            <div className="text-4xl">🎉</div>
            <p className="text-slate-200 font-bold text-lg">Purchase Successful!</p>
            <p className="text-[#7070a0] text-sm">{result.name}</p>

            {result.reward.type === 'gold' && (
              <div className="bg-amber-900/20 border border-amber-700/30 rounded-xl px-4 py-3">
                <p className="text-amber-400 font-bold text-xl">+{result.reward.amount?.toLocaleString()} Gold</p>
              </div>
            )}
            {result.reward.type === 'essence' && (
              <div className="bg-purple-900/20 border border-purple-700/30 rounded-xl px-4 py-3">
                <p className="text-purple-400 font-bold text-xl">+{result.reward.amount?.toLocaleString()} Essence</p>
              </div>
            )}
            {result.reward.type === 'loot_case' && result.item && (
              <div className={`border ${RARITY_BORDER[result.item.rarity]} ${RARITY_BG[result.item.rarity]} ${RARITY_GLOW[result.item.rarity]} rounded-xl px-4 py-3`}>
                <RarityText rarity={result.item.rarity} className="font-bold text-base block">{result.item.name}</RarityText>
                <p className="text-[#6060a0] text-xs mt-1 capitalize">{result.item.rarity} · GS {result.item.gearScore}</p>
                <p className="text-slate-300 text-sm mt-1">+{result.item.primaryValue} {result.item.primaryStat.toUpperCase()}</p>
                <p className="text-emerald-400/80 text-xs mt-1">Added to Inventory</p>
              </div>
            )}

            <button onClick={() => setResult(null)}
              className="w-full py-2.5 bg-gradient-to-r from-violet-700 to-purple-700 hover:from-violet-600 hover:to-purple-600 text-white rounded-xl font-semibold text-sm transition-all">
              Great!
            </button>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="bg-[#0f0f22] border border-[rgba(120,110,200,0.2)] rounded-xl p-4">
        <div className="flex items-center gap-3">
          <span className="text-2xl">🏬</span>
          <div className="flex-1">
            <p className="text-slate-200 font-bold">Store</p>
            <p className="text-[#5050a0] text-xs">Purchase Gold, Essence, and Loot Cases with POL (Polygon)</p>
          </div>
          <div className="text-right">
            <p className="text-amber-400 font-bold text-sm">{state.character.gold.toLocaleString()} G</p>
            {state.character.essence > 0 && <p className="text-purple-400 text-xs">{state.character.essence} ESS</p>}
          </div>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-950/40 border border-red-700/30 rounded-xl px-4 py-3 text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* Category filter */}
      <div className="flex gap-2 overflow-x-auto pb-0.5">
        {(Object.keys(CATEGORY_LABELS) as Category[]).map(cat => (
          <button key={cat} onClick={() => setCategory(cat)}
            className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              category === cat
                ? 'bg-violet-700 text-white'
                : 'bg-[#0f0f22] text-[#6060a0] hover:text-[#9090c0] border border-[rgba(120,110,200,0.15)]'
            }`}>
            {CATEGORY_LABELS[cat]}
          </button>
        ))}
      </div>

      {/* Items grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {filtered.map(item => {
          const isLootCase = item.category === 'loot_case';
          return (
            <div key={item.id} className="bg-[#0f0f22] border border-[rgba(120,110,200,0.18)] rounded-xl p-4 flex flex-col gap-3 relative">
              {item.badge && (
                <span className="absolute top-2.5 right-2.5 text-[10px] px-2 py-0.5 rounded-full font-bold bg-amber-900/50 text-amber-400 border border-amber-700/30">
                  {item.badge}
                </span>
              )}

              <div className="flex items-center gap-3">
                <div className="text-3xl w-12 h-12 flex items-center justify-center bg-[#080818] rounded-xl border border-[rgba(120,110,200,0.1)]">
                  {item.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-slate-200 font-semibold text-sm">{item.name}</p>
                  <p className="text-[#5050a0] text-xs">{item.description}</p>
                </div>
              </div>

              {isLootCase && item.reward.type === 'loot_case' && (
                <div className="grid grid-cols-5 gap-1">
                  {Object.entries(item.reward.rarityWeights)
                    .filter(([, w]) => w > 0)
                    .map(([rarity, weight]) => {
                      const colors: Record<string, string> = {
                        common: 'text-slate-400', uncommon: 'text-green-400',
                        rare: 'text-blue-400', epic: 'text-purple-400', legendary: 'text-amber-400',
                      };
                      return (
                        <div key={rarity} className="text-center">
                          <p className={`text-[10px] font-bold ${colors[rarity] ?? 'text-slate-400'}`}>{weight}%</p>
                          <p className="text-[9px] text-[#4040a0] capitalize truncate">{rarity.slice(0, 4)}</p>
                        </div>
                      );
                    })}
                </div>
              )}

              <div className="flex items-center justify-between mt-auto">
                <span className="text-emerald-400 font-bold text-sm">{item.priceDisplay}</span>
                <button
                  onClick={() => handleBuy(item)}
                  disabled={buying === item.id || !STORE_ADDRESS}
                  className="px-4 py-1.5 text-xs bg-gradient-to-r from-violet-700 to-purple-700 hover:from-violet-600 hover:to-purple-600 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg font-semibold transition-all">
                  {buying === item.id ? '⏳ Sending...' : !STORE_ADDRESS ? 'Soon™' : 'Buy'}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <p className="text-center text-[#3a3a6a] text-xs pb-2">
        Payments are sent on Polygon network. Ensure your MetaMask is connected to Polygon.
      </p>
    </div>
  );
}
