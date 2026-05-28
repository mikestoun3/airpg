import { NextRequest, NextResponse } from 'next/server';
import { getSessionWallet } from '@/lib/auth';
import { getDb } from '@/lib/db';
import {
  getOrCreateCharacter,
  getBuiltUpgrades,
  buildUpgrade,
} from '@/lib/db';
import { CAMP_UPGRADES } from '@/lib/data/camp';

export async function POST(req: NextRequest) {
  try {
    const wallet = getSessionWallet(req);
    if (!wallet) return NextResponse.json({ ok: false, error: 'Not authenticated' }, { status: 401 });

    const { upgradeId } = await req.json() as { upgradeId: string };

    const upgrade = CAMP_UPGRADES.find((u) => u.id === upgradeId);
    if (!upgrade) return NextResponse.json({ ok: false, error: 'Unknown upgrade.' }, { status: 400 });

    const char = getOrCreateCharacter(wallet);
    if (char.banned) return NextResponse.json({ ok: false, error: 'Account suspended' }, { status: 403 });

    const built = getBuiltUpgrades(char.id);
    if (built.includes(upgradeId)) return NextResponse.json({ ok: false, error: 'Already built.' }, { status: 400 });
    if (upgrade.requires && !built.includes(upgrade.requires)) {
      return NextResponse.json({ ok: false, error: 'Prerequisites not met.' }, { status: 400 });
    }

    // Atomic: deduct gold + essence + mark built in one transaction
    const db = getDb();
    const ok = db.transaction(() => {
      if (upgrade.goldCost > 0) {
        const r = db.prepare('UPDATE characters SET gold = gold - ? WHERE id = ? AND gold >= ?')
          .run(upgrade.goldCost, char.id, upgrade.goldCost);
        if (r.changes === 0) return false;
      }
      if (upgrade.essenceCost > 0) {
        const r = db.prepare('UPDATE characters SET essence = essence - ? WHERE id = ? AND essence >= ?')
          .run(upgrade.essenceCost, char.id, upgrade.essenceCost);
        if (r.changes === 0) return false;
      }
      buildUpgrade(char.id, upgradeId);
      return true;
    })();

    if (!ok) return NextResponse.json({ ok: false, error: 'Not enough gold or essence.' }, { status: 400 });

    return NextResponse.json({ ok: true, builtId: upgradeId });
  } catch (err) {
    console.error('POST /api/camp/build error:', err);
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}
