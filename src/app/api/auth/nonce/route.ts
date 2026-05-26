import { NextRequest, NextResponse } from 'next/server';
import { saveNonce } from '@/lib/db';

export async function POST(req: NextRequest) {
  try {
    const { address } = await req.json() as { address?: string };
    if (!address || !/^0x[0-9a-fA-F]{40}$/.test(address)) {
      return NextResponse.json({ ok: false, error: 'Invalid address' }, { status: 400 });
    }
    const addr = address.toLowerCase();
    const nonce = Math.random().toString(36).slice(2) + Date.now().toString(36);
    saveNonce(addr, nonce);
    return NextResponse.json({ ok: true, nonce, message: `Sign in to AirPG\nNonce: ${nonce}` });
  } catch (err) {
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}
