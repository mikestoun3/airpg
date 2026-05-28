import { NextRequest, NextResponse } from 'next/server';
import { getSessionWallet } from '@/lib/auth';
import {
  getOrCreateCharacter,
  getCompletedUnresolvedRun,
  resolveRunInDb,
  addResources,
  addXpAndLevel,
  addItemToInventory,
  updateCharacterStatus,
  getPity,
  updatePity,
  recordClear,
  getEffectiveStats,
  addMaterials,
  saveFloorCheckpoint,
  incrementEquippedAttunement,
  getFloorProgress,
  addSeasonPoints,
} from '@/lib/db';
import type { FloorRunData } from '@/lib/engine/loot-roller';
import { getDungeon } from '@/lib/data/dungeons';
import { resolveFloorRun } from '@/lib/engine/run-engine';

export async function POST(req: NextRequest) {
  try {
    const wallet = getSessionWallet(req);
    const char = getOrCreateCharacter(wallet ?? undefined);
    const runRow = getCompletedUnresolvedRun(char.id);

    if (!runRow) {
      return NextResponse.json({ ok: false, error: 'No completed run to resolve.' }, { status: 400 });
    }

    const effective = getEffectiveStats(char.id);
    const charWithGear = { ...char, ...effective };

    const dungeonId = runRow.dungeon_id as string;
    const runId = runRow.id as string;

    const floorData: FloorRunData | undefined = runRow.pre_rolled_json
      ? JSON.parse(runRow.pre_rolled_json as string)
      : undefined;

    if (!floorData || !floorData.floors) {
      return NextResponse.json({ ok: false, error: 'No pre-rolled floor data found for this run.' }, { status: 400 });
    }

    const savedFloors = getFloorProgress(char.id);
    const savedFloor = savedFloors[dungeonId] ?? 0;
    const result = resolveFloorRun(floorData, charWithGear, runId, dungeonId, savedFloor);

    // Save floor checkpoint: find the highest completed floor that's a multiple of 10
    const completedFloors = (result.floorResults ?? []).filter(f => f.outcome !== 'failure');
    const checkpointFloors = completedFloors.filter(f => f.floor % 10 === 0);
    if (checkpointFloors.length > 0) {
      const highestCheckpoint = Math.max(...checkpointFloors.map(f => f.floor));
      saveFloorCheckpoint(char.id, dungeonId, highestCheckpoint);
    }

    // Persist result
    resolveRunInDb(runId, result.outcome, JSON.stringify(result));

    // Add loot to inventory
    for (const item of result.loot) {
      addItemToInventory(char.id, item);
    }

    // Add gold + essence
    if (result.goldGained > 0 || result.essenceGained > 0) {
      addResources(char.id, result.goldGained, result.essenceGained);
    }

    // Add gathered materials
    if (result.resourcesGained.length > 0) {
      addMaterials(char.id, result.resourcesGained);
    }

    // Award season points: floor_number * dungeon_tier * 2 per completed floor (partial = half)
    const dungeon = getDungeon(result.dungeonId);
    let seasonPointsEarned = 0;
    if (dungeon && result.floorResults) {
      for (const floor of result.floorResults) {
        if (floor.outcome !== 'failure') {
          const base = floor.floor * dungeon.tier * 2;
          seasonPointsEarned += floor.outcome === 'partial' ? Math.floor(base * 0.5) : base;
        }
      }
      addSeasonPoints(char.id, seasonPointsEarned);
    }
    result.seasonPoints = seasonPointsEarned;

    // Add XP
    const levelResult = addXpAndLevel(char.id, result.xpGained);

    // Update character status
    if (result.injured && result.injuryDurationMinutes) {
      const injuredUntil = Math.floor(Date.now() / 1000) + result.injuryDurationMinutes * 60;
      updateCharacterStatus(char.id, 'injured', injuredUntil);
    } else {
      updateCharacterStatus(char.id, 'idle');
    }

    // Update pity counters (loot quality pity only, not combat pity)
    const pity = getPity(char.id);
    if (pity) {
      updatePity(char.id, result.outcome, result.loot);
    }

    // Increment attunement on all currently equipped items
    incrementEquippedAttunement(char.id);

    // Record tier clear
    if (dungeon && (result.outcome === 'success' || result.outcome === 'critical_success')) {
      recordClear(char.id, result.dungeonId, dungeon.tier);
    }

    return NextResponse.json({
      ok: true,
      result,
      leveled: levelResult.leveled,
      newLevel: levelResult.newLevel,
    });
  } catch (err) {
    console.error('POST /api/run/resolve error:', err);
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}
