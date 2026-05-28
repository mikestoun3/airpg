import { NextRequest, NextResponse } from 'next/server';
import { getSessionWallet } from '@/lib/auth';
import {
  getOrCreateCharacter,
  getEquipment,
  getInventory,
  getActiveRun,
  getCompletedUnresolvedRun,
  getLastRunResult,
  getBuiltUpgrades,
  getGearScore,
  getTier1Clears,
  updateCharacterStatus,
  getMaterials,
  getFloorProgress,
  logIp,
} from '@/lib/db';
import { RESOURCES } from '@/lib/data/resources';
import type { ResourceStack } from '@/types/game';
import { DUNGEONS } from '@/lib/data/dungeons';
import { getCampUpgradesWithState } from '@/lib/data/camp';
import type { GameState } from '@/types/game';

export async function GET(req: NextRequest) {
  try {
    const wallet = getSessionWallet(req);
    const char = getOrCreateCharacter(wallet ?? undefined);

    // Log IP for analytics
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
      ?? req.headers.get('x-real-ip')
      ?? 'unknown';
    if (ip !== 'unknown') logIp(char.id, ip);

    if (char.banned) {
      return NextResponse.json({ ok: false, banned: true, banReason: char.banReason ?? null }, { status: 403 });
    }

    const equipment = getEquipment(char.id);
    const inventory = getInventory(char.id);
    const builtUpgrades = getBuiltUpgrades(char.id);
    const tier1Clears = getTier1Clears(char.id);

    // Auto-resolve injury if time has passed
    if (char.status === 'injured' && char.injuredUntil) {
      const now = Math.floor(Date.now() / 1000);
      if (now >= char.injuredUntil) {
        updateCharacterStatus(char.id, 'idle');
        char.status = 'idle';
        char.injuredUntil = undefined;
      }
    }

    // Compute gear score + effective stats (base + equipment bonuses)
    const gearScore = getGearScore(char.id);
    char.gearScore = gearScore;
    const bonus = { pwr: 0, end: 0, lck: 0, spd: 0, ins: 0 };
    for (const slot of ['weapon','helmet','chest','boots','ring','trinket'] as const) {
      const item = equipment[slot];
      if (!item) continue;
      if (item.primaryStat in bonus) bonus[item.primaryStat as keyof typeof bonus] += item.primaryValue;
      for (const s of item.secondaryStats) {
        if (s.stat in bonus) bonus[s.stat as keyof typeof bonus] += s.value;
      }
    }
    char.pwr += bonus.pwr;
    char.end += bonus.end;
    char.lck += bonus.lck;
    char.spd += bonus.spd;
    char.ins += bonus.ins;
    char.combatRating = Math.floor(char.pwr * 1.5 + char.end);

    // Floor progress
    const savedFloors = getFloorProgress(char.id);

    // Active run (include pre-rolled preview events for journey log)
    const activeRunRow = getActiveRun(char.id);
    const activeRun = activeRunRow
      ? (() => {
          const preRolledRaw = activeRunRow.pre_rolled_json as string | null;
          const preRolledData = preRolledRaw ? JSON.parse(preRolledRaw) as { previewEvents?: import('@/types/game').RunPreviewEvent[]; startFloor?: number; floorsAttempted?: number } : null;
          return {
            id: activeRunRow.id as string,
            dungeonId: activeRunRow.dungeon_id as string,
            dungeonName: DUNGEONS.find((d) => d.id === activeRunRow.dungeon_id)?.name ?? '',
            difficulty: activeRunRow.difficulty as import('@/types/game').Difficulty,
            startTime: activeRunRow.start_time as number,
            endTime: activeRunRow.end_time as number,
            previewEvents: preRolledData?.previewEvents ?? [],
            startFloor: preRolledData?.startFloor,
            floorsAttempted: preRolledData?.floorsAttempted,
          };
        })()
      : null;

    // Pending result (completed but not yet seen)
    const completedRun = getCompletedUnresolvedRun(char.id);
    const pendingResult = completedRun ? null : getLastRunResult(char.id);

    // Unlock check
    const unlockedDungeons = DUNGEONS.filter((d) => {
      const c = d.unlockCondition;
      if (!c || Object.keys(c).length === 0) return true;
      if (c.minTier1Clears && tier1Clears < c.minTier1Clears) return false;
      if (c.minLevel && char.level < c.minLevel) return false;
      if (c.minGearScore && gearScore < c.minGearScore) return false;
      return true;
    }).map((d) => d.id);

    const campUpgrades = getCampUpgradesWithState(builtUpgrades);

    // Build resource stacks with names + icons
    const rawMaterials = getMaterials(char.id);
    const resources: ResourceStack[] = rawMaterials.map((m) => {
      const def = RESOURCES.find((r) => r.id === m.resource_id);
      return { resourceId: m.resource_id, name: def?.name ?? m.resource_id, icon: def?.icon ?? '?', quantity: m.quantity };
    });

    const state: GameState = {
      character: char,
      equipment,
      inventory,
      activeRun,
      pendingResult: null,
      campUpgrades,
      unlockedDungeons,
      tier1Clears,
      resources,
      walletAddress: wallet,
      savedFloors,
    };

    return NextResponse.json({ ok: true, state, hasCompletedRun: !!completedRun });
  } catch (err) {
    console.error('GET /api/game error:', err);
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}
