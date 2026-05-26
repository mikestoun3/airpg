import { NextRequest, NextResponse } from 'next/server';
import {
  getOrCreateCharacter,
  getActiveRun,
  createRun,
  getGearScore,
  getTier1Clears,
  getBuiltUpgrades,
} from '@/lib/db';
import { getDungeon, DUNGEONS } from '@/lib/data/dungeons';
import { computeRunDuration } from '@/lib/engine/run-engine';
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

    // Check shrine bonus
    const built = getBuiltUpgrades(char.id);
    const shrineBonus = built.includes('the_shrine') ? 0.9 : 1;

    const baseDuration = computeRunDuration(dungeon, char);
    const duration = Math.max(1, Math.round(baseDuration * shrineBonus));

    const run = createRun(char.id, dungeonId, difficulty, duration);
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
      },
    });
  } catch (err) {
    console.error('POST /api/run/start error:', err);
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}
