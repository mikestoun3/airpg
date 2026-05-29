import { NextRequest, NextResponse } from 'next/server';
import { getSessionWallet } from '@/lib/auth';
import { getOrCreateCharacter, getOrCreateReferralCode, applyReferral } from '@/lib/db';

export async function GET(req: NextRequest) {
  const wallet = getSessionWallet(req);
  if (!wallet) return NextResponse.json({ ok: false, error: 'Not authenticated' }, { status: 401 });
  const char = getOrCreateCharacter(wallet);
  const code = getOrCreateReferralCode(char.id);
  return NextResponse.json({ ok: true, code });
}

export async function POST(req: NextRequest) {
  try {
    const { code } = await req.json() as { code?: string };
    if (!code) return NextResponse.json({ ok: false, error: 'Missing referral code' }, { status: 400 });

    const wallet = getSessionWallet(req);
    if (!wallet) {
      console.log('[referral] POST rejected: not authenticated, code=', code);
      return NextResponse.json({ ok: false, error: 'Not authenticated' }, { status: 401 });
    }

    const char = getOrCreateCharacter(wallet);
    const result = applyReferral(code, char.id);
    console.log('[referral] POST code=%s charId=%s result=%o', code, char.id, result);
    return NextResponse.json(result, { status: result.ok ? 200 : 400 });
  } catch (err) {
    console.error('[referral] POST error:', err);
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}
