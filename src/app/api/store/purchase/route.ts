import { NextRequest, NextResponse } from 'next/server';
import { ethers } from 'ethers';
import { getSessionWallet } from '@/lib/auth';
import { getOrCreateCharacter, addResources, addItemToInventory, recordStorePurchase } from '@/lib/db';
import { STORE_ITEMS } from '@/lib/data/store';
import { RARITY_ORDER } from '@/types/game';
import type { Rarity, EquipmentSlot } from '@/types/game';
import { rollFreeItem } from '@/lib/engine/loot-roller';

const POLYGON_RPC      = process.env.POLYGON_RPC_URL ?? 'https://polygon-bor-rpc.publicnode.com';
const POLYGON_CHAIN_ID = 137;
const STORE_ADDRESS    = (process.env.STORE_ADDRESS ?? '').toLowerCase();

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
    const wallet = getSessionWallet(req);
    if (!wallet) return NextResponse.json({ ok: false, error: 'Not authenticated' }, { status: 401 });

    if (!STORE_ADDRESS) {
      return NextResponse.json({ ok: false, error: 'Store not available yet' }, { status: 503 });
    }

    const { storeItemId, txHash } = await req.json() as { storeItemId?: string; txHash?: string };
    if (!storeItemId || !txHash) {
      return NextResponse.json({ ok: false, error: 'Missing storeItemId or txHash' }, { status: 400 });
    }

    const storeItem = STORE_ITEMS.find(i => i.id === storeItemId);
    if (!storeItem) return NextResponse.json({ ok: false, error: 'Unknown store item' }, { status: 400 });

    // Verify the transaction on-chain
    const provider = new ethers.JsonRpcProvider(POLYGON_RPC, POLYGON_CHAIN_ID);

    const [receipt, tx] = await Promise.all([
      provider.getTransactionReceipt(txHash),
      provider.getTransaction(txHash),
    ]);

    if (!receipt || receipt.status !== 1) {
      return NextResponse.json({ ok: false, error: 'Transaction not confirmed or failed on Polygon' }, { status: 400 });
    }
    if (!tx) {
      return NextResponse.json({ ok: false, error: 'Transaction not found' }, { status: 400 });
    }
    if (receipt.to?.toLowerCase() !== STORE_ADDRESS) {
      return NextResponse.json({ ok: false, error: 'Transaction did not go to the store address' }, { status: 400 });
    }
    if (tx.from.toLowerCase() !== wallet.toLowerCase()) {
      return NextResponse.json({ ok: false, error: 'Transaction sender does not match your wallet' }, { status: 400 });
    }
    if (tx.value < BigInt(storeItem.priceWei)) {
      return NextResponse.json({ ok: false, error: 'Transaction value is less than item price' }, { status: 400 });
    }

    const char = getOrCreateCharacter(wallet);
    if (char.banned) return NextResponse.json({ ok: false, error: 'Account suspended' }, { status: 403 });

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
