import { NextRequest, NextResponse } from 'next/server';
import { getSessionWallet } from '@/lib/auth';
import { getOrCreateCharacter, addResources, addItemToInventory, recordStorePurchase } from '@/lib/db';
import { STORE_ITEMS } from '@/lib/data/store';
import { RARITY_ORDER } from '@/types/game';
import type { Rarity, EquipmentSlot } from '@/types/game';
import { rollFreeItem } from '@/lib/engine/loot-roller';

const SLOTS: EquipmentSlot[] = ['weapon', 'helmet', 'chest', 'boots', 'ring', 'trinket'];

function rollCaseItem(rarityWeights: Record<string, number>) {
  const entries = RARITY_ORDER.map(r => ({ rarity: r, weight: rarityWeights[r] ?? 0 })).filter(e => e.weight > 0);
  const total = entries.reduce((s, e) => s + e.weight, 0);
  let roll = Math.random() * total;
  let rarity: Rarity = entries[entries.length - 1].rarity as Rarity;
  for (const e of entries) {
    roll -= e.weight;
    if (roll <= 0) { rarity = e.rarity as Rarity; break; }
  }
  const slot = SLOTS[Math.floor(Math.random() * SLOTS.length)];
  return rollFreeItem(slot, rarity);
}

export async function POST(req: NextRequest) {
  try {
    const { storeItemId, txHash } = await req.json() as { storeItemId?: string; txHash?: string };
    if (!storeItemId || !txHash) {
      return NextResponse.json({ ok: false, error: 'Missing storeItemId or txHash' }, { status: 400 });
    }

    const storeItem = STORE_ITEMS.find(i => i.id === storeItemId);
    if (!storeItem) return NextResponse.json({ ok: false, error: 'Unknown store item' }, { status: 400 });

    const wallet = getSessionWallet(req);
    if (!wallet) return NextResponse.json({ ok: false, error: 'Not authenticated' }, { status: 401 });

    const char = getOrCreateCharacter(wallet);

    let rewardSummary: Record<string, unknown> = {};
    let rolledItem = null;

    if (storeItem.reward.type === 'gold') {
      addResources(char.id, storeItem.reward.amount, 0);
      rewardSummary = { type: 'gold', amount: storeItem.reward.amount };
    } else if (storeItem.reward.type === 'essence') {
      addResources(char.id, 0, storeItem.reward.amount);
      rewardSummary = { type: 'essence', amount: storeItem.reward.amount };
    } else if (storeItem.reward.type === 'loot_case') {
      const item = rollCaseItem(storeItem.reward.rarityWeights);
      if (!item) return NextResponse.json({ ok: false, error: 'Failed to roll item' }, { status: 500 });
      addItemToInventory(char.id, item);
      rolledItem = item;
      rewardSummary = { type: 'loot_case', item };
    }

    const recorded = recordStorePurchase(char.id, storeItemId, txHash, storeItem.priceWei, JSON.stringify(rewardSummary));
    if (!recorded.ok) {
      return NextResponse.json({ ok: false, error: recorded.error }, { status: 400 });
    }

    return NextResponse.json({ ok: true, reward: rewardSummary, item: rolledItem });
  } catch (err) {
    console.error('store/purchase error:', err);
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}
