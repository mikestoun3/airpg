import { NextRequest, NextResponse } from 'next/server';
import { ethers } from 'ethers';
import { getSessionWallet } from '@/lib/auth';
import { getOrCreateCharacter, getListingById, completeSale } from '@/lib/db';

const POLYGON_RPC = process.env.POLYGON_RPC_URL ?? process.env.ETH_RPC_URL ?? 'https://polygon-bor-rpc.publicnode.com';
const POLYGON_CHAIN_ID = 137;

// All market payments route through this wallet; 5% stays, 95% owed to seller
export const TREASURY_WALLET = (process.env.TREASURY_WALLET ?? '0x4eEb11f1E1f543d9fAf056Bd9eA728668fFd7579').toLowerCase();

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

    // Verify on-chain transaction on Polygon
    const provider = new ethers.JsonRpcProvider(POLYGON_RPC, POLYGON_CHAIN_ID);

    const [receipt, tx] = await Promise.all([
      provider.getTransactionReceipt(txHash),
      provider.getTransaction(txHash),
    ]);

    if (!receipt || receipt.status !== 1) {
      return NextResponse.json({ ok: false, error: 'Transaction not confirmed or failed on Polygon' }, { status: 400 });
    }
    if (!tx) {
      return NextResponse.json({ ok: false, error: 'Transaction not found on Polygon' }, { status: 400 });
    }

    // Verify sender matches the authenticated buyer
    if (tx.from.toLowerCase() !== wallet.toLowerCase()) {
      return NextResponse.json({ ok: false, error: 'Transaction sender does not match your wallet' }, { status: 400 });
    }

    // Verify payment went to the treasury wallet (not directly to seller)
    if (tx.to?.toLowerCase() !== TREASURY_WALLET) {
      return NextResponse.json({ ok: false, error: 'Payment must be sent to the marketplace treasury wallet' }, { status: 400 });
    }

    // Verify full price was paid
    if (tx.value < BigInt(listing.priceWei)) {
      return NextResponse.json({ ok: false, error: 'Transaction value too low' }, { status: 400 });
    }

    // completeSale is atomic: checks tx_hash uniqueness and race conditions inside a transaction
    const ok = completeSale(listingId, buyer.id, wallet, txHash);
    if (!ok) {
      return NextResponse.json({ ok: false, error: 'Sale could not be completed (already sold or tx hash reused)' }, { status: 409 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('market/buy error:', err);
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}
