'use client';
import { useEffect, useRef, useState } from 'react';
import type { ItemInstance } from '@/types/game';
import { SLOT_LABELS, STAT_LABELS } from '@/types/game';
import { RarityText } from '@/components/ui/RarityBadge';

const ITEM_W = 96;
const GAP = 6;
const CELL_W = ITEM_W + GAP; // 102px per cell
const REEL_SIZE = 52;
const LAND_IDX = 44; // winner lands here

const ALL_SLOTS = ['weapon', 'helmet', 'chest', 'boots', 'ring', 'trinket'] as const;

// Decoy pool — weighted toward lower rarities for tension
const DECOY_POOL = [
  'common', 'common', 'common', 'common',
  'uncommon', 'uncommon', 'uncommon',
  'rare', 'rare',
  'epic',
];

const RARITY_BORDER: Record<string, string> = {
  common:    '#374151',
  uncommon:  '#15803d',
  rare:      '#1d4ed8',
  epic:      '#7e22ce',
  legendary: '#92400e',
};

const RARITY_GLOW_BOX: Record<string, string> = {
  common:    '0 0 14px 3px rgba(156,163,175,0.45)',
  uncommon:  '0 0 18px 5px rgba(34,197,94,0.55)',
  rare:      '0 0 24px 6px rgba(59,130,246,0.65)',
  epic:      '0 0 32px 8px rgba(168,85,247,0.75)',
  legendary: '0 0 44px 12px rgba(251,191,36,0.95)',
};

const RARITY_BG_RADIAL: Record<string, string> = {
  common:    'rgba(107,114,128,0.06)',
  uncommon:  'rgba(34,197,94,0.08)',
  rare:      'rgba(59,130,246,0.10)',
  epic:      'rgba(168,85,247,0.13)',
  legendary: 'rgba(251,191,36,0.16)',
};

type ReelItem = { slot: string; rarity: string; isWinner: boolean };

function buildReel(winner: ItemInstance): ReelItem[] {
  const items: ReelItem[] = Array.from({ length: REEL_SIZE }, (_, i) => {
    if (i === LAND_IDX) return { slot: winner.slot, rarity: winner.rarity, isWinner: true };
    const slot = ALL_SLOTS[Math.floor(Math.random() * ALL_SLOTS.length)];
    const rarity = DECOY_POOL[Math.floor(Math.random() * DECOY_POOL.length)];
    return { slot, rarity, isWinner: false };
  });
  return items;
}

interface Props {
  item: ItemInstance;
  caseName: string;
  onClose: () => void;
}

export function CaseOpenModal({ item, caseName, onClose }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const reelRef = useRef<HTMLDivElement>(null);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const reel = useRef<ReelItem[]>(buildReel(item)).current;

  const [phase, setPhase] = useState<'spin' | 'stopped' | 'reveal'>('spin');
  const [revealIn, setRevealIn] = useState(false);
  const [showClose, setShowClose] = useState(false);

  const computeScrollTo = () => {
    const cw = containerRef.current?.clientWidth ?? 700;
    const center = cw / 2;
    return -(LAND_IDX * CELL_W + ITEM_W / 2 - center);
  };

  const doReveal = () => {
    setPhase('reveal');
    setTimeout(() => setRevealIn(true), 60);
    setTimeout(() => setShowClose(true), 900);
  };

  const skipAnimation = () => {
    timers.current.forEach(clearTimeout);
    const el = reelRef.current;
    if (el) {
      el.style.transition = 'none';
      el.style.transform = `translateX(${computeScrollTo()}px)`;
    }
    setPhase('stopped');
    timers.current = [setTimeout(doReveal, 350)];
  };

  useEffect(() => {
    const el = reelRef.current;
    if (!el) return;

    const t1 = setTimeout(() => {
      const scrollTo = computeScrollTo();
      el.style.transition = 'transform 4.9s cubic-bezier(0.07, 0.01, 0.04, 1)';
      el.style.transform = `translateX(${scrollTo}px)`;
    }, 200);

    const t2 = setTimeout(() => setPhase('stopped'), 5300);
    const t3 = setTimeout(doReveal, 5750);

    timers.current = [t1, t2, t3];
    return () => timers.current.forEach(clearTimeout);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const bgColor = phase === 'reveal'
    ? `radial-gradient(ellipse at 50% 40%, ${RARITY_BG_RADIAL[item.rarity]} 0%, #000000ee 55%)`
    : '#000000ee';

  const lineColor = (phase === 'stopped' || phase === 'reveal')
    ? 'rgba(255,255,255,0.85)'
    : 'rgba(245,158,11,0.55)';

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center px-4 transition-all duration-1000 overflow-hidden"
      style={{ background: bgColor }}
    >
      {/* Header */}
      <p className="text-[#404070] text-[10px] uppercase tracking-widest mb-1">Opening</p>
      <p className="text-slate-200 font-bold text-lg mb-8 tracking-wide">{caseName}</p>

      {/* ── Reel ─────────────────────────────────────────────────── */}
      <div className="relative select-none" style={{ width: 'min(714px, calc(100vw - 24px))', height: `${ITEM_W + 12}px` }}>
        {/* Glow layer — outside the clipped container so it radiates in all directions */}
        {(phase === 'stopped' || phase === 'reveal') && (
          <div
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none rounded-xl transition-all duration-500"
            style={{
              width: ITEM_W,
              height: ITEM_W,
              boxShadow: RARITY_GLOW_BOX[item.rarity],
              zIndex: 30,
            }}
          />
        )}
      <div
        ref={containerRef}
        className="absolute inset-0"
        style={{
          overflow: 'hidden',
          maskImage: 'radial-gradient(ellipse 44% 100% at 50% 50%, black 40%, transparent 100%)',
          WebkitMaskImage: 'radial-gradient(ellipse 44% 100% at 50% 50%, black 40%, transparent 100%)',
          zIndex: 10,
        }}
      >

        {/* Center hairline */}
        <div className="absolute inset-y-0 left-1/2 -translate-x-px w-px z-20 transition-colors duration-500"
          style={{ background: lineColor }} />
        {/* Top arrow */}
        <div className="absolute top-0 left-1/2 z-20 -translate-x-1/2"
          style={{ width: 0, height: 0, borderLeft: '7px solid transparent', borderRight: '7px solid transparent', borderTop: `10px solid ${lineColor}` }} />
        {/* Bottom arrow */}
        <div className="absolute bottom-0 left-1/2 z-20 -translate-x-1/2"
          style={{ width: 0, height: 0, borderLeft: '7px solid transparent', borderRight: '7px solid transparent', borderBottom: `10px solid ${lineColor}` }} />

        {/* Items */}
        <div
          ref={reelRef}
          className="absolute top-1.5 flex"
          style={{ gap: `${GAP}px`, transform: 'translateX(0)', willChange: 'transform' }}
        >
          {reel.map((ri, idx) => {
            const isWin = ri.isWinner;
            const active = isWin && (phase === 'stopped' || phase === 'reveal');
            const faded = phase === 'reveal' && !isWin;
            return (
              <div
                key={idx}
                className="shrink-0 rounded-xl flex items-center justify-center"
                style={{
                  width: ITEM_W, height: ITEM_W,
                  background: active ? `linear-gradient(135deg, #1a1a35 0%, #0f0f22 100%)` : '#0d0d20',
                  border: `2px solid ${active ? RARITY_BORDER[ri.rarity] : RARITY_BORDER[ri.rarity] + '50'}`,
                  boxShadow: 'none',
                  opacity: faded ? 0.1 : 1,
                  transform: isWin && phase === 'reveal' ? 'scale(1.18)' : 'scale(1)',
                  transition: 'opacity 0.5s ease, transform 0.55s cubic-bezier(0.34,1.56,0.64,1), box-shadow 0.4s ease, border-color 0.4s ease',
                  zIndex: isWin ? 5 : 1,
                  position: 'relative',
                }}
              >
                <img
                  src={`/icons/items/item_${ri.slot}_${ri.rarity}.png`}
                  alt=""
                  width={58} height={58}
                  style={{ imageRendering: 'pixelated' }}
                />
              </div>
            );
          })}
        </div>
      </div>
      </div>

      {/* ── Reveal info ───────────────────────────────────────────── */}
      <div
        className="mt-8 text-center space-y-1.5"
        style={{
          minHeight: '120px',
          opacity: revealIn ? 1 : 0,
          transform: revealIn ? 'translateY(0)' : 'translateY(14px)',
          transition: 'opacity 0.55s ease, transform 0.55s ease',
        }}
      >
        {phase === 'reveal' && (
          <>
            <RarityText rarity={item.rarity} className="font-black text-2xl block tracking-wide">
              {item.name}
            </RarityText>
            <p className="text-[#5050a0] text-xs capitalize mt-0.5">
              {item.rarity} · {SLOT_LABELS[item.slot]} · GS {item.gearScore}
            </p>
            <div className="mt-3 space-y-1">
              <p className="text-slate-200 text-sm font-medium">+{item.primaryValue} {STAT_LABELS[item.primaryStat]}</p>
              {item.secondaryStats.map(s => (
                <p key={s.stat} className="text-[#6060a0] text-xs">+{s.value} {STAT_LABELS[s.stat]}</p>
              ))}
            </div>
            <p className="text-emerald-500/60 text-[11px] mt-3">Added to Inventory</p>
          </>
        )}
      </div>

      {/* ── Buttons ───────────────────────────────────────────────── */}
      <div className="mt-6 flex flex-col items-center gap-3">
        {showClose ? (
          <button
            onClick={onClose}
            className="px-10 py-3 bg-gradient-to-r from-violet-700 to-purple-700 hover:from-violet-600 hover:to-purple-600 text-white font-bold rounded-xl transition-all text-sm shadow-lg shadow-purple-900/40"
          >
            Awesome!
          </button>
        ) : phase === 'spin' ? (
          <button
            onClick={skipAnimation}
            className="text-[#2a2a55] hover:text-[#5050a0] text-xs transition-colors"
          >
            Skip
          </button>
        ) : null}
      </div>
    </div>
  );
}
