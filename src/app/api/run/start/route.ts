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
} from '@/lib/db';
import { computeCombatStats } from '@/lib/engine/combat-engine';
import { getDungeon, DUNGEONS } from '@/lib/data/dungeons';
import { getLootTable } from '@/lib/data/loot-tables';
import { preRollFloors } from '@/lib/engine/loot-roller';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as {
      dungeonId: string;
      floorsToAttempt?: number;
    };
    const { dungeonId } = body;
    const floorsToAttempt = Math.min(10, Math.max(1, body.floorsToAttempt ?? 3));

    const wallet = getSessionWallet(req);
    if (!wallet) return NextResponse.json({ ok: false, error: 'Not authenticated' }, { status: 401 });
    const char = getOrCreateCharacter(wallet);
    if (char.banned) return NextResponse.json({ ok: false, error: 'Account suspended' }, { status: 403 });

    if (char.status !== 'idle') {
      return NextResponse.json({ ok: false, error: 'Character is not available.' }, { status: 400 });
    }

    const dungeon = getDungeon(dungeonId);
    if (!dungeon) {
      return NextResponse.json({ ok: false, error: 'Unknown dungeon.' }, { status: 400 });
    }

    // Check unlock conditions
    const gearScore = getGearScore(char.id);
    const tier1Clears = getTier1Clears(char.id);
    const c = dungeon.unlockCondition;
    if (c.minTier1Clears && tier1Clears < c.minTier1Clears)
      return NextResponse.json({ ok: false, error: 'Complete more tier 1 dungeons first.' }, { status: 400 });
    if (c.minLevel && char.level < c.minLevel)
      return NextResponse.json({ ok: false, error: `Requires level ${c.minLevel}.` }, { status: 400 });
    if (c.minGearScore && gearScore < c.minGearScore)
      return NextResponse.json({ ok: false, error: `Requires Gear Score ${c.minGearScore}.` }, { status: 400 });

    const existing = getActiveRun(char.id);
    if (existing) {
      return NextResponse.json({ ok: false, error: 'Already on a run.' }, { status: 400 });
    }

    // Use effective stats (base + gear) for combat and SPD
    const effective = getEffectiveStats(char.id);
    const charWithGear = { ...char, ...effective };
    const skillBonus = getCharacterSkillBonus(char.id);
    const combatStats = computeCombatStats(charWithGear, charWithGear.charClass, skillBonus);

    const built = getBuiltUpgrades(char.id);
    const shrineBonus = built.includes('the_shrine') ? 0.9 : 1;

    // Floor-based duration: 2 min per floor, then apply SPD reduction and shrine bonus
    const spdReduction = Math.min(charWithGear.spd * 0.02, 0.4);
    const rawDuration = floorsToAttempt * 2;
    const duration = Math.max(1, Math.round(rawDuration * (1 - spdReduction) * shrineBonus));

    // Get saved floor progress to determine startFloor
    const savedFloors = getFloorProgress(char.id);
    const savedFloor = savedFloors[dungeonId] ?? 0;
    const startFloor = savedFloor + 1;

    // Pre-roll floors
    const table = getLootTable(dungeonId);
    if (!table) {
      return NextResponse.json({ ok: false, error: 'No loot table for dungeon.' }, { status: 400 });
    }

    const floorRunData = preRollFloors(
      dungeon,
      startFloor,
      floorsToAttempt,
      combatStats,
      charWithGear.lck,
      table
    );

    const run = createRun(char.id, dungeonId, 'normal', duration, JSON.stringify(floorRunData));
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
      },
    });
  } catch (err) {
    console.error('POST /api/run/start error:', err);
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}
