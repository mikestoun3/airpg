import { NextRequest, NextResponse } from 'next/server';
import {
  getOrCreateCharacter,
  equipItem,
  salvageItem,
  getInventory,
  getEquipment,
  unequipItem,
  getGearScore,
  spendStatPoint,
} from '@/lib/db';
import type { EquipmentSlot, ItemInstance, StatKey } from '@/types/game';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as {
      action: 'equip' | 'salvage' | 'unequip' | 'spend_stat';
      itemId?: string;
      slot?: EquipmentSlot;
      stat?: StatKey;
    };

    const char = getOrCreateCharacter();

    if (body.action === 'equip' && body.itemId) {
      const inventory = getInventory(char.id);
      const item = inventory.find((i) => i.id === body.itemId);
      if (!item) return NextResponse.json({ ok: false, error: 'Item not found in inventory.' }, { status: 404 });

      const displaced = equipItem(char.id, item);
      const newEquipment = getEquipment(char.id);
      const newGearScore = getGearScore(char.id);

      return NextResponse.json({ ok: true, equipment: newEquipment, gearScore: newGearScore, displaced });
    }

    if (body.action === 'unequip' && body.slot) {
      unequipItem(char.id, body.slot);
      const newEquipment = getEquipment(char.id);
      const newGearScore = getGearScore(char.id);
      return NextResponse.json({ ok: true, equipment: newEquipment, gearScore: newGearScore });
    }

    if (body.action === 'salvage' && body.itemId) {
      const { gold, essence } = salvageItem(char.id, body.itemId);
      return NextResponse.json({ ok: true, goldGained: gold, essenceGained: essence });
    }

    if (body.action === 'spend_stat' && body.stat) {
      const success = spendStatPoint(char.id, body.stat);
      if (!success) return NextResponse.json({ ok: false, error: 'No stat points available.' }, { status: 400 });
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ ok: false, error: 'Unknown action.' }, { status: 400 });
  } catch (err) {
    console.error('POST /api/inventory error:', err);
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}
