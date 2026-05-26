import { NextResponse } from 'next/server';
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
} from '@/lib/db';
import type { PreRolledData } from '@/lib/engine/loot-roller';
import { getDungeon } from '@/lib/data/dungeons';
import { resolveRun } from '@/lib/engine/run-engine';
import type { ActiveRun, Difficulty } from '@/types/game';

export async function POST() {
  try {
    const char = getOrCreateCharacter();
    const runRow = getCompletedUnresolvedRun(char.id);

    if (!runRow) {
      return NextResponse.json({ ok: false, error: 'No completed run to resolve.' }, { status: 400 });
    }

    const pity = getPity(char.id) ?? {
      total_runs: 0,
      since_last_uncommon: 0,
      since_last_rare: 0,
      since_last_epic: 0,
      consecutive_no_success: 0,
    };

    const activeRun: ActiveRun = {
      id: runRow.id as string,
      dungeonId: runRow.dungeon_id as string,
      dungeonName: '',
      difficulty: runRow.difficulty as Difficulty,
      startTime: runRow.start_time as number,
      endTime: runRow.end_time as number,
    };

    const effective = getEffectiveStats(char.id);
    const charWithGear = { ...char, ...effective };

    const preRolled: PreRolledData | undefined = runRow.pre_rolled_json
      ? JSON.parse(runRow.pre_rolled_json as string)
      : undefined;

    const result = resolveRun(activeRun, charWithGear, {
      totalRuns: pity.total_runs,
      sinceLastUncommon: pity.since_last_uncommon,
      sinceLastRare: pity.since_last_rare,
      sinceLastEpic: pity.since_last_epic,
      consecutiveNoSuccess: pity.consecutive_no_success,
    }, preRolled);

    // Persist result
    resolveRunInDb(runRow.id as string, result.outcome, JSON.stringify(result));

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

    // Add XP
    const levelResult = addXpAndLevel(char.id, result.xpGained);

    // Update character status
    if (result.injured && result.injuryDurationMinutes) {
      const injuredUntil = Math.floor(Date.now() / 1000) + result.injuryDurationMinutes * 60;
      updateCharacterStatus(char.id, 'injured', injuredUntil);
      result.injuryDurationMinutes = result.injuryDurationMinutes;
    } else {
      updateCharacterStatus(char.id, 'idle');
    }

    // Update pity counters
    updatePity(char.id, result.outcome, result.loot);

    // Record tier clear
    const dungeon = getDungeon(result.dungeonId);
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
