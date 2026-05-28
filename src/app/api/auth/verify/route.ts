import { NextRequest, NextResponse } from 'next/server';
import { ethers } from 'ethers';
import { getNonce, getOrCreateCharacter, rotateNonce } from '@/lib/db';
import { makeSessionValue, COOKIE_NAME } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const { address, signature } = await req.json() as { address?: string; signature?: string };
    if (!address || !signature) {
      return NextResponse.json({ ok: false, error: 'Missing address or signature' }, { status: 400 });
    }
    const addr = address.toLowerCase();

    const nonce = getNonce(addr);
    if (!nonce) {
      return NextResponse.json({ ok: false, error: 'No nonce found — request one first' }, { status: 400 });
    }

    const message = `Sign in to AirPG\nNonce: ${nonce}`;
    const recovered = ethers.verifyMessage(message, signature).toLowerCase();
    if (recovered !== addr) {
      return NextResponse.json({ ok: false, error: 'Signature mismatch' }, { status: 401 });
    }

    // Invalidate the used nonce so it can't be replayed
    rotateNonce(addr);

    // Create or load character for this wallet
    const char = getOrCreateCharacter(addr);

    const sessionValue = makeSessionValue(addr);
    const res = NextResponse.json({ ok: true, walletAddress: addr, character: char });
    res.cookies.set(COOKIE_NAME, sessionValue, {
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 30, // 30 days
      secure: process.env.NODE_ENV === 'production',
    });
    return res;
  } catch (err) {
    console.error('auth/verify error:', err);
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}
