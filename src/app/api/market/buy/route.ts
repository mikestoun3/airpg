import { NextRequest, NextResponse } from 'next/server';
import { ethers } from 'ethers';
import { getSessionWallet } from '@/lib/auth';
import { getOrCreateCharacter, getListingById, completeSale } from '@/lib/db';

const POLYGON_RPC = process.env.POLYGON_RPC_URL ?? process.env.ETH_RPC_URL ?? 'https://polygon-bor-rpc.publicnode.com';
const POLYGON_CHAIN_ID = 137;

export async function POST(req: NextRequest) {
  try {
    const wallet = getSessionWallet(req);
    if (!wallet) return NextResponse.json({ ok: false, error: 'Not authenticated' }, { status: 401 });

    const { listingId, txHash } = await req.json() as { listingId: string; txHash: string };
    if (!listingId || !txHash) {
      return NextResponse.json({ ok: false, error: 'Missing listingId or txHash' }, { status: 400 });
    }

    const listing = getListingById(listingId);
    if (!listing || listing.status !== 'active') {
      return NextResponse.json({ ok: false, error: 'Listing not found or no longer active' }, { status: 404 });
    }

    const buyer = getOrCreateCharacter(wallet);
    if (buyer.id === listing.sellerId) {
      return NextResponse.json({ ok: false, error: 'Cannot buy your own listing' }, { status: 400 });
    }

    // Verify the on-chain transaction on Polygon
    const provider = new ethers.JsonRpcProvider(POLYGON_RPC, POLYGON_CHAIN_ID);
    const receipt = await provider.getTransactionReceipt(txHash);
    if (!receipt || receipt.status !== 1) {
      return NextResponse.json({ ok: false, error: 'Transaction not confirmed or failed on Polygon' }, { status: 400 });
    }
    const tx = await provider.getTransaction(txHash);
    if (!tx) {
      return NextResponse.json({ ok: false, error: 'Transaction not found on Polygon' }, { status: 400 });
    }
    if (tx.to?.toLowerCase() !== listing.sellerWallet.toLowerCase()) {
      return NextResponse.json({ ok: false, error: 'Transaction recipient mismatch' }, { status: 400 });
    }
    if (tx.value < BigInt(listing.priceWei)) {
      return NextResponse.json({ ok: false, error: 'Transaction value too low' }, { status: 400 });
    }

    const ok = completeSale(listingId, buyer.id, wallet, txHash);
    if (!ok) {
      return NextResponse.json({ ok: false, error: 'Sale could not be completed (already sold?)' }, { status: 409 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('market/buy error:', err);
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}
