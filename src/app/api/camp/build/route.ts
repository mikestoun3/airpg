import { NextRequest, NextResponse } from 'next/server';
import { getSessionWallet } from '@/lib/auth';
import {
  getOrCreateCharacter,
  getBuiltUpgrades,
  buildUpgrade,
  spendGold,
  spendEssence,
} from '@/lib/db';
import { CAMP_UPGRADES } from '@/lib/data/camp';

export async function POST(req: NextRequest) {
  try {
    const { upgradeId } = await req.json() as { upgradeId: string };

    const upgrade = CAMP_UPGRADES.find((u) => u.id === upgradeId);
    if (!upgrade) return NextResponse.json({ ok: false, error: 'Unknown upgrade.' }, { status: 400 });

    const wallet = getSessionWallet(req);
    const char = getOrCreateCharacter(wallet ?? undefined);
    const built = getBuiltUpgrades(char.id);

    if (built.includes(upgradeId)) {
      return NextResponse.json({ ok: false, error: 'Already built.' }, { status: 400 });
    }

    if (upgrade.requires && !built.includes(upgrade.requires)) {
      return NextResponse.json({ ok: false, error: 'Prerequisites not met.' }, { status: 400 });
    }

    if (!spendGold(char.id, upgrade.goldCost)) {
      return NextResponse.json({ ok: false, error: 'Not enough gold.' }, { status: 400 });
    }

    if (upgrade.essenceCost > 0 && !spendEssence(char.id, upgrade.essenceCost)) {
      // Refund gold
      const { addResources } = await import('@/lib/db');
      addResources(char.id, upgrade.goldCost, 0);
      return NextResponse.json({ ok: false, error: 'Not enough essence.' }, { status: 400 });
    }

    buildUpgrade(char.id, upgradeId);

    return NextResponse.json({ ok: true, builtId: upgradeId });
  } catch (err) {
    console.error('POST /api/camp/build error:', err);
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}
