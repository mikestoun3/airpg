import { NextRequest, NextResponse } from 'next/server';
import { getSessionWallet } from '@/lib/auth';
import { getOrCreateCharacter, getActiveListings, listItem, getSellerListings } from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    const wallet = getSessionWallet(req);
    const myCharId = wallet ? getOrCreateCharacter(wallet).id : null;
    const listings = getActiveListings().map(({ sellerWallet: _sw, buyerWallet: _bw, ...rest }) => rest);
    return NextResponse.json({ ok: true, listings, myCharId });
  } catch (err) {
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const wallet = getSessionWallet(req);
    if (!wallet) return NextResponse.json({ ok: false, error: 'Not authenticated' }, { status: 401 });

    const { itemId, priceWei } = await req.json() as { itemId: string; priceWei: string };
    if (!itemId || !priceWei) {
      return NextResponse.json({ ok: false, error: 'Missing itemId or priceWei' }, { status: 400 });
    }

    const char = getOrCreateCharacter(wallet);
    const listing = listItem(char.id, wallet, itemId, priceWei);
    if (!listing) {
      return NextResponse.json({ ok: false, error: 'Item not found in inventory' }, { status: 404 });
    }

    return NextResponse.json({ ok: true, listing });
  } catch (err) {
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}
