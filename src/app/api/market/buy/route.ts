import { NextRequest, NextResponse } from 'next/server';
import { ethers } from 'ethers';
import { getSessionWallet } from '@/lib/auth';
import { getOrCreateCharacter, getListingById, completeSale } from '@/lib/db';
import { AIRPG_MARKET_ABI } from '@/lib/market-contract';

const POLYGON_RPC      = process.env.POLYGON_RPC_URL ?? 'https://polygon-bor-rpc.publicnode.com';
const POLYGON_CHAIN_ID = 137;
const CONTRACT_ADDRESS = (process.env.CONTRACT_ADDRESS ?? '').toLowerCase();

export async function POST(req: NextRequest) {
  try {
    const wallet = getSessionWallet(req);
    if (!wallet) return NextResponse.json({ ok: false, error: 'Not authenticated' }, { status: 401 });

    if (!CONTRACT_ADDRESS) {
      return NextResponse.json({ ok: false, error: 'Marketplace contract not configured on server' }, { status: 503 });
    }

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

    // Fetch receipt and verify on-chain
    const provider = new ethers.JsonRpcProvider(POLYGON_RPC, POLYGON_CHAIN_ID);
    const receipt = await provider.getTransactionReceipt(txHash);

    if (!receipt || receipt.status !== 1) {
      return NextResponse.json({ ok: false, error: 'Transaction not confirmed or failed on Polygon' }, { status: 400 });
    }

    // Verify the tx called our contract (not some other address)
    if (receipt.to?.toLowerCase() !== CONTRACT_ADDRESS) {
      return NextResponse.json({ ok: false, error: 'Transaction did not call the marketplace contract' }, { status: 400 });
    }

    // Parse the Purchase event from logs
    const contractInterface = new ethers.Interface(AIRPG_MARKET_ABI);
    let purchaseEvent: ethers.LogDescription | null = null;

    for (const log of receipt.logs) {
      try {
        const parsed = contractInterface.parseLog({ topics: [...log.topics], data: log.data });
        if (parsed?.name === 'Purchase') { purchaseEvent = parsed; break; }
      } catch { /* not this event */ }
    }

    if (!purchaseEvent) {
      return NextResponse.json({ ok: false, error: 'No Purchase event found in transaction' }, { status: 400 });
    }

    const [evListingId, evBuyer, evSeller, evTotal] = purchaseEvent.args as unknown as [string, string, string, bigint];

    if (evListingId !== listingId) {
      return NextResponse.json({ ok: false, error: 'Purchase event listing ID mismatch' }, { status: 400 });
    }
    if (evBuyer.toLowerCase() !== wallet.toLowerCase()) {
      return NextResponse.json({ ok: false, error: 'Purchase event buyer does not match your wallet' }, { status: 400 });
    }
    if (evSeller.toLowerCase() !== listing.sellerWallet.toLowerCase()) {
      return NextResponse.json({ ok: false, error: 'Purchase event seller does not match listing' }, { status: 400 });
    }
    if (evTotal < BigInt(listing.priceWei)) {
      return NextResponse.json({ ok: false, error: 'Purchase amount too low' }, { status: 400 });
    }

    // Finalise in DB — payment already happened on-chain, no pending payout needed
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
