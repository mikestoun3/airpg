import { NextRequest, NextResponse } from 'next/server';
import { getSessionWallet } from '@/lib/auth';
import {
  getOrCreateCharacter,
  getCompletedUnresolvedRun,
  resolveRunInDb,
  addResources,
  addXpAndLevel,
  addItemToInventory,
  getPity,
  updatePity,
  recordClear,
  getEffectiveStats,
  addMaterials,
  saveFloorCheckpoint,
  incrementEquippedAttunement,
  getFloorProgress,
  addSeasonPoints,
  getRunPartyIds,
  setPartyStatus,
  getAutoRunConfig,
  validatePartyForWallet,
  getCharacterById,
  getCharacterSkillBonus,
  createRun,
} from '@/lib/db';
import type { FloorRunData } from '@/lib/engine/loot-roller';
import { getDungeon, DUNGEONS } from '@/lib/data/dungeons';
import { getLootTable } from '@/lib/data/loot-tables';
import { resolveFloorRun } from '@/lib/engine/run-engine';

export async function POST(req: NextRequest) {
  try {
    const wallet = getSessionWallet(req);
    if (!wallet) return NextResponse.json({ ok: false, error: 'Not authenticated' }, { status: 401 });
    const char = getOrCreateCharacter(wallet);
    if (char.banned) return NextResponse.json({ ok: false, error: 'Account suspended' }, { status: 403 });
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

    // Add XP to lead char; award partial XP to other party members
    const levelResult = addXpAndLevel(char.id, result.xpGained);
    const partyIds = getRunPartyIds(runId);
    const partyMembers = partyIds.filter(id => id !== char.id);
    for (const pid of partyMembers) {
      addXpAndLevel(pid, Math.round(result.xpGained * 0.7));
    }

    // Always return to idle — no injuries
    setPartyStatus(partyIds, 'idle');

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

    // Auto-restart: use saved config to immediately send party on next run
    let newRun: Record<string, unknown> | null = null;
    try {
      const autoConfig = getAutoRunConfig(wallet);
      if (autoConfig && autoConfig.dungeonId) {
        const nextDungeon = getDungeon(autoConfig.dungeonId);
        const nextTable = nextDungeon ? getLootTable(autoConfig.dungeonId) : null;
        const validParty = validatePartyForWallet(wallet, autoConfig.partyIds);

        if (nextDungeon && nextTable && validParty.ok && autoConfig.partyIds.length > 0) {
          const { preRollFloors } = require('@/lib/engine/loot-roller') as typeof import('@/lib/engine/loot-roller');
          const { computeCombatStats, computePartyCombatStats } = require('@/lib/engine/combat-engine') as typeof import('@/lib/engine/combat-engine');

          const memberStats = autoConfig.partyIds.map((pid: string) => {
            const pChar = pid === char.id ? char : (getCharacterById(pid) ?? char);
            const eff = getEffectiveStats(pid);
            const withGear = { ...pChar, ...eff };
            const sb = getCharacterSkillBonus(pid);
            return computeCombatStats(withGear, withGear.charClass, sb);
          });
          const combinedStats = computePartyCombatStats(memberStats);

          const nextSavedFloors = getFloorProgress(char.id);
          const nextSavedFloor = nextSavedFloors[autoConfig.dungeonId] ?? 0;
          const nextStartFloor = nextSavedFloor + 1;
          const nextEff = getEffectiveStats(char.id);
          const spdReduction = Math.min(nextEff.spd * 0.02, 0.4);
          const duration = Math.max(1, Math.round(autoConfig.floors * 2 * (1 - spdReduction)));

          const floorData = preRollFloors(nextDungeon, nextStartFloor, autoConfig.floors, combinedStats, nextEff.lck, nextTable);
          const nextRun = createRun(char.id, autoConfig.dungeonId, 'normal', duration, JSON.stringify(floorData), autoConfig.partyIds);
          const dungeonMeta = DUNGEONS.find(d => d.id === autoConfig.dungeonId);

          newRun = {
            id: nextRun.id,
            dungeonId: autoConfig.dungeonId,
            dungeonName: dungeonMeta?.name ?? '',
            difficulty: 'normal',
            startTime: nextRun.startTime,
            endTime: nextRun.endTime,
            previewEvents: floorData.previewEvents,
            startFloor: nextStartFloor,
            floorsAttempted: autoConfig.floors,
            partyIds: autoConfig.partyIds,
          };
        }
      }
    } catch (e) {
      console.error('Auto-restart failed:', e);
    }

    return NextResponse.json({
      ok: true,
      result,
      leveled: levelResult.leveled,
      newLevel: levelResult.newLevel,
      newRun,
    });
  } catch (err) {
    console.error('POST /api/run/resolve error:', err);
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}
