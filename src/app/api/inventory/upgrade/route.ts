import { NextRequest, NextResponse } from 'next/server';
import { getSessionWallet } from '@/lib/auth';
import { getOrCreateCharacter, upgradeItemInInventory } from '@/lib/db';

export async function POST(req: NextRequest) {
  try {
    const wallet = getSessionWallet(req);
    if (!wallet) return NextResponse.json({ ok: false, error: 'Not authenticated' }, { status: 401 });
    const { itemId } = await req.json() as { itemId: string };
    const char = getOrCreateCharacter(wallet);
    if (char.banned) return NextResponse.json({ ok: false, error: 'Account suspended' }, { status: 403 });
    const result = upgradeItemInInventory(char.id, itemId);
    if (!result.ok) return NextResponse.json({ ok: false, error: result.error }, { status: 400 });
    return NextResponse.json({ ok: true, item: result.item, goldSpent: result.goldSpent });
  } catch (err) {
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}
