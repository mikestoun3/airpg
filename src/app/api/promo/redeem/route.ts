import { NextRequest, NextResponse } from 'next/server';
import { getSessionWallet } from '@/lib/auth';
import { getOrCreateCharacter, redeemPromoCode } from '@/lib/db';

export async function POST(req: NextRequest) {
  const wallet = getSessionWallet(req);
  if (!wallet) return NextResponse.json({ ok: false, error: 'Not authenticated' }, { status: 401 });

  const { code } = await req.json() as { code: string };
  if (!code?.trim()) return NextResponse.json({ ok: false, error: 'Missing code' }, { status: 400 });

  const char = getOrCreateCharacter(wallet);
  const result = redeemPromoCode(code, char.id);
  return NextResponse.json(result);
}
