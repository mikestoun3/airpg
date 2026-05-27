'use client';
import { useState, useEffect, useCallback } from 'react';
import { ethers } from 'ethers';
import type { GameState, ItemInstance, Rarity, EquipmentSlot } from '@/types/game';
import { RARITY_COLORS, RARITY_ORDER, SLOT_LABELS } from '@/types/game';
import type { MarketListing } from '@/lib/db';
import { AIRPG_MARKET_ABI } from '@/lib/market-contract';

interface Props {
  state: GameState;
  onRefresh: () => void;
}

const RARITY_BORDER: Record<Rarity, string> = {
  common:    'border-[rgba(156,163,175,0.2)]',
  uncommon:  'border-[rgba(74,222,128,0.3)]',
  rare:      'border-[rgba(96,165,250,0.3)]',
  epic:      'border-[rgba(192,132,252,0.35)]',
  legendary: 'border-[rgba(251,191,36,0.4)]',
};

const POLYGON_CHAIN_ID = '0x89'; // 137
const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS ?? '';
const MARKET_FEE_PCT = 5;

function formatPol(wei: string): string {
  try {
    const n = ethers.formatEther(BigInt(wei));
    return parseFloat(n).toFixed(4).replace(/\.?0+$/, '') + ' POL';
  } catch {
    return '? POL';
  }
}

async function switchToPolygon(): Promise<void> {
  if (!window.ethereum) throw new Error('MetaMask not found');
  try {
    await window.ethereum.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: POLYGON_CHAIN_ID }],
    });
  } catch (err: unknown) {
    if ((err as { code?: number }).code === 4902) {
      await window.ethereum.request({
        method: 'wallet_addEthereumChain',
        params: [{
          chainId: POLYGON_CHAIN_ID,
          chainName: 'Polygon',
          nativeCurrency: { name: 'POL', symbol: 'POL', decimals: 18 },
          rpcUrls: [
            'https://polygon-bor-rpc.publicnode.com',
            'https://rpc.ankr.com/polygon',
            'https://polygon.llamarpc.com',
          ],
          blockExplorerUrls: ['https://polygonscan.com'],
        }],
      });
    } else {
      throw err;
    }
  }
}

function shortAddr(addr: string): string {
  return addr.slice(0, 6) + '…' + addr.slice(-4);
}

declare global {
  interface Window {
    ethereum?: { request: (a: { method: string; params?: unknown[] }) => Promise<unknown> };
  }
}

export function MarketTab({ state, onRefresh }: Props) {
  const [mobileTab, setMobileTab] = useState<'browse' | 'sell'>('browse');
  const [listings, setListings] = useState<MarketListing[]>([]);
  const [myCharId, setMyCharId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // List-item modal state
  const [showListModal, setShowListModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState<ItemInstance | null>(null);
  const [pricePol, setPricePol] = useState('');
  const [listing, setListing] = useState(false);

  // Filters
  const [filterRarities, setFilterRarities] = useState<Set<Rarity>>(new Set());
  const [filterSlot, setFilterSlot] = useState<EquipmentSlot | ''>('');
  const [minPol, setMinPol] = useState('');
  const [maxPol, setMaxPol] = useState('');
  const [sortBy, setSortBy] = useState<'price_asc' | 'price_desc' | 'rarity_desc' | 'rarity_asc'>('price_asc');

  // Buy state
  const [buyingId, setBuyingId] = useState<string | null>(null);
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  // Edit price state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editPrice, setEditPrice] = useState('');
  const [savingPrice, setSavingPrice] = useState(false);

  const [toast, setToast] = useState<{ text: string; ok: boolean } | null>(null);

  const showToast = (text: string, ok = true) => {
    setToast({ text, ok });
    setTimeout(() => setToast(null), 4000);
  };

  const fetchListings = useCallback(async () => {
    setLoading(true);
    const res = await fetch('/api/market');
    const data = await res.json() as { ok: boolean; listings?: MarketListing[]; myCharId?: string };
    if (data.ok) {
      setListings(data.listings ?? []);
      setMyCharId(data.myCharId ?? null);
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchListings(); }, [fetchListings]);

  const handleList = async () => {
    if (!selectedItem || !pricePol) return;
    try {
      setListing(true);
      const priceWei = ethers.parseEther(pricePol).toString();
      const res = await fetch('/api/market', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemId: selectedItem.id, priceWei }),
      });
      const data = await res.json() as { ok: boolean; error?: string };
      if (data.ok) {
        showToast('Item listed on the market!');
        setShowListModal(false);
        setSelectedItem(null);
        setPricePol('');
        await fetchListings();
        onRefresh();
      } else {
        showToast(data.error ?? 'Failed to list', false);
      }
    } catch (err) {
      showToast(String(err), false);
    } finally {
      setListing(false);
    }
  };

  const handleBuy = async (l: MarketListing) => {
    if (!window.ethereum) { showToast('MetaMask not found', false); return; }
    if (!CONTRACT_ADDRESS) { showToast('Contract not configured — contact support', false); return; }
    setBuyingId(l.id);
    try {
      await switchToPolygon();

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const provider = new ethers.BrowserProvider(window.ethereum as any);
      const signer = await provider.getSigner();

      // Call contract.buy — it splits 95% to seller and 5% to treasury in one tx
      const contract = new ethers.Contract(CONTRACT_ADDRESS, AIRPG_MARKET_ABI, signer);
      const tx = await contract.buy(l.id, l.sellerWallet, { value: BigInt(l.priceWei) });
      const txHash = tx.hash as string;

      showToast('Transaction sent — waiting for confirmation…');
      await tx.wait();

      // Notify server to verify event and finalise DB record
      const res = await fetch('/api/market/buy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ listingId: l.id, txHash }),
      });
      const data = await res.json() as { ok: boolean; error?: string };
      if (data.ok) {
        showToast('Purchase complete! Item added to your inventory.');
        await fetchListings();
        onRefresh();
      } else {
        showToast(data.error ?? 'Server verification failed', false);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (!msg.includes('user rejected') && !msg.includes('ACTION_REJECTED')) showToast(msg, false);
    } finally {
      setBuyingId(null);
    }
  };

  const handleCancel = async (listingId: string) => {
    setCancellingId(listingId);
    try {
      const res = await fetch('/api/market/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ listingId }),
      });
      const data = await res.json() as { ok: boolean; error?: string };
      if (data.ok) {
        showToast('Listing cancelled. Item returned to inventory.');
        await fetchListings();
        onRefresh();
      } else {
        showToast(data.error ?? 'Failed to cancel', false);
      }
    } finally {
      setCancellingId(null);
    }
  };

  const handleSavePrice = async (listingId: string) => {
    if (!editPrice || parseFloat(editPrice) <= 0) return;
    setSavingPrice(true);
    try {
      const priceWei = ethers.parseEther(editPrice).toString();
      const res = await fetch('/api/market', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ listingId, priceWei }),
      });
      const data = await res.json() as { ok: boolean; error?: string };
      if (data.ok) {
        showToast('Price updated. Cancel lock reset to 1 hour.');
        setEditingId(null);
        setEditPrice('');
        await fetchListings();
      } else {
        showToast(data.error ?? 'Failed to update price', false);
      }
    } catch (err) {
      showToast(String(err), false);
    } finally {
      setSavingPrice(false);
    }
  };

  const myListings = listings.filter((l) => l.sellerId === myCharId);

  const toggleRarity = (r: Rarity) => {
    setFilterRarities(prev => {
      const next = new Set(prev);
      if (next.size === 0) { next.add(r); return next; }      // first click: narrow to this
      if (next.has(r) && next.size === 1) { return new Set(); } // last active: reset to all
      next.has(r) ? next.delete(r) : next.add(r);
      return next;
    });
  };

  const hasFilters = filterRarities.size > 0 || filterSlot !== '' || minPol !== '' || maxPol !== '';

  const RARITY_IDX: Record<Rarity, number> = { common: 0, uncommon: 1, rare: 2, epic: 3, legendary: 4 };

  const otherListings = listings
    .filter((l) => l.sellerId !== myCharId)
    .filter((l) => filterRarities.size === 0 || filterRarities.has(l.item.rarity))
    .filter((l) => filterSlot === '' || l.item.slot === filterSlot)
    .filter((l) => {
      try {
        if (minPol) { const min = ethers.parseEther(minPol); if (BigInt(l.priceWei) < min) return false; }
        if (maxPol) { const max = ethers.parseEther(maxPol); if (BigInt(l.priceWei) > max) return false; }
      } catch { /* ignore bad input */ }
      return true;
    })
    .sort((a, b) => {
      if (sortBy === 'price_asc')  return Number(BigInt(a.priceWei) - BigInt(b.priceWei));
      if (sortBy === 'price_desc') return Number(BigInt(b.priceWei) - BigInt(a.priceWei));
      if (sortBy === 'rarity_desc') return RARITY_IDX[b.item.rarity] - RARITY_IDX[a.item.rarity];
      return RARITY_IDX[a.item.rarity] - RARITY_IDX[b.item.rarity];
    });

  return (
    <div className="flex flex-col md:flex-row gap-3 md:gap-6 md:h-full md:overflow-hidden">

      {/* Mobile tab switcher */}
      <div className="flex md:hidden gap-1 flex-shrink-0 bg-[#0f0f22] border border-[rgba(120,110,200,0.15)] rounded-xl p-1">
        <button onClick={() => setMobileTab('browse')}
          className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-all ${
            mobileTab === 'browse' ? 'bg-[#1e1e40] text-slate-100' : 'text-[#6060a0]'
          }`}>
          🏪 Browse
        </button>
        <button onClick={() => setMobileTab('sell')}
          className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-all ${
            mobileTab === 'sell' ? 'bg-[#1e1e40] text-slate-100' : 'text-[#6060a0]'
          }`}>
          💰 Sell
        </button>
      </div>

      {/* LEFT: sell panel */}
      <div className={`${mobileTab === 'sell' ? 'flex' : 'hidden'} md:flex w-full md:w-64 md:flex-shrink-0 flex-col gap-4 overflow-y-auto`}>
        <p className="text-[11px] text-[#6060a0] uppercase tracking-widest flex items-center gap-2">
          <span className="text-purple-500">◆</span> Sell Items
        </p>

        {state.walletAddress ? (
          <>
            <div className="bg-[#14142a] border border-[rgba(120,110,200,0.2)] rounded-xl p-3">
              <p className="text-[10px] text-[#5050a0] mb-1">Your wallet</p>
              <p className="text-slate-300 text-xs font-mono">{shortAddr(state.walletAddress)}</p>
              <p className="text-[10px] text-[#4040a0] mt-1">Marketplace fee: <span className="text-amber-400/70">{MARKET_FEE_PCT}%</span> · Your payout: <span className="text-emerald-400/70">{100 - MARKET_FEE_PCT}%</span></p>
            </div>

            <p className="text-[11px] text-[#6060a0] uppercase tracking-widest">Select item to list</p>
            <div className="space-y-1.5">
              {state.inventory.length === 0 && (
                <p className="text-xs text-[#4040a0] italic px-1">No items in inventory</p>
              )}
              {state.inventory.map((item) => (
                <button
                  key={item.id}
                  onClick={() => { setSelectedItem(item); setShowListModal(true); }}
                  className={`w-full flex items-center gap-2 p-2.5 rounded-lg bg-[#0f0f22] border ${RARITY_BORDER[item.rarity]} hover:bg-[#141428] transition-all text-left`}>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold truncate" style={{ color: RARITY_COLORS[item.rarity] }}>
                      {item.name}
                    </p>
                    <p className="text-[10px] text-[#5050a0]">{item.slot} · GS {item.gearScore}</p>
                  </div>
                  <span className="text-[#5050a0] text-lg shrink-0">→</span>
                </button>
              ))}
            </div>

            {myListings.length > 0 && (
              <>
                <p className="text-[11px] text-[#6060a0] uppercase tracking-widest mt-2">Your listings</p>
                <div className="space-y-1.5">
                  {myListings.map((l) => {
                    const now = Math.floor(Date.now() / 1000);
                    const locked = l.cancelLockUntil && now < l.cancelLockUntil;
                    const lockedMins = locked ? Math.ceil((l.cancelLockUntil - now) / 60) : 0;
                    const isEditing = editingId === l.id;
                    return (
                    <div key={l.id}
                      className={`p-2.5 rounded-lg bg-[#0f0f22] border ${RARITY_BORDER[l.item.rarity]}`}>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold truncate" style={{ color: RARITY_COLORS[l.item.rarity] }}>
                            {l.item.name}
                          </p>
                          <p className="text-[10px] text-amber-400">{formatPol(l.priceWei)}</p>
                          {locked && (
                            <p className="text-[9px] text-[#5050a0]">🔒 cancel in {lockedMins}m</p>
                          )}
                        </div>
                        <button
                          onClick={() => { setEditingId(isEditing ? null : l.id); setEditPrice(''); }}
                          className="text-[10px] text-[#5050a0] hover:text-violet-400 transition-colors shrink-0 px-1"
                          title="Edit price">
                          ✎
                        </button>
                        <button
                          onClick={() => handleCancel(l.id)}
                          disabled={cancellingId === l.id || !!locked}
                          title={locked ? `Locked for ${lockedMins} more minutes` : 'Cancel listing'}
                          className="text-[10px] text-[#5050a0] hover:text-red-400 transition-colors shrink-0 disabled:opacity-30 disabled:cursor-not-allowed">
                          {cancellingId === l.id ? '…' : '✕'}
                        </button>
                      </div>
                      {isEditing && (
                        <div className="mt-2 flex gap-1.5">
                          <input
                            type="number" min="0" step="0.001" placeholder="New price (POL)"
                            value={editPrice}
                            onChange={e => setEditPrice(e.target.value)}
                            className="flex-1 min-w-0 bg-[#14142a] border border-[rgba(120,110,200,0.25)] rounded-lg px-2 py-1 text-slate-200 text-xs outline-none focus:border-violet-500"
                          />
                          <button
                            onClick={() => handleSavePrice(l.id)}
                            disabled={savingPrice || !editPrice || parseFloat(editPrice) <= 0}
                            className="px-2 py-1 text-[10px] font-bold rounded-lg bg-violet-900/40 border border-violet-500/30 text-violet-300 hover:bg-violet-900/60 disabled:opacity-40 transition-all">
                            {savingPrice ? '…' : 'Save'}
                          </button>
                          <button
                            onClick={() => { setEditingId(null); setEditPrice(''); }}
                            className="px-2 py-1 text-[10px] rounded-lg text-[#6060a0] hover:text-slate-300 transition-colors">
                            ✕
                          </button>
                        </div>
                      )}
                    </div>
                    );
                  })}
                </div>
              </>
            )}
          </>
        ) : (
          <div className="bg-[#14142a] border border-[rgba(120,110,200,0.2)] rounded-xl p-4 text-center">
            <p className="text-[#5050a0] text-sm">Connect MetaMask to sell items</p>
          </div>
        )}
      </div>

      {/* RIGHT: all listings */}
      <div className={`${mobileTab === 'browse' ? 'flex' : 'hidden'} md:flex flex-1 flex-col gap-3 overflow-hidden`}>
        {/* Header row */}
        <div className="flex items-center justify-between">
          <p className="text-[11px] text-[#6060a0] uppercase tracking-widest flex items-center gap-2">
            <span className="text-purple-500">◆</span> Market
            <span className="text-[#4040a0]">
              {otherListings.length}{hasFilters ? ` / ${listings.filter(l => l.sellerId !== myCharId).length}` : ''} listing{otherListings.length !== 1 ? 's' : ''}
            </span>
          </p>
          <div className="flex items-center gap-3">
            {hasFilters && (
              <button onClick={() => { setFilterRarities(new Set()); setFilterSlot(''); setMinPol(''); setMaxPol(''); }}
                className="text-[11px] text-red-500/70 hover:text-red-400 transition-colors">
                ✕ clear
              </button>
            )}
            <button onClick={fetchListings} className="text-[11px] text-[#5050a0] hover:text-[#8080b0] transition-colors">
              ↺ Refresh
            </button>
          </div>
        </div>

        {/* Filter bar */}
        <div className="flex-shrink-0 bg-[#0f0f22] border border-[rgba(120,110,200,0.12)] rounded-xl overflow-x-auto">
        <div className="flex gap-3 items-center px-4 py-3 min-w-max">
          {/* Rarity toggles */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[10px] text-[#4040a0] uppercase tracking-wider mr-0.5">Rarity</span>
            <button
              onClick={() => setFilterRarities(new Set())}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all border ${
                filterRarities.size === 0
                  ? 'bg-[#1e1e40] text-slate-300 border-[rgba(120,110,200,0.3)]'
                  : 'text-[#4040a0] border-transparent hover:text-[#7070a0]'
              }`}>
              All
            </button>
            {RARITY_ORDER.map(r => {
              const active = filterRarities.has(r);
              return (
                <button key={r} onClick={() => toggleRarity(r)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-medium capitalize transition-all border ${
                    active
                      ? 'bg-[#1a1a35] border-current'
                      : 'border-transparent hover:bg-[#141428]'
                  }`}
                  style={{ color: active ? RARITY_COLORS[r] : '#4a4a70', borderColor: active ? RARITY_COLORS[r] + '60' : undefined }}>
                  {r}
                </button>
              );
            })}
          </div>

          {/* Divider */}
          <div className="w-px h-5 bg-[rgba(120,110,200,0.15)] self-center" />

          {/* Slot filter */}
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-[#4040a0] uppercase tracking-wider">Slot</span>
            <select value={filterSlot} onChange={e => setFilterSlot(e.target.value as EquipmentSlot | '')}
              className="bg-[#14142a] border border-[rgba(120,110,200,0.2)] rounded-lg px-2 py-1 text-slate-300 text-xs outline-none focus:border-purple-600">
              <option value="">All</option>
              {(Object.keys(SLOT_LABELS) as EquipmentSlot[]).map(s => (
                <option key={s} value={s}>{SLOT_LABELS[s]}</option>
              ))}
            </select>
          </div>

          {/* Divider */}
          <div className="w-px h-5 bg-[rgba(120,110,200,0.15)] self-center" />

          {/* Price range */}
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-[#4040a0] uppercase tracking-wider">Price</span>
            <input value={minPol} onChange={e => setMinPol(e.target.value)}
              type="number" min="0" placeholder="min"
              className="w-20 bg-[#14142a] border border-[rgba(120,110,200,0.2)] rounded-lg px-2 py-1 text-slate-300 text-xs outline-none focus:border-purple-600 placeholder:text-[#3a3a60]"
            />
            <span className="text-[#3a3a60] text-xs">—</span>
            <input value={maxPol} onChange={e => setMaxPol(e.target.value)}
              type="number" min="0" placeholder="max"
              className="w-20 bg-[#14142a] border border-[rgba(120,110,200,0.2)] rounded-lg px-2 py-1 text-slate-300 text-xs outline-none focus:border-purple-600 placeholder:text-[#3a3a60]"
            />
            <span className="text-[10px] text-[#4040a0]">POL</span>
          </div>

          {/* Divider */}
          <div className="w-px h-5 bg-[rgba(120,110,200,0.15)] self-center" />

          {/* Sort */}
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-[#4040a0] uppercase tracking-wider">Sort</span>
            <select value={sortBy} onChange={e => setSortBy(e.target.value as typeof sortBy)}
              className="bg-[#14142a] border border-[rgba(120,110,200,0.2)] rounded-lg px-2 py-1 text-slate-300 text-xs outline-none focus:border-purple-600">
              <option value="price_asc">Price ↑</option>
              <option value="price_desc">Price ↓</option>
              <option value="rarity_desc">Rarity ↓</option>
              <option value="rarity_asc">Rarity ↑</option>
            </select>
          </div>
        </div>
        </div>

        {toast && (
          <div className={`flex-shrink-0 px-4 py-2.5 rounded-xl border text-sm text-center ${
            toast.ok
              ? 'bg-emerald-950/30 border-emerald-700/30 text-emerald-400'
              : 'bg-red-950/30 border-red-700/30 text-red-400'
          }`}>
            {toast.text}
          </div>
        )}

        {loading ? (
          <div className="flex-1 flex items-center justify-center text-[#4040a0]">Loading…</div>
        ) : otherListings.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center">
            <p className="text-4xl mb-3">🏪</p>
            <p className="text-[#5050a0]">{hasFilters ? 'No listings match your filters' : 'No listings right now'}</p>
            {hasFilters
              ? <button onClick={() => { setFilterRarities(new Set()); setFilterSlot(''); setMinPol(''); setMaxPol(''); }}
                  className="mt-2 text-xs text-purple-500 hover:text-purple-400">Clear filters</button>
              : <p className="text-[#3a3a5a] text-xs mt-1">Be the first to list an item!</p>
            }
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto grid grid-cols-1 sm:grid-cols-2 gap-3 pr-1 content-start">
            {otherListings.map((l) => {
              const isBuying = buyingId === l.id;
              return (
                <div key={l.id}
                  className={`bg-[#14142a] rounded-xl border ${RARITY_BORDER[l.item.rarity]} overflow-hidden flex flex-col`}>
                  <div className="h-0.5" style={{ background: `linear-gradient(90deg, ${RARITY_COLORS[l.item.rarity]}60, transparent)` }} />
                  <div className="p-4 flex flex-col gap-2.5 flex-1">
                    <div>
                      <span className="text-[10px] uppercase font-bold tracking-wide" style={{ color: RARITY_COLORS[l.item.rarity] }}>
                        {l.item.rarity}
                      </span>
                      <p className="text-slate-100 font-semibold text-sm mt-0.5">{l.item.name}</p>
                      <p className="text-[#5050a0] text-[10px]">{l.item.slot} · GS {l.item.gearScore}</p>
                    </div>

                    <div className="bg-[#0f0f22] rounded-lg p-2 text-xs">
                      <div className="flex justify-between text-[#6060a0]">
                        <span>{l.item.primaryStat.toUpperCase()}</span>
                        <span className="text-slate-200">+{l.item.primaryValue}</span>
                      </div>
                      {l.item.secondaryStats?.map((s) => (
                        <div key={s.stat} className="flex justify-between text-[#5050a0]">
                          <span>{s.stat.toUpperCase()}</span>
                          <span>+{s.value}</span>
                        </div>
                      ))}
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-amber-400 font-bold text-sm">{formatPol(l.priceWei)}</p>
                        <p className="text-[10px] text-[#4040a0]">{shortAddr(l.sellerWallet)} · {MARKET_FEE_PCT}% fee</p>
                      </div>
                      <button
                        onClick={() => handleBuy(l)}
                        disabled={isBuying || !state.walletAddress}
                        className="px-3 py-1.5 text-xs font-bold rounded-lg bg-amber-900/30 border border-amber-700/40 text-amber-400 hover:bg-amber-900/50 disabled:opacity-50 disabled:cursor-not-allowed transition-all">
                        {isBuying ? '…' : 'Buy'}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* List item modal */}
      {showListModal && selectedItem && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-6">
          <div className="bg-[#0f0f22] border border-[rgba(120,110,200,0.25)] rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl">
            <div className="px-6 py-5 border-b border-[rgba(120,110,200,0.12)]">
              <h2 className="text-slate-100 font-bold text-lg">List on Market</h2>
              <p className="text-[#5050a0] text-xs mt-0.5">Price in POL — buyer pays you directly on Polygon</p>
            </div>
            <div className="px-6 py-5 space-y-4">
              <div className={`bg-[#14142a] rounded-xl border ${RARITY_BORDER[selectedItem.rarity]} p-3`}>
                <p className="text-xs font-bold" style={{ color: RARITY_COLORS[selectedItem.rarity] }}>
                  {selectedItem.rarity}
                </p>
                <p className="text-slate-100 font-semibold">{selectedItem.name}</p>
                <p className="text-[#5050a0] text-xs">{selectedItem.slot} · GS {selectedItem.gearScore} · +{selectedItem.primaryValue} {selectedItem.primaryStat}</p>
              </div>

              <div>
                <label className="text-[11px] text-[#6060a0] uppercase tracking-widest block mb-2">
                  Price (POL)
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="1.0"
                  value={pricePol}
                  onChange={(e) => setPricePol(e.target.value)}
                  className="w-full bg-[#14142a] border border-[rgba(120,110,200,0.2)] rounded-xl px-4 py-2.5 text-slate-100 text-sm focus:outline-none focus:border-violet-500/50"
                />
                {pricePol && !isNaN(parseFloat(pricePol)) && parseFloat(pricePol) > 0 ? (
                  <div className="mt-2 bg-[#0f0f22] rounded-lg px-3 py-2 text-xs space-y-1">
                    <div className="flex justify-between text-[#5050a0]">
                      <span>Marketplace fee ({MARKET_FEE_PCT}%)</span>
                      <span className="text-red-400/70">−{(parseFloat(pricePol) * MARKET_FEE_PCT / 100).toFixed(4)} POL</span>
                    </div>
                    <div className="flex justify-between font-semibold border-t border-[rgba(120,110,200,0.1)] pt-1">
                      <span className="text-[#7070a0]">You receive</span>
                      <span className="text-emerald-400">{(parseFloat(pricePol) * (100 - MARKET_FEE_PCT) / 100).toFixed(4)} POL</span>
                    </div>
                  </div>
                ) : (
                  <p className="text-[10px] text-[#4040a0] mt-1">{MARKET_FEE_PCT}% marketplace fee applies</p>
                )}
              </div>
            </div>
            <div className="px-6 py-4 border-t border-[rgba(120,110,200,0.10)] flex gap-3">
              <button
                onClick={() => { setShowListModal(false); setSelectedItem(null); setPricePol(''); }}
                className="flex-1 py-2.5 rounded-xl border border-[rgba(120,110,200,0.15)] text-[#7070a0] text-sm hover:text-slate-300 transition-colors">
                Cancel
              </button>
              <button
                onClick={handleList}
                disabled={!pricePol || parseFloat(pricePol) <= 0 || listing}
                className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-violet-700 to-purple-700 hover:from-violet-600 hover:to-purple-600 disabled:opacity-50 text-white font-bold text-sm transition-all">
                {listing ? 'Listing…' : 'List Item'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
