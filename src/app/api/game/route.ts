import { NextResponse } from 'next/server';
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
} from '@/lib/db';
import { DUNGEONS } from '@/lib/data/dungeons';
import { getCampUpgradesWithState } from '@/lib/data/camp';
import type { GameState } from '@/types/game';

export async function GET() {
  try {
    const char = getOrCreateCharacter();
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

    // Compute gear score
    const gearScore = getGearScore(char.id);
    char.gearScore = gearScore;
    char.combatRating = Math.floor(char.pwr * 1.5 + char.end);

    // Active run
    const activeRunRow = getActiveRun(char.id);
    const activeRun = activeRunRow
      ? {
          id: activeRunRow.id as string,
          dungeonId: activeRunRow.dungeon_id as string,
          dungeonName: DUNGEONS.find((d) => d.id === activeRunRow.dungeon_id)?.name ?? '',
          difficulty: activeRunRow.difficulty as import('@/types/game').Difficulty,
          startTime: activeRunRow.start_time as number,
          endTime: activeRunRow.end_time as number,
        }
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

    const state: GameState = {
      character: char,
      equipment,
      inventory,
      activeRun,
      pendingResult: null,
      campUpgrades,
      unlockedDungeons,
      tier1Clears,
    };

    return NextResponse.json({ ok: true, state, hasCompletedRun: !!completedRun });
  } catch (err) {
    console.error('GET /api/game error:', err);
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}
