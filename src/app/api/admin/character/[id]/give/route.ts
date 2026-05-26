import { NextRequest, NextResponse } from 'next/server';
import { isAdminAuthed } from '@/lib/admin-auth';
import { addResources, addItemToInventory } from '@/lib/db';
import { rollFreeItem } from '@/lib/engine/loot-roller';
import type { EquipmentSlot, Rarity } from '@/types/game';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!isAdminAuthed(req)) return NextResponse.json({ ok: false }, { status: 401 });
  const { id } = await params;
  const body = await req.json() as { type: 'gold' | 'item'; amount?: number; slot?: EquipmentSlot; rarity?: Rarity };

  if (body.type === 'gold') {
    const amount = Number(body.amount ?? 0);
    if (amount <= 0) return NextResponse.json({ ok: false, error: 'Invalid amount' }, { status: 400 });
    addResources(id, amount, 0);
    return NextResponse.json({ ok: true });
  }

  if (body.type === 'item') {
    const { slot, rarity } = body;
    if (!slot || !rarity) return NextResponse.json({ ok: false, error: 'Missing slot or rarity' }, { status: 400 });
    const item = rollFreeItem(slot, rarity);
    if (!item) return NextResponse.json({ ok: false, error: 'Could not roll item for that slot' }, { status: 400 });
    addItemToInventory(id, item);
    return NextResponse.json({ ok: true, item });
  }

  return NextResponse.json({ ok: false, error: 'Unknown type' }, { status: 400 });
}
