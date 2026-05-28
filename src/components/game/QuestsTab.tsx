'use client';
import { useState, useEffect, useCallback } from 'react';
import type { Quest } from '@/lib/data/quests';

interface QuestData {
  quests: Quest[];
  completed: string[];
  referralCount: number;
  referralCode: string;
  savedFloors: Record<string, number>;
}

interface ClaimState {
  [questId: string]: 'idle' | 'loading' | 'done' | 'error';
}

export function QuestsTab() {
  const [data, setData] = useState<QuestData | null>(null);
  const [claimState, setClaimState] = useState<ClaimState>({});
  const [claimMsg, setClaimMsg] = useState<{ id: string; msg: string; ok: boolean } | null>(null);
  const [copied, setCopied] = useState(false);
  const [activeSection, setActiveSection] = useState<'social' | 'referral' | 'dungeons'>('social');

  const load = useCallback(async () => {
    const res = await fetch('/api/quests');
    const json = await res.json() as { ok: boolean } & QuestData;
    if (json.ok) setData({ ...json, savedFloors: json.savedFloors ?? {} });
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleClaim = async (quest: Quest) => {
    setClaimState(s => ({ ...s, [quest.id]: 'loading' }));
    if (quest.link) window.open(quest.link, '_blank');

    const res = await fetch('/api/quests', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ questId: quest.id }),
    });
    const json = await res.json() as { ok: boolean; error?: string };

    if (json.ok) {
      setClaimState(s => ({ ...s, [quest.id]: 'done' }));
      setClaimMsg({ id: quest.id, msg: `+${quest.reward.gold} Gold${quest.reward.essence ? ` +${quest.reward.essence} ESS` : ''}`, ok: true });
      await load();
    } else {
      setClaimState(s => ({ ...s, [quest.id]: 'error' }));
      setClaimMsg({ id: quest.id, msg: json.error ?? 'Error', ok: false });
    }
    setTimeout(() => setClaimMsg(null), 3000);
  };

  const copyLink = async () => {
    if (!data) return;
    const link = `${window.location.origin}${window.location.pathname}?ref=${data.referralCode}`;
    await navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!data) {
    return (
      <div className="flex items-center justify-center h-40">
        <div className="w-8 h-8 rounded-full border-2 border-purple-600 border-t-transparent animate-spin" />
      </div>
    );
  }

  const socialQuests = data.quests.filter(q => q.type === 'social');
  const referralQuests = data.quests.filter(q => q.type === 'referral');
  const floorQuests = data.quests.filter(q => q.type === 'floor');

  // Group floor quests by dungeon
  const floorQuestsByDungeon = floorQuests.reduce<Record<string, Quest[]>>((acc, q) => {
    const key = q.dungeonName ?? q.dungeonId ?? 'Unknown';
    if (!acc[key]) acc[key] = [];
    acc[key].push(q);
    return acc;
  }, {});
  const inviteLink = `${typeof window !== 'undefined' ? window.location.origin + window.location.pathname : ''}?ref=${data.referralCode}`;

  return (
    <div className="md:h-full md:overflow-y-auto">
    <div className="max-w-2xl mx-auto space-y-4 pb-4">

      {/* Section tabs */}
      <div className="flex gap-2 p-1 bg-[#110a0a] rounded-xl border border-[rgba(200,70,70,0.12)]">
        {([
          ['social', '🌐 Social'],
          ['referral', '👥 Referrals'],
          ['dungeons', '🗺 Dungeons'],
        ] as const).map(([s, label]) => (
          <button key={s} onClick={() => setActiveSection(s)}
            className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all ${
              activeSection === s
                ? 'bg-gradient-to-r from-red-700 to-rose-700 text-white'
                : 'text-[#5a3535] hover:text-[#a07070]'
            }`}>
            {label}
          </button>
        ))}
      </div>

      {activeSection === 'social' && (
        <div className="space-y-3">
          <p className="text-[#6a4040] text-xs px-1">Complete tasks and claim your rewards. These are verified on honor system.</p>
          {socialQuests.map(quest => {
            const done = data.completed.includes(quest.id);
            const loading = claimState[quest.id] === 'loading';
            const isMsg = claimMsg?.id === quest.id;
            return (
              <div key={quest.id} className={`bg-[#130909] border rounded-xl p-4 flex items-center gap-4 transition-all ${done ? 'border-emerald-700/30 opacity-70' : 'border-[rgba(200,70,70,0.2)]'}`}>
                <div className="text-2xl w-10 text-center shrink-0">{quest.icon}</div>
                <div className="flex-1 min-w-0">
                  <p className={`font-semibold text-sm ${done ? 'text-emerald-400' : 'text-slate-200'}`}>{quest.title}</p>
                  <p className="text-[#6a4040] text-xs mt-0.5">{quest.description}</p>
                  <p className="text-amber-400/80 text-xs mt-1">
                    +{quest.reward.gold} Gold{quest.reward.essence > 0 ? ` · +${quest.reward.essence} ESS` : ''}
                  </p>
                </div>
                <div className="shrink-0">
                  {done ? (
                    <span className="text-emerald-400 text-sm font-bold">✓ Done</span>
                  ) : isMsg && claimMsg ? (
                    <span className={`text-xs font-semibold ${claimMsg.ok ? 'text-emerald-400' : 'text-red-400'}`}>{claimMsg.msg}</span>
                  ) : (
                    <button onClick={() => handleClaim(quest)} disabled={loading}
                      className="px-3 py-1.5 text-xs bg-gradient-to-r from-red-700 to-rose-700 hover:from-red-700 hover:to-rose-600 disabled:opacity-50 text-white rounded-lg font-semibold transition-all">
                      {loading ? '...' : 'Complete →'}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {activeSection === 'referral' && (
        <div className="space-y-3">
          {/* Invite link card */}
          <div className="bg-[#130909] border border-[rgba(200,70,70,0.2)] rounded-xl p-4 space-y-3">
            <div className="flex items-center gap-2">
              <span className="text-lg">🔗</span>
              <div>
                <p className="text-slate-200 font-semibold text-sm">Your Invite Link</p>
                <p className="text-[#6a4040] text-xs">Friends who join via your link get +300 Gold & +30 ESS. You get +200 Gold & +20 ESS per referral.</p>
              </div>
            </div>
            <div className="flex items-center gap-2 bg-[#080818] rounded-lg px-3 py-2 border border-[rgba(200,70,70,0.12)]">
              <span className="text-[#5a3535] text-xs font-mono flex-1 truncate">{inviteLink}</span>
              <button onClick={copyLink}
                className={`shrink-0 px-3 py-1 text-xs rounded-lg font-semibold transition-all ${copied ? 'bg-emerald-700 text-white' : 'bg-[#1e0e0e] hover:bg-[#252550] text-[#a07070]'}`}>
                {copied ? '✓ Copied!' : 'Copy'}
              </button>
            </div>
            <div className="flex items-center gap-2">
              <div className="text-[#6a4040] text-xs">Your code:</div>
              <div className="text-red-400 font-mono font-bold text-sm tracking-widest">{data.referralCode}</div>
              <div className="ml-auto text-[#5a3535] text-xs">{data.referralCount} referred</div>
            </div>
          </div>

          {/* Referral milestone quests */}
          {referralQuests.map(quest => {
            const done = data.completed.includes(quest.id);
            const progress = Math.min(data.referralCount, quest.requiredReferrals ?? 0);
            const needed = quest.requiredReferrals ?? 1;
            const pct = Math.min(progress / needed, 1) * 100;
            const canClaim = !done && progress >= needed;
            const loading = claimState[quest.id] === 'loading';
            const isMsg = claimMsg?.id === quest.id;

            return (
              <div key={quest.id} className={`bg-[#130909] border rounded-xl p-4 transition-all ${done ? 'border-emerald-700/30 opacity-70' : canClaim ? 'border-amber-600/40' : 'border-[rgba(200,70,70,0.15)]'}`}>
                <div className="flex items-center gap-3 mb-3">
                  <div className="text-2xl w-10 text-center shrink-0">{quest.icon}</div>
                  <div className="flex-1 min-w-0">
                    <p className={`font-semibold text-sm ${done ? 'text-emerald-400' : 'text-slate-200'}`}>{quest.title}</p>
                    <p className="text-[#6a4040] text-xs mt-0.5">{quest.description}</p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-amber-400/80 text-xs">+{quest.reward.gold} Gold</p>
                    {quest.reward.essence > 0 && <p className="text-rose-400/80 text-xs">+{quest.reward.essence} ESS</p>}
                  </div>
                </div>

                {!done && (
                  <div className="mb-3">
                    <div className="flex items-center justify-between text-[11px] mb-1">
                      <span className="text-[#6a4040]">Progress</span>
                      <span className="text-[#7a5050]">{progress}/{needed}</span>
                    </div>
                    <div className="h-1.5 bg-[#0a0a1a] rounded-full overflow-hidden">
                      <div className={`h-full rounded-full transition-all ${pct >= 100 ? 'bg-amber-500' : 'bg-red-700/70'}`}
                        style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                )}

                <div className="flex justify-end">
                  {done ? (
                    <span className="text-emerald-400 text-sm font-bold">✓ Claimed</span>
                  ) : isMsg && claimMsg ? (
                    <span className={`text-xs font-semibold ${claimMsg.ok ? 'text-emerald-400' : 'text-red-400'}`}>{claimMsg.msg}</span>
                  ) : canClaim ? (
                    <button onClick={() => handleClaim(quest)} disabled={loading}
                      className="px-4 py-1.5 text-xs bg-gradient-to-r from-amber-600 to-yellow-600 hover:from-amber-500 hover:to-yellow-500 disabled:opacity-50 text-white rounded-lg font-semibold transition-all">
                      {loading ? '...' : '🎁 Claim Reward'}
                    </button>
                  ) : (
                    <span className="text-[#4a3030] text-xs">Invite {needed - progress} more</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
      {activeSection === 'dungeons' && (
        <div className="space-y-5">
          <p className="text-[#6a4040] text-xs px-1">Reach milestone floors in each dungeon to earn rewards. Progress is saved from your deepest run.</p>
          {Object.entries(floorQuestsByDungeon).map(([dungeonName, quests]) => {
            const allDone = quests.every(q => data.completed.includes(q.id));
            return (
              <div key={dungeonName}>
                <p className={`text-xs font-bold uppercase tracking-widest mb-2 px-1 ${allDone ? 'text-emerald-600' : 'text-[#7070b0]'}`}>
                  {dungeonName}
                </p>
                <div className="space-y-2">
                  {quests.map(quest => {
                    const done = data.completed.includes(quest.id);
                    const floor = data.savedFloors[quest.dungeonId ?? ''] ?? 0;
                    const required = quest.requiredFloor ?? 0;
                    const canClaim = !done && floor >= required;
                    const loading = claimState[quest.id] === 'loading';
                    const isMsg = claimMsg?.id === quest.id;
                    const pct = Math.min((floor / required) * 100, 100);

                    return (
                      <div key={quest.id}
                        className={`bg-[#130909] border rounded-xl p-3.5 transition-all ${done ? 'border-emerald-700/30 opacity-70' : canClaim ? 'border-amber-600/40' : 'border-[rgba(200,70,70,0.15)]'}`}>
                        <div className="flex items-center gap-3">
                          <div className="text-xl w-8 text-center shrink-0">{quest.icon}</div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2 flex-wrap">
                              <p className={`font-semibold text-sm ${done ? 'text-emerald-400' : 'text-slate-200'}`}>{quest.title}</p>
                              <p className="text-amber-400/80 text-xs shrink-0">+{quest.reward.gold}g{quest.reward.essence > 0 ? ` +${quest.reward.essence} ESS` : ''}</p>
                            </div>
                            <p className="text-[#6a4040] text-xs mt-0.5">Floor {required}</p>
                          </div>
                          <div className="shrink-0">
                            {done ? (
                              <span className="text-emerald-400 text-sm font-bold">✓</span>
                            ) : isMsg && claimMsg ? (
                              <span className={`text-xs font-semibold ${claimMsg.ok ? 'text-emerald-400' : 'text-red-400'}`}>{claimMsg.msg}</span>
                            ) : canClaim ? (
                              <button onClick={() => handleClaim(quest)} disabled={loading}
                                className="px-3 py-1.5 text-xs bg-gradient-to-r from-amber-600 to-yellow-600 hover:from-amber-500 hover:to-yellow-500 disabled:opacity-50 text-white rounded-lg font-semibold transition-all">
                                {loading ? '...' : '🎁 Claim'}
                              </button>
                            ) : (
                              <span className="text-[#4a3030] text-xs tabular-nums">{floor}/{required}</span>
                            )}
                          </div>
                        </div>
                        {!done && floor < required && (
                          <div className="mt-2">
                            <div className="h-1 bg-[#0a0a1a] rounded-full overflow-hidden">
                              <div className="h-full bg-red-700/70 rounded-full transition-all" style={{ width: `${pct}%` }} />
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
    </div>
  );
}
