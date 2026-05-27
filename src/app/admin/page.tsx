'use client';
import { useState, useEffect, useCallback } from 'react';
import type { ItemInstance, Equipment, EquipmentSlot, Rarity } from '@/types/game';
import { ethers } from 'ethers';

// ── Types ──────────────────────────────────────────────────────────────────────

interface AccountSummary {
  id: string;
  name: string;
  level: number;
  gold: number;
  status: string;
  walletAddress: string | null;
}

interface CharacterDetail {
  id: string;
  name: string;
  level: number;
  xp: number;
  xpToNext: number;
  gold: number;
  essence: number;
  relics: number;
  pwr: number;
  end: number;
  lck: number;
  spd: number;
  ins: number;
  statPoints: number;
  status: string;
  walletAddress: string | null;
  equipment: Equipment;
  inventory: ItemInstance[];
}

interface PromoCode {
  code: string;
  reward: { type: string; amount?: number; slot?: string; rarity?: string };
  maxUses: number;
  uses: number;
  createdAt: number;
  expiresAt: number | null;
  active: boolean;
}

interface AdminListing {
  id: string;
  sellerId: string;
  sellerWallet: string;
  sellerName: string;
  item: ItemInstance;
  priceWei: string;
  listedAt: number;
  status: string;
  buyerWallet?: string;
  buyerName?: string;
  txHash?: string;
  soldAt?: number;
}

// ── Constants ──────────────────────────────────────────────────────────────────

const RARITY_COLOR: Record<string, string> = {
  common: '#9ca3af', uncommon: '#4ade80', rare: '#60a5fa',
  epic: '#c084fc', legendary: '#fbbf24',
};

const SLOTS: EquipmentSlot[] = ['weapon', 'helmet', 'chest', 'boots', 'ring', 'trinket'];
const RARITIES: Rarity[] = ['common', 'uncommon', 'rare', 'epic', 'legendary'];

function shortAddr(a: string) { return a.slice(0, 8) + '…' + a.slice(-6); }
function fmtPol(wei: string) { return parseFloat(ethers.formatEther(BigInt(wei))).toFixed(4) + ' POL'; }
function fmtDate(ts: number) { return new Date(ts * 1000).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }); }

// ── Sub-components ─────────────────────────────────────────────────────────────

function Toast({ msg, onDone }: { msg: string; onDone: () => void }) {
  useEffect(() => { const t = setTimeout(onDone, 2800); return () => clearTimeout(t); }, [onDone]);
  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 px-5 py-2.5 bg-[#1a1a3a] border border-[rgba(120,110,200,0.4)] rounded-xl text-slate-200 text-sm shadow-xl z-50">
      {msg}
    </div>
  );
}

function RarityBadge({ rarity }: { rarity: string }) {
  return (
    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wide"
      style={{ color: RARITY_COLOR[rarity] ?? '#888', border: `1px solid ${RARITY_COLOR[rarity] ?? '#888'}40` }}>
      {rarity}
    </span>
  );
}

function ItemRow({ item }: { item: ItemInstance }) {
  return (
    <div className="flex items-start gap-3 px-3 py-2 rounded-lg bg-[#0f0f25] border border-[rgba(120,110,200,0.1)]">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-slate-200 text-xs font-medium truncate" style={{ color: RARITY_COLOR[item.rarity] }}>
            {item.name}
          </span>
          <RarityBadge rarity={item.rarity} />
          <span className="text-[10px] text-[#5050a0] capitalize">{item.slot}</span>
        </div>
        <div className="text-[10px] text-[#6060a0] mt-0.5">
          {item.primaryStat.toUpperCase()} +{item.primaryValue}
          {item.secondaryStats.map(s => ` · ${s.stat.toUpperCase()} +${s.value}`).join('')}
          {item.specialEffects.map(e => ` · ${e.name}`).join('')}
        </div>
      </div>
      <span className="text-[10px] text-[#4040a0] shrink-0">GS {item.gearScore}</span>
    </div>
  );
}

// ── Login screen ───────────────────────────────────────────────────────────────

function LoginPanel({ onLogin }: { onLogin: () => void }) {
  const [secret, setSecret] = useState('');
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setErr('');
    const r = await fetch('/api/admin/auth', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ secret }),
    });
    const d = await r.json() as { ok: boolean; error?: string };
    setLoading(false);
    if (d.ok) onLogin(); else setErr(d.error ?? 'Invalid secret');
  };

  return (
    <div className="h-screen flex items-center justify-center bg-[#09091a]">
      <form onSubmit={submit} className="w-full max-w-sm px-6 flex flex-col gap-4">
        <div className="text-center mb-2">
          <p className="text-slate-100 font-black text-xl">AirPG Admin</p>
          <p className="text-[#5050a0] text-sm">Enter admin secret to continue</p>
        </div>
        {err && <p className="text-red-400 text-sm text-center bg-red-950/30 border border-red-700/30 rounded-xl px-4 py-2">{err}</p>}
        <input
          type="password" value={secret} onChange={e => setSecret(e.target.value)}
          placeholder="Admin secret…" autoFocus
          className="bg-[#0f0f25] border border-[rgba(120,110,200,0.3)] rounded-xl px-4 py-3 text-slate-200 text-sm outline-none focus:border-purple-600"
        />
        <button type="submit" disabled={loading || !secret}
          className="py-3 rounded-xl bg-gradient-to-r from-violet-700 to-purple-700 hover:from-violet-600 hover:to-purple-600 disabled:opacity-50 text-white font-bold text-sm">
          {loading ? 'Verifying…' : 'Enter'}
        </button>
      </form>
    </div>
  );
}

// ── Character detail panel ─────────────────────────────────────────────────────

function CharacterPanel({ charId, toast }: { charId: string; toast: (m: string) => void }) {
  const [detail, setDetail] = useState<CharacterDetail | null>(null);
  const [tab, setTab] = useState<'stats' | 'equipment' | 'inventory'>('stats');
  const [editForm, setEditForm] = useState<Record<string, string | number>>({});
  const [giveGold, setGiveGold] = useState('');
  const [giveSlot, setGiveSlot] = useState<EquipmentSlot>('weapon');
  const [giveRarity, setGiveRarity] = useState<Rarity>('rare');
  const [saving, setSaving] = useState(false);
  const [resetting, setResetting] = useState(false);

  const load = useCallback(async () => {
    const r = await fetch(`/api/admin/character/${charId}`);
    const d = await r.json() as { ok: boolean; character: CharacterDetail; equipment: Equipment; inventory: ItemInstance[] };
    if (d.ok) {
      const c = d.character;
      setDetail({ ...c, equipment: d.equipment, inventory: d.inventory });
      setEditForm({
        name: c.name, level: c.level, xp: c.xp, gold: c.gold, essence: c.essence,
        pwr: c.pwr, end_stat: c.end, lck: c.lck, spd: c.spd, ins: c.ins, stat_points: c.statPoints,
      });
    }
  }, [charId]);

  useEffect(() => { load(); }, [load]);

  const saveStats = async () => {
    setSaving(true);
    await fetch(`/api/admin/character/${charId}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(editForm),
    });
    setSaving(false);
    toast('Character updated');
    load();
  };

  const giveGoldFn = async () => {
    const amount = parseInt(giveGold);
    if (isNaN(amount) || amount <= 0) return;
    const r = await fetch(`/api/admin/character/${charId}/give`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'gold', amount }),
    });
    const d = await r.json() as { ok: boolean };
    if (d.ok) { toast(`+${amount} gold given`); setGiveGold(''); load(); }
  };

  const resetCharacter = async () => {
    setResetting(true);
    await fetch(`/api/admin/character/${charId}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'reset' }),
    });
    setResetting(false);
    toast('Character reset to idle');
    load();
  };

  const giveItemFn = async () => {
    const r = await fetch(`/api/admin/character/${charId}/give`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'item', slot: giveSlot, rarity: giveRarity }),
    });
    const d = await r.json() as { ok: boolean; item?: ItemInstance };
    if (d.ok && d.item) { toast(`Given: ${d.item.name}`); load(); }
  };

  if (!detail) return <div className="flex-1 flex items-center justify-center text-[#5050a0] text-sm">Loading…</div>;

  const statusColor = detail.status === 'on_run' ? 'text-indigo-400' : detail.status === 'injured' ? 'text-red-400' : 'text-emerald-400';

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-[rgba(120,110,200,0.12)]">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-slate-100 font-bold text-lg">{detail.name}</h2>
              <span className="text-[#5050a0] text-sm">Lv.{detail.level}</span>
              <span className={`text-xs ${statusColor}`}>{detail.status}</span>
            </div>
            {detail.walletAddress && (
              <p className="text-[10px] font-mono text-[#4040a0] mt-0.5">{detail.walletAddress}</p>
            )}
          </div>
          <div className="flex items-center gap-4 text-sm">
            <span className="text-amber-400 font-bold">⚡{detail.gold}g</span>
            {detail.essence > 0 && <span className="text-purple-400 font-bold">🔮{detail.essence}</span>}
          </div>
        </div>

        {/* Actions */}
        <div className="mt-3 flex items-center gap-2">
          {detail.status === 'on_run' && (
            <button onClick={resetCharacter} disabled={resetting}
              className="px-3 py-1.5 rounded-lg bg-red-900/30 border border-red-600/40 text-red-400 text-xs hover:bg-red-900/50 disabled:opacity-50 transition-colors">
              {resetting ? 'Resetting…' : '⚠ Reset (unstick from dungeon)'}
            </button>
          )}
        </div>

        {/* Give tools */}
        <div className="mt-3 flex flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <input value={giveGold} onChange={e => setGiveGold(e.target.value)} placeholder="Gold amount"
              className="w-28 bg-[#0f0f25] border border-[rgba(120,110,200,0.25)] rounded-lg px-3 py-1.5 text-slate-200 text-xs outline-none focus:border-purple-600" />
            <button onClick={giveGoldFn}
              className="px-3 py-1.5 rounded-lg bg-amber-700/30 border border-amber-600/40 text-amber-400 text-xs hover:bg-amber-700/50 transition-colors">
              Give Gold
            </button>
          </div>
          <div className="flex items-center gap-2">
            <select value={giveSlot} onChange={e => setGiveSlot(e.target.value as EquipmentSlot)}
              className="bg-[#0f0f25] border border-[rgba(120,110,200,0.25)] rounded-lg px-2 py-1.5 text-slate-200 text-xs outline-none">
              {SLOTS.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <select value={giveRarity} onChange={e => setGiveRarity(e.target.value as Rarity)}
              className="bg-[#0f0f25] border border-[rgba(120,110,200,0.25)] rounded-lg px-2 py-1.5 text-xs outline-none"
              style={{ color: RARITY_COLOR[giveRarity] }}>
              {RARITIES.map(r => <option key={r} value={r} style={{ color: RARITY_COLOR[r] }}>{r}</option>)}
            </select>
            <button onClick={giveItemFn}
              className="px-3 py-1.5 rounded-lg bg-violet-800/30 border border-violet-600/40 text-violet-300 text-xs hover:bg-violet-800/50 transition-colors">
              Roll & Give Item
            </button>
          </div>
        </div>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 px-6 pt-3 pb-0">
        {(['stats', 'equipment', 'inventory'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-1.5 rounded-t-lg text-xs font-medium capitalize transition-colors ${
              tab === t ? 'bg-[#14142a] text-slate-200 border border-b-0 border-[rgba(120,110,200,0.2)]' : 'text-[#5050a0] hover:text-[#8080c0]'
            }`}>
            {t} {t === 'inventory' && `(${detail.inventory.length})`}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-y-auto bg-[#14142a] border-t border-[rgba(120,110,200,0.12)] p-6">

        {tab === 'stats' && (
          <div className="max-w-lg">
            <div className="grid grid-cols-2 gap-3">
              {[
                ['name', 'Name', 'text'],
                ['level', 'Level', 'number'],
                ['xp', 'XP', 'number'],
                ['gold', 'Gold', 'number'],
                ['essence', 'Essence', 'number'],
                ['pwr', 'Power', 'number'],
                ['end_stat', 'Endurance', 'number'],
                ['lck', 'Luck', 'number'],
                ['spd', 'Speed', 'number'],
                ['ins', 'Insight', 'number'],
                ['stat_points', 'Stat Points', 'number'],
              ].map(([key, label, type]) => (
                <div key={key}>
                  <label className="text-[10px] text-[#5050a0] uppercase tracking-wider block mb-1">{label}</label>
                  <input type={type as string} value={editForm[key] ?? ''}
                    onChange={e => setEditForm(prev => ({ ...prev, [key]: type === 'number' ? parseInt(e.target.value) || 0 : e.target.value }))}
                    className="w-full bg-[#0c0c20] border border-[rgba(120,110,200,0.2)] rounded-lg px-3 py-1.5 text-slate-200 text-xs outline-none focus:border-purple-600"
                  />
                </div>
              ))}
            </div>
            <button onClick={saveStats} disabled={saving}
              className="mt-4 px-6 py-2 rounded-xl bg-gradient-to-r from-violet-700 to-purple-700 hover:from-violet-600 hover:to-purple-600 disabled:opacity-50 text-white text-sm font-bold transition-all">
              {saving ? 'Saving…' : 'Save Changes'}
            </button>
          </div>
        )}

        {tab === 'equipment' && (
          <div className="grid grid-cols-1 gap-2 max-w-lg">
            {SLOTS.map(slot => {
              const item = detail.equipment[slot];
              return (
                <div key={slot} className="flex items-center gap-3 px-4 py-2.5 rounded-xl bg-[#0f0f25] border border-[rgba(120,110,200,0.1)]">
                  <span className="text-[10px] text-[#5050a0] uppercase tracking-wider w-16 shrink-0">{slot}</span>
                  {item ? (
                    <div className="flex-1">
                      <span className="text-xs font-medium" style={{ color: RARITY_COLOR[item.rarity] }}>{item.name}</span>
                      <span className="text-[10px] text-[#5050a0] ml-2">
                        {item.primaryStat.toUpperCase()} +{item.primaryValue}
                        {item.secondaryStats.map(s => ` · ${s.stat.toUpperCase()} +${s.value}`).join('')}
                      </span>
                    </div>
                  ) : (
                    <span className="text-[10px] text-[#3a3a5a] italic">Empty</span>
                  )}
                  {item && <span className="text-[10px] text-[#4040a0] shrink-0">GS {item.gearScore}</span>}
                </div>
              );
            })}
          </div>
        )}

        {tab === 'inventory' && (
          <div className="flex flex-col gap-1.5 max-w-xl">
            {detail.inventory.length === 0
              ? <p className="text-[#4040a0] text-sm">Inventory is empty.</p>
              : detail.inventory.map(item => <ItemRow key={item.id} item={item} />)
            }
          </div>
        )}
      </div>
    </div>
  );
}

// ── Market listings panel ──────────────────────────────────────────────────────

function ListingsPanel() {
  const [listings, setListings] = useState<AdminListing[]>([]);
  const [filter, setFilter] = useState<'all' | 'active' | 'sold' | 'cancelled'>('all');

  useEffect(() => {
    fetch('/api/admin/listings').then(r => r.json()).then((d: { ok: boolean; listings: AdminListing[] }) => {
      if (d.ok) setListings(d.listings);
    });
  }, []);

  const shown = filter === 'all' ? listings : listings.filter(l => l.status === filter);

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="px-6 py-4 border-b border-[rgba(120,110,200,0.12)] flex items-center gap-4">
        <h2 className="text-slate-300 font-semibold">Market Listings</h2>
        <div className="flex gap-1">
          {(['all', 'active', 'sold', 'cancelled'] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-3 py-1 rounded-lg text-xs capitalize transition-colors ${
                filter === f ? 'bg-[#1e1e40] text-slate-200 border border-[rgba(120,110,200,0.25)]' : 'text-[#5050a0] hover:text-[#8080c0]'
              }`}>
              {f}
            </button>
          ))}
        </div>
        <span className="text-[#5050a0] text-xs ml-auto">{shown.length} listings</span>
      </div>
      <div className="flex-1 overflow-auto">
        <table className="w-full text-xs">
          <thead className="sticky top-0 bg-[#0c0c1e]">
            <tr className="text-[#4040a0] uppercase tracking-wider text-[10px]">
              <th className="text-left px-4 py-2">Item</th>
              <th className="text-left px-4 py-2">Slot</th>
              <th className="text-left px-4 py-2">Rarity</th>
              <th className="text-left px-4 py-2">Seller</th>
              <th className="text-left px-4 py-2">Price</th>
              <th className="text-left px-4 py-2">Status</th>
              <th className="text-left px-4 py-2">Buyer</th>
              <th className="text-left px-4 py-2">Listed</th>
            </tr>
          </thead>
          <tbody>
            {shown.map(l => {
              const statusClr = l.status === 'active' ? 'text-emerald-400' : l.status === 'sold' ? 'text-blue-400' : 'text-[#5050a0]';
              return (
                <tr key={l.id} className="border-t border-[rgba(120,110,200,0.06)] hover:bg-[#0f0f25] transition-colors">
                  <td className="px-4 py-2.5">
                    <span className="font-medium" style={{ color: RARITY_COLOR[l.item.rarity] }}>{l.item.name}</span>
                  </td>
                  <td className="px-4 py-2.5 text-[#6060a0] capitalize">{l.item.slot}</td>
                  <td className="px-4 py-2.5"><RarityBadge rarity={l.item.rarity} /></td>
                  <td className="px-4 py-2.5">
                    <div className="text-slate-300">{l.sellerName}</div>
                    <div className="text-[10px] font-mono text-[#4040a0]">{shortAddr(l.sellerWallet)}</div>
                  </td>
                  <td className="px-4 py-2.5 text-amber-400 font-mono">{fmtPol(l.priceWei)}</td>
                  <td className={`px-4 py-2.5 font-medium ${statusClr}`}>{l.status}</td>
                  <td className="px-4 py-2.5 text-[#6060a0]">
                    {l.buyerName ?? (l.buyerWallet ? shortAddr(l.buyerWallet) : '—')}
                  </td>
                  <td className="px-4 py-2.5 text-[#5050a0]">{fmtDate(l.listedAt)}</td>
                </tr>
              );
            })}
            {shown.length === 0 && (
              <tr><td colSpan={8} className="px-4 py-8 text-center text-[#4040a0]">No listings</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Promo codes panel ──────────────────────────────────────────────────────────

function PromoPanel({ toast }: { toast: (m: string) => void }) {
  const [codes, setCodes] = useState<PromoCode[]>([]);
  const [rewardType, setRewardType] = useState<'gold' | 'essence' | 'item'>('gold');
  const [codeInput, setCodeInput] = useState('');
  const [amount, setAmount] = useState('100');
  const [slot, setSlot] = useState<EquipmentSlot>('weapon');
  const [rarity, setRarity] = useState<Rarity>('rare');
  const [maxUses, setMaxUses] = useState('1');
  const [expiry, setExpiry] = useState('');
  const [creating, setCreating] = useState(false);

  const load = useCallback(async () => {
    const r = await fetch('/api/admin/promos');
    const d = await r.json() as { ok: boolean; codes: PromoCode[] };
    if (d.ok) setCodes(d.codes);
  }, []);

  useEffect(() => { load(); }, [load]);

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!codeInput.trim()) return;
    setCreating(true);

    const reward = rewardType === 'item'
      ? { type: 'item', slot, rarity }
      : { type: rewardType, amount: parseInt(amount) || 0 };

    const expiresAt = expiry ? Math.floor(new Date(expiry).getTime() / 1000) : undefined;

    const r = await fetch('/api/admin/promos', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: codeInput.toUpperCase(), reward, maxUses: parseInt(maxUses) || 1, expiresAt }),
    });
    const d = await r.json() as { ok: boolean; error?: string };
    setCreating(false);
    if (d.ok) {
      toast(`Code ${codeInput.toUpperCase()} created`);
      setCodeInput('');
      load();
    } else {
      toast(`Error: ${d.error}`);
    }
  };

  const deactivate = async (code: string) => {
    await fetch(`/api/admin/promos/${encodeURIComponent(code)}`, { method: 'DELETE' });
    toast(`Code ${code} deactivated`);
    load();
  };

  function rewardLabel(p: PromoCode) {
    const r = p.reward;
    if (r.type === 'gold') return `${r.amount} Gold`;
    if (r.type === 'essence') return `${r.amount} Essence`;
    if (r.type === 'item') return `${r.rarity} ${r.slot}`;
    return '?';
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="px-6 py-4 border-b border-[rgba(120,110,200,0.12)]">
        <h2 className="text-slate-300 font-semibold mb-4">Promo Codes</h2>

        {/* Create form */}
        <form onSubmit={create} className="flex flex-wrap items-end gap-3">
          <div>
            <label className="text-[10px] text-[#5050a0] uppercase block mb-1">Code</label>
            <input value={codeInput} onChange={e => setCodeInput(e.target.value.toUpperCase())}
              placeholder="WELCOME2025"
              className="w-36 bg-[#0f0f25] border border-[rgba(120,110,200,0.25)] rounded-lg px-3 py-1.5 text-slate-200 text-xs font-mono outline-none focus:border-purple-600 uppercase placeholder:normal-case placeholder:text-[#4040a0]"
            />
          </div>
          <div>
            <label className="text-[10px] text-[#5050a0] uppercase block mb-1">Reward type</label>
            <select value={rewardType} onChange={e => setRewardType(e.target.value as typeof rewardType)}
              className="bg-[#0f0f25] border border-[rgba(120,110,200,0.25)] rounded-lg px-3 py-1.5 text-slate-200 text-xs outline-none">
              <option value="gold">Gold</option>
              <option value="essence">Essence</option>
              <option value="item">Item</option>
            </select>
          </div>
          {rewardType !== 'item' ? (
            <div>
              <label className="text-[10px] text-[#5050a0] uppercase block mb-1">Amount</label>
              <input type="number" value={amount} onChange={e => setAmount(e.target.value)} min="1"
                className="w-24 bg-[#0f0f25] border border-[rgba(120,110,200,0.25)] rounded-lg px-3 py-1.5 text-slate-200 text-xs outline-none focus:border-purple-600"
              />
            </div>
          ) : (
            <>
              <div>
                <label className="text-[10px] text-[#5050a0] uppercase block mb-1">Slot</label>
                <select value={slot} onChange={e => setSlot(e.target.value as EquipmentSlot)}
                  className="bg-[#0f0f25] border border-[rgba(120,110,200,0.25)] rounded-lg px-3 py-1.5 text-slate-200 text-xs outline-none">
                  {SLOTS.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[10px] text-[#5050a0] uppercase block mb-1">Rarity</label>
                <select value={rarity} onChange={e => setRarity(e.target.value as Rarity)}
                  className="bg-[#0f0f25] border border-[rgba(120,110,200,0.25)] rounded-lg px-3 py-1.5 text-xs outline-none"
                  style={{ color: RARITY_COLOR[rarity] }}>
                  {RARITIES.map(r => <option key={r} value={r} style={{ color: RARITY_COLOR[r] }}>{r}</option>)}
                </select>
              </div>
            </>
          )}
          <div>
            <label className="text-[10px] text-[#5050a0] uppercase block mb-1">Max uses (0=∞)</label>
            <input type="number" value={maxUses} onChange={e => setMaxUses(e.target.value)} min="0"
              className="w-20 bg-[#0f0f25] border border-[rgba(120,110,200,0.25)] rounded-lg px-3 py-1.5 text-slate-200 text-xs outline-none focus:border-purple-600"
            />
          </div>
          <div>
            <label className="text-[10px] text-[#5050a0] uppercase block mb-1">Expires (optional)</label>
            <input type="date" value={expiry} onChange={e => setExpiry(e.target.value)}
              className="bg-[#0f0f25] border border-[rgba(120,110,200,0.25)] rounded-lg px-3 py-1.5 text-slate-200 text-xs outline-none focus:border-purple-600"
            />
          </div>
          <button type="submit" disabled={creating || !codeInput.trim()}
            className="px-4 py-1.5 rounded-lg bg-emerald-800/40 border border-emerald-600/40 text-emerald-300 text-xs font-medium hover:bg-emerald-800/60 disabled:opacity-50 transition-colors">
            {creating ? 'Creating…' : '+ Create'}
          </button>
        </form>
      </div>

      {/* Codes table */}
      <div className="flex-1 overflow-auto">
        <table className="w-full text-xs">
          <thead className="sticky top-0 bg-[#0c0c1e]">
            <tr className="text-[#4040a0] uppercase tracking-wider text-[10px]">
              <th className="text-left px-4 py-2">Code</th>
              <th className="text-left px-4 py-2">Reward</th>
              <th className="text-left px-4 py-2">Uses</th>
              <th className="text-left px-4 py-2">Expires</th>
              <th className="text-left px-4 py-2">Status</th>
              <th className="text-left px-4 py-2">Created</th>
              <th className="px-4 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {codes.map(p => {
              const exhausted = p.maxUses > 0 && p.uses >= p.maxUses;
              const expired = p.expiresAt != null && p.expiresAt < Math.floor(Date.now() / 1000);
              const status = !p.active ? 'disabled' : expired ? 'expired' : exhausted ? 'exhausted' : 'active';
              const statusClr = status === 'active' ? 'text-emerald-400' : 'text-[#5050a0]';
              return (
                <tr key={p.code} className="border-t border-[rgba(120,110,200,0.06)] hover:bg-[#0f0f25] transition-colors">
                  <td className="px-4 py-2.5 font-mono font-bold text-slate-200">{p.code}</td>
                  <td className="px-4 py-2.5">
                    <span style={p.reward.rarity ? { color: RARITY_COLOR[p.reward.rarity] } : {}}>
                      {rewardLabel(p)}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-slate-300">
                    {p.uses} / {p.maxUses === 0 ? '∞' : p.maxUses}
                  </td>
                  <td className="px-4 py-2.5 text-[#6060a0]">
                    {p.expiresAt ? fmtDate(p.expiresAt) : '—'}
                  </td>
                  <td className={`px-4 py-2.5 font-medium ${statusClr}`}>{status}</td>
                  <td className="px-4 py-2.5 text-[#5050a0]">{fmtDate(p.createdAt)}</td>
                  <td className="px-4 py-2.5">
                    {status === 'active' && (
                      <button onClick={() => deactivate(p.code)}
                        className="text-[10px] text-red-500/60 hover:text-red-400 transition-colors">
                        Deactivate
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
            {codes.length === 0 && (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-[#4040a0]">No promo codes yet</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Payouts panel ──────────────────────────────────────────────────────────────

interface Payout { id: string; sellerWallet: string; listingId: string; txHash: string; priceWei: string; payoutWei: string; feeWei: string; createdAt: number; status: string }

function PayoutsPanel({ toast }: { toast: (m: string) => void }) {
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [loading, setLoading] = useState(true);
  const fmt = (wei: string) => (parseFloat(ethers.formatEther(BigInt(wei))).toFixed(6)) + ' POL';

  const load = useCallback(async () => {
    setLoading(true);
    const r = await fetch('/api/admin/payouts');
    const d = await r.json() as { ok: boolean; payouts: Payout[] };
    if (d.ok) setPayouts(d.payouts);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const markPaid = async (id: string) => {
    await fetch('/api/admin/payouts', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ payoutId: id }) });
    toast('Marked as paid');
    load();
  };

  const pending = payouts.filter(p => p.status === 'pending');
  const totalOwed = pending.reduce((sum, p) => sum + BigInt(p.payoutWei), BigInt(0));
  const totalFees = payouts.reduce((sum, p) => sum + BigInt(p.feeWei), BigInt(0));

  return (
    <div className="flex-1 overflow-y-auto p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-[#14142a] border border-[rgba(120,110,200,0.2)] rounded-xl p-4">
            <p className="text-[#5050a0] text-xs mb-1">Pending payouts</p>
            <p className="text-red-400 font-bold text-xl">{pending.length}</p>
            <p className="text-[#5050a0] text-xs mt-1">{fmt(totalOwed.toString())} owed to sellers</p>
          </div>
          <div className="bg-[#14142a] border border-[rgba(120,110,200,0.2)] rounded-xl p-4">
            <p className="text-[#5050a0] text-xs mb-1">Total fees collected</p>
            <p className="text-emerald-400 font-bold text-xl">{fmt(totalFees.toString())}</p>
            <p className="text-[#5050a0] text-xs mt-1">stays in treasury</p>
          </div>
          <div className="bg-[#14142a] border border-[rgba(120,110,200,0.2)] rounded-xl p-4">
            <p className="text-[#5050a0] text-xs mb-1">Treasury wallet</p>
            <p className="text-violet-300 font-mono text-xs">0x4eEb…7579</p>
            <p className="text-[#5050a0] text-xs mt-1">send payouts from here</p>
          </div>
        </div>

        <div className="bg-[#14142a] border border-[rgba(120,110,200,0.2)] rounded-xl overflow-hidden">
          <div className="p-4 border-b border-[rgba(120,110,200,0.12)]">
            <h2 className="text-slate-300 font-semibold text-sm">Seller Payouts (5% fee taken, 95% owed to sellers)</h2>
          </div>
          {loading ? <p className="p-4 text-[#5050a0] text-sm">Loading…</p> : (
            <table className="w-full text-xs">
              <thead className="text-[#5050a0] border-b border-[rgba(120,110,200,0.1)]">
                <tr>
                  {['Seller Wallet', 'Full Price', 'Payout (95%)', 'Fee (5%)', 'TX', 'Status', 'Date', ''].map(h => (
                    <th key={h} className="text-left px-4 py-2">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {payouts.map(p => (
                  <tr key={p.id} className="border-b border-[rgba(120,110,200,0.06)] hover:bg-[#0f0f22]">
                    <td className="px-4 py-2 font-mono text-[#8080b0]">{p.sellerWallet.slice(0,8)}…{p.sellerWallet.slice(-4)}</td>
                    <td className="px-4 py-2 text-amber-400">{fmt(p.priceWei)}</td>
                    <td className="px-4 py-2 text-emerald-400">{fmt(p.payoutWei)}</td>
                    <td className="px-4 py-2 text-purple-400">{fmt(p.feeWei)}</td>
                    <td className="px-4 py-2">
                      {p.txHash ? (
                        <a href={`https://polygonscan.com/tx/${p.txHash}`} target="_blank" rel="noreferrer"
                          className="text-[10px] text-blue-400 hover:text-blue-300 font-mono transition-colors">
                          {p.txHash.slice(0, 8)}…
                        </a>
                      ) : <span className="text-[#4040a0]">—</span>}
                    </td>
                    <td className="px-4 py-2">
                      <span className={`px-1.5 py-0.5 rounded text-[10px] ${p.status === 'pending' ? 'bg-red-900/30 text-red-400' : 'bg-emerald-900/30 text-emerald-400'}`}>
                        {p.status}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-[#5050a0]">{new Date(p.createdAt * 1000).toLocaleDateString()}</td>
                    <td className="px-4 py-2">
                      {p.status === 'pending' && (
                        <button onClick={() => markPaid(p.id)}
                          className="text-[10px] text-emerald-400 hover:text-emerald-300 transition-colors">
                          Mark paid
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
                {payouts.length === 0 && (
                  <tr><td colSpan={8} className="px-4 py-6 text-center text-[#4040a0]">No payouts yet</td></tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Main admin page ────────────────────────────────────────────────────────────

export default function AdminPage() {
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [view, setView] = useState<'accounts' | 'listings' | 'promos' | 'payouts'>('accounts');
  const [accounts, setAccounts] = useState<AccountSummary[]>([]);
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [maintenance, setMaintenance] = useState<boolean>(false);
  const [maintenanceLoading, setMaintenanceLoading] = useState(false);

  const showToast = (m: string) => setToast(m);

  const loadMaintenance = useCallback(async () => {
    const r = await fetch('/api/admin/maintenance');
    if (r.ok) { const d = await r.json() as { maintenance: boolean }; setMaintenance(d.maintenance); }
  }, []);

  const toggleMaintenance = async () => {
    setMaintenanceLoading(true);
    const next = !maintenance;
    const r = await fetch('/api/admin/maintenance', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ on: next }) });
    if (r.ok) { setMaintenance(next); showToast(next ? 'Тех.работы включены' : 'Тех.работы отключены'); }
    setMaintenanceLoading(false);
  };

  const checkAuth = useCallback(async () => {
    const r = await fetch('/api/admin/accounts');
    setAuthed(r.status !== 401);
  }, []);

  const loadAccounts = useCallback(async (q?: string) => {
    const url = q ? `/api/admin/accounts?q=${encodeURIComponent(q)}` : '/api/admin/accounts';
    const r = await fetch(url);
    const d = await r.json() as { ok: boolean; accounts: AccountSummary[] };
    if (d.ok) setAccounts(d.accounts);
  }, []);

  useEffect(() => { checkAuth(); }, [checkAuth]);
  useEffect(() => {
    if (authed) { loadAccounts(); loadMaintenance(); }
  }, [authed, loadAccounts, loadMaintenance]);

  useEffect(() => {
    const t = setTimeout(() => loadAccounts(search || undefined), 250);
    return () => clearTimeout(t);
  }, [search, loadAccounts]);

  const logout = async () => {
    await fetch('/api/admin/auth', { method: 'DELETE' });
    setAuthed(false);
  };

  if (authed === null) {
    return <div className="h-screen flex items-center justify-center bg-[#09091a]">
      <div className="w-8 h-8 border-2 border-purple-600 border-t-transparent rounded-full animate-spin" />
    </div>;
  }

  if (!authed) return <LoginPanel onLogin={() => { setAuthed(true); loadAccounts(); }} />;

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-[#09091a] text-slate-300">
      {toast && <Toast msg={toast} onDone={() => setToast(null)} />}

      {/* Header */}
      <header className="h-12 flex-shrink-0 bg-[#0c0c1e] border-b border-[rgba(120,110,200,0.15)] flex items-center px-6 gap-4">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md bg-gradient-to-br from-violet-600 to-purple-800 flex items-center justify-center text-xs font-black">A</div>
          <span className="font-black text-sm tracking-wide text-slate-100">AirPG</span>
          <span className="text-[#5050a0] text-xs tracking-widest">ADMIN</span>
        </div>
        <div className="flex gap-1 ml-6">
          {([
            ['accounts', `Accounts (${accounts.length})`],
            ['listings', 'Market'],
            ['promos', 'Promo Codes'],
            ['payouts', 'Payouts'],
          ] as const).map(([v, label]) => (
            <button key={v} onClick={() => setView(v)}
              className={`px-4 py-1 rounded-lg text-xs transition-colors ${
                view === v ? 'bg-[#1e1e40] text-slate-200 border border-[rgba(120,110,200,0.25)]' : 'text-[#5050a0] hover:text-[#8080c0]'
              }`}>
              {label}
            </button>
          ))}
        </div>
        <div className="ml-auto flex items-center gap-4">
          <button
            onClick={toggleMaintenance}
            disabled={maintenanceLoading}
            className={`flex items-center gap-2 px-3 py-1 rounded-lg text-xs border transition-colors ${
              maintenance
                ? 'bg-red-900/40 border-red-700/50 text-red-300 hover:bg-red-900/60'
                : 'bg-[#1a1a35] border-[rgba(120,110,200,0.2)] text-[#7070c0] hover:text-slate-200'
            } disabled:opacity-50`}
          >
            <span className={`w-2 h-2 rounded-full ${maintenance ? 'bg-red-400' : 'bg-emerald-500'}`} />
            {maintenance ? 'Тех.работы ON' : 'Тех.работы OFF'}
          </button>
          <button onClick={logout} className="text-xs text-[#4040a0] hover:text-[#8080c0] transition-colors">Logout</button>
        </div>
      </header>

      {/* Body */}
      {view === 'listings' ? (
        <ListingsPanel />
      ) : view === 'promos' ? (
        <PromoPanel toast={showToast} />
      ) : view === 'payouts' ? (
        <PayoutsPanel toast={showToast} />
      ) : (
        <div className="flex-1 flex overflow-hidden">
          {/* Sidebar: account list */}
          <aside className="w-64 flex-shrink-0 bg-[#0c0c1e] border-r border-[rgba(120,110,200,0.12)] flex flex-col">
            <div className="p-3 border-b border-[rgba(120,110,200,0.08)]">
              <input value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Search wallet / name…"
                className="w-full bg-[#0f0f25] border border-[rgba(120,110,200,0.2)] rounded-lg px-3 py-1.5 text-slate-200 text-xs outline-none focus:border-purple-600 placeholder:text-[#4040a0]"
              />
            </div>
            <div className="flex-1 overflow-y-auto py-1">
              {accounts.length === 0 && (
                <p className="text-[#4040a0] text-xs text-center py-6">No accounts found</p>
              )}
              {accounts.map(acc => {
                const isSelected = acc.id === selectedId;
                const statusClr = acc.status === 'on_run' ? 'text-indigo-400' : acc.status === 'injured' ? 'text-red-400' : 'text-emerald-400';
                return (
                  <button key={acc.id} onClick={() => setSelectedId(acc.id)}
                    className={`w-full text-left px-4 py-2.5 border-b border-[rgba(120,110,200,0.06)] transition-colors ${
                      isSelected ? 'bg-[#1a1a35]' : 'hover:bg-[#111128]'
                    }`}>
                    <div className="flex items-center justify-between gap-2">
                      <span className={`text-xs font-semibold truncate ${isSelected ? 'text-slate-100' : 'text-slate-300'}`}>{acc.name}</span>
                      <span className={`text-[10px] shrink-0 ${statusClr}`}>●</span>
                    </div>
                    <div className="flex items-center justify-between mt-0.5">
                      <span className="text-[10px] text-[#4040a0]">Lv.{acc.level}</span>
                      <span className="text-[10px] text-amber-700">{acc.gold}g</span>
                    </div>
                    {acc.walletAddress && (
                      <p className="text-[9px] font-mono text-[#3535a0] mt-0.5 truncate">{acc.walletAddress}</p>
                    )}
                  </button>
                );
              })}
            </div>
          </aside>

          {/* Main: character detail */}
          <div className="flex-1 flex overflow-hidden">
            {selectedId
              ? <CharacterPanel key={selectedId} charId={selectedId} toast={showToast} />
              : <div className="flex-1 flex items-center justify-center text-[#3535a0] text-sm">← Select an account</div>
            }
          </div>
        </div>
      )}
    </div>
  );
}
