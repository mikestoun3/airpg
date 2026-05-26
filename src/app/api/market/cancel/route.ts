import { NextRequest, NextResponse } from 'next/server';
import { getSessionWallet } from '@/lib/auth';
import { getOrCreateCharacter, cancelListing } from '@/lib/db';

export async function POST(req: NextRequest) {
  try {
    const wallet = getSessionWallet(req);
    if (!wallet) return NextResponse.json({ ok: false, error: 'Not authenticated' }, { status: 401 });

    const { listingId } = await req.json() as { listingId: string };
    if (!listingId) return NextResponse.json({ ok: false, error: 'Missing listingId' }, { status: 400 });

    const char = getOrCreateCharacter(wallet);
    const ok = cancelListing(listingId, char.id);
    if (!ok) {
      return NextResponse.json({ ok: false, error: 'Listing not found or not yours' }, { status: 404 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}
