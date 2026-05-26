import { NextRequest, NextResponse } from 'next/server';
import {
  getOrCreateCharacter,
  getActiveRun,
  createRun,
  getGearScore,
  getTier1Clears,
  getBuiltUpgrades,
  getEffectiveStats,
} from '@/lib/db';
import { getDungeon, DUNGEONS } from '@/lib/data/dungeons';
import { computeRunDuration } from '@/lib/engine/run-engine';
import { getLootTable } from '@/lib/data/loot-tables';
import { preRollRun } from '@/lib/engine/loot-roller';
import type { Difficulty } from '@/types/game';

export async function POST(req: NextRequest) {
  try {
    const { dungeonId, difficulty = 'normal' } = await req.json() as {
      dungeonId: string;
      difficulty: Difficulty;
    };

    const char = getOrCreateCharacter();

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

    // Use effective stats (base + gear) for duration — SPD from items counts
    const effective = getEffectiveStats(char.id);
    const charWithGear = { ...char, ...effective };

    const built = getBuiltUpgrades(char.id);
    const shrineBonus = built.includes('the_shrine') ? 0.9 : 1;

    const baseDuration = computeRunDuration(dungeon, charWithGear);
    const duration = Math.max(1, Math.round(baseDuration * shrineBonus));

    // Pre-roll loot + resources so they can be revealed in the journey log
    const table = getLootTable(dungeonId);
    const preRolled = table ? preRollRun(table, dungeonId, charWithGear.lck, difficulty) : null;

    const run = createRun(char.id, dungeonId, difficulty, duration, preRolled ? JSON.stringify(preRolled) : undefined);
    const dungeonMeta = DUNGEONS.find((d) => d.id === dungeonId)!;

    return NextResponse.json({
      ok: true,
      run: {
        id: run.id,
        dungeonId,
        dungeonName: dungeonMeta.name,
        difficulty,
        startTime: run.startTime,
        endTime: run.endTime,
        previewEvents: preRolled?.previewEvents ?? [],
      },
    });
  } catch (err) {
    console.error('POST /api/run/start error:', err);
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}
