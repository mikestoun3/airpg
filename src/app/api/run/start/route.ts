import { NextRequest, NextResponse } from 'next/server';
import { getSessionWallet } from '@/lib/auth';
import {
  getOrCreateCharacter,
  getActiveRun,
  createRun,
  getGearScore,
  getTier1Clears,
  getBuiltUpgrades,
  getEffectiveStats,
  getFloorProgress,
  getCharacterSkillBonus,
  validatePartyForWallet,
  getCharacterById,
  saveAutoRunConfig,
} from '@/lib/db';
import { computeCombatStats, computePartyCombatStats } from '@/lib/engine/combat-engine';
import { getDungeon, DUNGEONS } from '@/lib/data/dungeons';
import { getLootTable } from '@/lib/data/loot-tables';
import { preRollFloors } from '@/lib/engine/loot-roller';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as {
      dungeonId: string;
      floorsToAttempt?: number;
      partyIds?: string[];
    };
    const { dungeonId } = body;
    const floorsToAttempt = Math.min(10, Math.max(1, body.floorsToAttempt ?? 3));

    const wallet = getSessionWallet(req);
    if (!wallet) return NextResponse.json({ ok: false, error: 'Not authenticated' }, { status: 401 });
    const char = getOrCreateCharacter(wallet);
    if (char.banned) return NextResponse.json({ ok: false, error: 'Account suspended' }, { status: 403 });

    // Party: default to active char only
    const rawPartyIds = body.partyIds && body.partyIds.length > 0 ? body.partyIds : [char.id];
    const partyIds = [...new Set(rawPartyIds)].slice(0, 3);

    // Validate all party members belong to this wallet and are idle
    const partyCheck = validatePartyForWallet(wallet, partyIds);
    if (!partyCheck.ok) return NextResponse.json({ ok: false, error: partyCheck.error }, { status: 400 });

    // Check for active run on any party member
    for (const pid of partyIds) {
      if (getActiveRun(pid)) {
        return NextResponse.json({ ok: false, error: 'A party member is already on a run.' }, { status: 400 });
      }
    }

    const dungeon = getDungeon(dungeonId);
    if (!dungeon) return NextResponse.json({ ok: false, error: 'Unknown dungeon.' }, { status: 400 });

    // Use lead char for unlock checks + floor progress
    const gearScore = getGearScore(char.id);
    const tier1Clears = getTier1Clears(char.id);
    const c = dungeon.unlockCondition;
    if (c.minTier1Clears && tier1Clears < c.minTier1Clears)
      return NextResponse.json({ ok: false, error: 'Complete more tier 1 dungeons first.' }, { status: 400 });
    if (c.minLevel && char.level < c.minLevel)
      return NextResponse.json({ ok: false, error: `Requires level ${c.minLevel}.` }, { status: 400 });
    if (c.minGearScore && gearScore < c.minGearScore)
      return NextResponse.json({ ok: false, error: `Requires Gear Score ${c.minGearScore}.` }, { status: 400 });

    // Compute combined combat stats for all party members
    const memberStats = partyIds.map(pid => {
      const pChar = pid === char.id ? char : (getCharacterById(pid) ?? char);
      const effective = getEffectiveStats(pid);
      const charWithGear = { ...pChar, ...effective };
      const skillBonus = getCharacterSkillBonus(pid);
      return computeCombatStats(charWithGear, charWithGear.charClass, skillBonus);
    });
    const combatStats = computePartyCombatStats(memberStats);

    // Duration based on lead char's SPD
    const built = getBuiltUpgrades(char.id);
    const shrineBonus = built.includes('the_shrine') ? 0.9 : 1;
    const effective = getEffectiveStats(char.id);
    const spdReduction = Math.min((effective.spd) * 0.02, 0.4);
    const duration = Math.max(1, Math.round(floorsToAttempt * 2 * (1 - spdReduction) * shrineBonus));

    const savedFloors = getFloorProgress(char.id);
    const savedFloor = savedFloors[dungeonId] ?? 0;
    const startFloor = savedFloor + 1;

    const table = getLootTable(dungeonId);
    if (!table) return NextResponse.json({ ok: false, error: 'No loot table for dungeon.' }, { status: 400 });

    const floorRunData = preRollFloors(dungeon, startFloor, floorsToAttempt, combatStats, effective.lck, table);

    saveAutoRunConfig(wallet, { dungeonId, floors: floorsToAttempt, partyIds });
    const run = createRun(char.id, dungeonId, 'normal', duration, JSON.stringify(floorRunData), partyIds);
    const dungeonMeta = DUNGEONS.find((d) => d.id === dungeonId)!;

    return NextResponse.json({
      ok: true,
      run: {
        id: run.id,
        dungeonId,
        dungeonName: dungeonMeta.name,
        difficulty: 'normal',
        startTime: run.startTime,
        endTime: run.endTime,
        previewEvents: floorRunData.previewEvents,
        startFloor,
        floorsAttempted: floorsToAttempt,
        partyIds,
      },
    });
  } catch (err) {
    console.error('POST /api/run/start error:', err);
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}
