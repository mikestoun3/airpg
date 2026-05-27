import { NextRequest, NextResponse } from 'next/server';
import { getSessionWallet } from '@/lib/auth';
import { getOrCreateCharacter, upgradeItemInInventory } from '@/lib/db';

export async function POST(req: NextRequest) {
  try {
    const { itemId } = await req.json() as { itemId: string };
    const wallet = getSessionWallet(req);
    const char = getOrCreateCharacter(wallet ?? undefined);
    const result = upgradeItemInInventory(char.id, itemId);
    if (!result.ok) return NextResponse.json({ ok: false, error: result.error }, { status: 400 });
    return NextResponse.json({ ok: true, item: result.item, goldSpent: result.goldSpent });
  } catch (err) {
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}
